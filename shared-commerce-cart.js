export const SHARED_CART_COMPONENT = "kreaton-shared-cart";

export function cartStorageKey({ businessId = "", siteId = "" } = {}) {
  const scope = [businessId, siteId].map((value) => String(value || "").trim()).filter(Boolean).join(":") || "preview";
  return `kreaton:cart:${scope}`;
}

export function normalizeCartItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && (item.id || item.name))
    .map((item) => ({
      id: String(item.id || item.name),
      name: String(item.name || "Item"),
      price: String(item.price || ""),
      image: String(item.image || ""),
      quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
    }));
}

export function addCartLine(items, nextItem) {
  const normalized = normalizeCartItems(items);
  const id = String(nextItem?.id || nextItem?.name || "").trim();
  if (!id) return normalized;
  const existing = normalized.find((item) => item.id === id);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + 1);
    return normalized;
  }
  return normalizeCartItems([...normalized, { ...nextItem, id, quantity: 1 }]);
}

export function cartItemCount(items) {
  return normalizeCartItems(items).reduce((total, item) => total + item.quantity, 0);
}

export function cartCheckoutSummary(items) {
  return normalizeCartItems(items).map((item) => `${item.quantity} x ${item.name}`).join(", ");
}

export function createSharedCommerceCart({
  businessId = "",
  siteId = "",
  storage = globalThis.localStorage,
  documentRef = globalThis.document,
  getLabels = () => ({}),
  onCheckout = () => {},
} = {}) {
  const key = cartStorageKey({ businessId, siteId });
  let items = readItems();
  let overlay = null;
  let previousOverflow = "";

  function readItems() {
    try {
      return normalizeCartItems(JSON.parse(storage?.getItem(key) || "[]"));
    } catch (_error) {
      return [];
    }
  }

  function persist() {
    storage?.setItem(key, JSON.stringify(items));
  }

  function labels() {
    return {
      cart: "Cart",
      cartEyebrow: "Your selection",
      emptyCart: "Your cart is empty.",
      emptyHint: "Add something you love and it will appear here.",
      items: "items",
      checkout: "Continue to checkout",
      continueShopping: "Continue shopping",
      remove: "Remove",
      decrease: "Decrease quantity",
      increase: "Increase quantity",
      close: "Close cart",
      addedToCart: "added to cart",
      ...getLabels(),
    };
  }

  function count() {
    return cartItemCount(items);
  }

  function syncCounters() {
    documentRef?.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = String(count());
      node.toggleAttribute("data-has-items", count() > 0);
    });
  }

  function addFromTrigger(button) {
    items = addCartLine(items, {
      id: button.dataset.itemId || button.dataset.itemName,
      name: button.dataset.itemName || "Item",
      price: button.dataset.itemPrice || "",
      image: button.dataset.itemImage || "",
    });
    persist();
    syncCounters();
    showToast(`${button.dataset.itemName || "Item"} ${labels().addedToCart}`);
  }

  function updateQuantity(id, delta) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    item.quantity = Math.max(0, Math.min(99, item.quantity + delta));
    items = items.filter((entry) => entry.quantity > 0);
    persist();
    syncCounters();
    open();
  }

  function remove(id) {
    items = items.filter((item) => item.id !== id);
    persist();
    syncCounters();
    open();
  }

  function itemMarkup(item, copy) {
    const initial = escapeMarkup(item.name.slice(0, 1).toUpperCase() || "K");
    const visual = item.image
      ? `<img src="${escapeMarkup(item.image)}" alt="">`
      : `<span aria-hidden="true">${initial}</span>`;
    return `<article class="kreaton-cart-line" data-cart-line="${escapeMarkup(item.id)}">
      <div class="kreaton-cart-line-visual">${visual}</div>
      <div class="kreaton-cart-line-copy"><strong>${escapeMarkup(item.name)}</strong>${item.price ? `<span>${escapeMarkup(item.price)}</span>` : ""}<button type="button" data-cart-remove="${escapeMarkup(item.id)}">${escapeMarkup(copy.remove)}</button></div>
      <div class="kreaton-cart-stepper" aria-label="${escapeMarkup(item.name)}">
        <button type="button" data-cart-quantity="-1" data-cart-item="${escapeMarkup(item.id)}" aria-label="${escapeMarkup(copy.decrease)}">−</button>
        <b>${item.quantity}</b>
        <button type="button" data-cart-quantity="1" data-cart-item="${escapeMarkup(item.id)}" aria-label="${escapeMarkup(copy.increase)}">+</button>
      </div>
    </article>`;
  }

  function open() {
    close();
    const copy = labels();
    const hasItems = items.length > 0;
    const body = hasItems
      ? `<div class="kreaton-cart-lines">${items.map((item) => itemMarkup(item, copy)).join("")}</div>`
      : `<div class="kreaton-cart-empty"><span aria-hidden="true">${bagIcon()}</span><strong>${escapeMarkup(copy.emptyCart)}</strong><p>${escapeMarkup(copy.emptyHint)}</p></div>`;
    const mount = documentRef.querySelector(".rendered-site") || documentRef.body;
    mount.insertAdjacentHTML("beforeend", `<div class="kreaton-cart-overlay" data-component="${SHARED_CART_COMPONENT}" role="presentation">
      <section class="kreaton-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="kreatonCartTitle">
        <header class="kreaton-cart-header"><div><span>${escapeMarkup(copy.cartEyebrow)}</span><h2 id="kreatonCartTitle">${escapeMarkup(copy.cart)}</h2></div><button class="kreaton-cart-close" data-cart-close type="button" aria-label="${escapeMarkup(copy.close)}">${closeIcon()}</button></header>
        <div class="kreaton-cart-body">${body}</div>
        <footer class="kreaton-cart-footer"><div><span>${escapeMarkup(copy.items)}</span><strong>${count()}</strong></div><button class="kreaton-cart-checkout" data-cart-checkout type="button" ${hasItems ? "" : "disabled"}>${escapeMarkup(copy.checkout)}${arrowIcon()}</button><button class="kreaton-cart-continue" data-cart-close type="button">${escapeMarkup(copy.continueShopping)}</button></footer>
      </section>
    </div>`);
    overlay = documentRef.querySelector(".kreaton-cart-overlay");
    previousOverflow = documentRef.body.style.overflow;
    documentRef.body.style.overflow = "hidden";
    overlay.querySelectorAll("[data-cart-close]").forEach((button) => button.addEventListener("click", close));
    overlay.querySelectorAll("[data-cart-quantity]").forEach((button) => button.addEventListener("click", () => updateQuantity(button.dataset.cartItem, Number(button.dataset.cartQuantity))));
    overlay.querySelectorAll("[data-cart-remove]").forEach((button) => button.addEventListener("click", () => remove(button.dataset.cartRemove)));
    overlay.querySelector("[data-cart-checkout]")?.addEventListener("click", () => {
      const snapshot = normalizeCartItems(items);
      close();
      onCheckout({ items: snapshot, summary: cartCheckoutSummary(snapshot) });
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    documentRef.addEventListener("keydown", onKeydown);
    overlay.querySelector("[data-cart-close]")?.focus();
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    documentRef.body.style.overflow = previousOverflow;
    documentRef.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
  }

  function showToast(message) {
    documentRef.querySelector(".kreaton-cart-toast")?.remove();
    const mount = documentRef.querySelector(".rendered-site") || documentRef.body;
    mount.insertAdjacentHTML("beforeend", `<div class="kreaton-cart-toast" role="status">${checkIcon()}<span>${escapeMarkup(message)}</span></div>`);
    globalThis.setTimeout(() => documentRef.querySelector(".kreaton-cart-toast")?.remove(), 1800);
  }

  function bind(root = documentRef) {
    root.querySelectorAll("[data-cart-add]").forEach((button) => button.addEventListener("click", () => addFromTrigger(button)));
    root.querySelectorAll("[data-cart-open]").forEach((button) => button.addEventListener("click", open));
    syncCounters();
  }

  return { component: SHARED_CART_COMPONENT, storageKey: key, bind, open, close, count, items: () => normalizeCartItems(items) };
}

function escapeMarkup(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function bagIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>';
}

function closeIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>';
}

function arrowIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>';
}

function checkIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
}
