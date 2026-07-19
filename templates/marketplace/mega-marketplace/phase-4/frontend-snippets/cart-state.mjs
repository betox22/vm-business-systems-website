/**
 * Mega Marketplace cart state helpers.
 *
 * These functions are framework-independent by design. They can be used from
 * React, Next.js, or adapted to the current static frontend.
 *
 * Frontend totals are estimates only. The backend quote and place-order
 * endpoints remain the source of truth.
 */

const CART_VERSION = 1;
const DEFAULT_CURRENCY = "USD";

export function createEmptyCart(options = {}) {
  return {
    version: CART_VERSION,
    currency: options.currency || DEFAULT_CURRENCY,
    items: [],
    updatedAt: nowIso(),
  };
}

export function addCartItem(cart, product, quantity = 1) {
  assertPositiveQuantity(quantity);
  assertProduct(product);

  const next = cloneCart(cart);
  const existing = next.items.find(
    (item) => item.productId === String(product.id) && item.vendorId === String(product.vendorId),
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    next.items.push({
      productId: String(product.id),
      vendorId: String(product.vendorId),
      vendorName: String(product.vendorName || "Vendor"),
      name: String(product.name),
      quantity,
      unitPrice: money(Number(product.price || 0)),
      currency: product.currency || next.currency || DEFAULT_CURRENCY,
      imageUrl: product.primaryImageUrl || product.imageUrl || "",
    });
  }

  return normalizeCart(next);
}

export function updateCartItemQuantity(cart, productId, vendorId, quantity) {
  if (quantity <= 0) {
    return removeCartItem(cart, productId, vendorId);
  }

  assertPositiveQuantity(quantity);

  const next = cloneCart(cart);
  const item = next.items.find(
    (candidate) => candidate.productId === String(productId) && candidate.vendorId === String(vendorId),
  );

  if (!item) {
    return next;
  }

  item.quantity = quantity;
  return normalizeCart(next);
}

export function removeCartItem(cart, productId, vendorId) {
  const next = cloneCart(cart);
  next.items = next.items.filter(
    (item) => !(item.productId === String(productId) && item.vendorId === String(vendorId)),
  );
  return normalizeCart(next);
}

export function clearCart(cart) {
  return {
    version: CART_VERSION,
    currency: cart?.currency || DEFAULT_CURRENCY,
    items: [],
    updatedAt: nowIso(),
  };
}

export function groupCartByVendor(cart) {
  const groups = new Map();

  for (const item of cart?.items || []) {
    const vendorId = String(item.vendorId);

    if (!groups.has(vendorId)) {
      groups.set(vendorId, {
        vendorId,
        vendorName: item.vendorName || "Vendor",
        items: [],
        subtotal: 0,
        currency: item.currency || cart?.currency || DEFAULT_CURRENCY,
      });
    }

    const group = groups.get(vendorId);
    group.items.push({ ...item });
    group.subtotal = money(group.subtotal + item.unitPrice * item.quantity);
  }

  return Array.from(groups.values()).sort((a, b) => a.vendorName.localeCompare(b.vendorName));
}

export function getCartTotals(cart) {
  const groups = groupCartByVendor(cart);
  const subtotal = money(groups.reduce((total, group) => total + group.subtotal, 0));
  const itemCount = (cart?.items || []).reduce((total, item) => total + item.quantity, 0);

  return {
    currency: cart?.currency || DEFAULT_CURRENCY,
    vendorCount: groups.length,
    itemCount,
    subtotal,
  };
}

export function toCheckoutPayload(cart) {
  return {
    items: (cart?.items || []).map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  };
}

export function makeIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneCart(cart) {
  return {
    version: CART_VERSION,
    currency: cart?.currency || DEFAULT_CURRENCY,
    items: Array.isArray(cart?.items) ? cart.items.map((item) => ({ ...item })) : [],
    updatedAt: nowIso(),
  };
}

function normalizeCart(cart) {
  return {
    version: CART_VERSION,
    currency: cart.currency || DEFAULT_CURRENCY,
    items: cart.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        ...item,
        productId: String(item.productId),
        vendorId: String(item.vendorId),
        quantity: Math.trunc(item.quantity),
        unitPrice: money(Number(item.unitPrice || 0)),
        currency: item.currency || cart.currency || DEFAULT_CURRENCY,
      })),
    updatedAt: nowIso(),
  };
}

function assertProduct(product) {
  if (!product || product.id === undefined || product.vendorId === undefined || !product.name) {
    throw new Error("Product requires id, vendorId, and name before it can be added to cart.");
  }
}

function assertPositiveQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a positive integer.");
  }
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function nowIso() {
  return new Date().toISOString();
}
