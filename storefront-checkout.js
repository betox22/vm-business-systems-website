export function checkoutLines(items, catalog, businessId) {
  if (!businessId || !items.length) throw new Error("Your cart is empty or unavailable.");
  return items.map((line) => {
    const matches = catalog.filter((item) => String(item.id || item.itemId || item.name || item.title || "") === line.id);
    const item = matches.length === 1 ? matches[0] : null;
    if (!item?.product_id || item.business_id !== businessId || item.price_type === "quote_only") {
      throw new Error("An item is no longer available for checkout. Remove it and refresh the page.");
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error("Invalid quantity.");
    return { productId: item.product_id, quantity: line.quantity };
  });
}

export function createCheckoutAttempt({ apiBase, businessId, lines, fetchRef = globalThis.fetch, uuid = () => crypto.randomUUID() }) {
  let sessionPayload = null;
  let key = null;
  let busy = false;
  async function post(path, body, headers = {}) {
    const response = await fetchRef(`${apiBase}/api/v1/checkout/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Checkout could not be completed. Please try again.");
    return result;
  }
  return async (details) => {
    if (busy) throw new Error("Checkout is already being prepared.");
    busy = true;
    try {
      if (!sessionPayload) {
        // A failed/ambiguous cart-add starts a fresh cart, never adds twice to the same cart.
        const cartId = uuid();
        for (const line of lines) await post("cart/items", { businessId, cartId, ...line });
        sessionPayload = { ...details, businessId, cartId };
        key = uuid();
      }
      // Once session creation starts, retry only that frozen request and key.
      const result = await post("create-session", sessionPayload, { "Idempotency-Key": key });
      const checkoutUrl = result.payment?.checkoutUrl;
      const url = new URL(checkoutUrl);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Stripe checkout is unavailable. Your payment has not been confirmed.");
      return { ...result, checkoutUrl: url.href };
    } finally { busy = false; }
  };
}

export async function reconcileCheckoutReturn({ site, cart, apiBase, locationRef = location, storage = sessionStorage, fetchRef = fetch }) {
  const url = new URL(locationRef.href);
  if (url.searchParams.get("checkout") !== "returned") return false;
  const key = `kreaton:checkout:${cart.storageKey}`;
  let receipt;
  try { receipt = JSON.parse(storage.getItem(key) || "null"); } catch { return false; }
  if (!receipt?.sessionId || receipt.businessId !== site.commerce?.businessId) return false;
  const response = await fetchRef(`${apiBase}/api/v1/checkout/session-status?businessId=${encodeURIComponent(receipt.businessId)}&sessionId=${encodeURIComponent(receipt.sessionId)}`);
  if (!response.ok || (await response.json()).paid !== true) return false;
  const cleared = cart.clearIfUnchanged(receipt.items);
  storage.removeItem(key);
  return cleared;
}

export function openStorefrontCheckout({ site, items, apiBase, cart, documentRef = document, locationRef = window.location, neutralPresentation = false }) {
  documentRef.querySelector(".storefront-checkout")?.remove();
  const es = (site.schema?.business?.selectedLanguage || site.schema?.selectedLanguage) === "es";
  const copy = es ? {
    title: "Datos de envio", email: "Email", firstName: "Nombre", lastName: "Apellido", line1: "Direccion",
    city: "Ciudad", region: "Estado / provincia", postalCode: "Codigo postal", country: "Pais (codigo de 2 letras)",
    submit: "Continuar al pago seguro", waiting: "Preparando pago...", close: "Cerrar",
  } : {
    title: "Shipping details", email: "Email", firstName: "First name", lastName: "Last name", line1: "Street address",
    city: "City", region: "State / province", postalCode: "Postal code", country: "Country (2-letter code)",
    submit: "Continue to secure payment", waiting: "Preparing checkout...", close: "Close",
  };
  const field = (name, autocomplete, max, full = false) => `<label class="${full ? "checkout-full" : ""}">${copy[name]}<input name="${name}" autocomplete="${autocomplete}" maxlength="${max}" required ${name === "email" ? 'type="email"' : 'type="text"'} ${name === "country" ? 'pattern="[A-Za-z]{2}" value="US"' : ""}></label>`;
  if (neutralPresentation) copy.submit = es ? "Continuar al pago" : "Continue to payment";
  const overlay = documentRef.createElement("div");
  overlay.className = "storefront-checkout";
  overlay.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="storefrontCheckoutTitle"><header><h2 id="storefrontCheckoutTitle">${copy.title}</h2><button type="button" data-checkout-close aria-label="${copy.close}">&times;</button></header><form>
    ${field("email", "email", 200, true)}${field("firstName", "given-name", 100)}${field("lastName", "family-name", 100)}
    ${field("line1", "shipping address-line1", 240, true)}${field("city", "shipping address-level2", 120)}${field("region", "shipping address-level1", 120)}
    ${field("postalCode", "shipping postal-code", 40)}${field("country", "shipping country", 2)}
    <p role="alert" class="checkout-full" data-checkout-status></p><button class="checkout-full" type="submit">${copy.submit}</button></form></section>`;
  documentRef.body.append(overlay);
  const focusBefore = documentRef.activeElement;
  const overflowBefore = documentRef.body.style.overflow;
  documentRef.body.style.overflow = "hidden";
  const form = overlay.querySelector("form");
  const status = overlay.querySelector("[data-checkout-status]");
  const submit = form.querySelector('[type="submit"]');
  let pending = false;
  const close = () => {
    if (pending) return;
    overlay.remove(); documentRef.body.style.overflow = overflowBefore; focusBefore?.focus();
  };
  overlay.querySelector("[data-checkout-close]").addEventListener("click", close);
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
    if (event.key === "Tab") {
      const nodes = [...overlay.querySelectorAll("button:not(:disabled),input:not(:disabled)")];
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  let attempt;
  try {
    attempt = createCheckoutAttempt({ apiBase, businessId: site.commerce.businessId, lines: checkoutLines(items, site.catalog_items || [], site.commerce.businessId) });
  } catch (error) { status.textContent = error.message; submit.disabled = true; }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending || !attempt || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const success = new URL(locationRef.href); success.searchParams.set("checkout", "returned");
    const cancel = new URL(locationRef.href); cancel.searchParams.set("checkout", "cancelled");
    pending = true; submit.disabled = true; status.textContent = copy.waiting;
    try {
      const result = await attempt({
        customer: { email: values.email.trim(), firstName: values.firstName.trim(), lastName: values.lastName.trim() },
        shippingAddress: { line1: values.line1.trim(), city: values.city.trim(), region: values.region.trim(), postalCode: values.postalCode.trim(), country: values.country.toUpperCase() },
        successUrl: success.href, cancelUrl: cancel.href,
      });
      if (cart && result.payment?.sessionId) {
        try { sessionStorage.setItem(`kreaton:checkout:${cart.storageKey}`, JSON.stringify({
          sessionId: result.payment.sessionId, businessId: site.commerce.businessId, items,
        })); } catch { /* Storage restrictions must not prevent payment. */ }
      }
      locationRef.assign(result.checkoutUrl);
    } catch (error) { status.textContent = neutralPresentation ? "Checkout could not be completed. Please try again." : error.message; }
    finally { pending = false; submit.disabled = false; }
  });
  form.querySelector("input")?.focus();
}
