import assert from "node:assert/strict";
import {
  addCartItem,
  createEmptyCart,
  getCartTotals,
  groupCartByVendor,
  makeIdempotencyKey,
  removeCartItem,
  toCheckoutPayload,
  updateCartItemQuantity,
} from "./cart-state.mjs";

let cart = createEmptyCart();

cart = addCartItem(cart, {
  id: "101",
  vendorId: "v-1",
  vendorName: "North Vendor",
  name: "Utility Jacket",
  price: 79.99,
  currency: "USD",
});

cart = addCartItem(cart, {
  id: "202",
  vendorId: "v-2",
  vendorName: "South Vendor",
  name: "Desk Lamp",
  price: 35,
  currency: "USD",
}, 2);

cart = addCartItem(cart, {
  id: "101",
  vendorId: "v-1",
  vendorName: "North Vendor",
  name: "Utility Jacket",
  price: 79.99,
  currency: "USD",
});

assert.equal(cart.items.length, 2);
assert.equal(cart.items.find((item) => item.productId === "101").quantity, 2);

const groups = groupCartByVendor(cart);
assert.equal(groups.length, 2);
assert.equal(groups.find((group) => group.vendorId === "v-1").subtotal, 159.98);
assert.equal(groups.find((group) => group.vendorId === "v-2").subtotal, 70);

const totals = getCartTotals(cart);
assert.equal(totals.vendorCount, 2);
assert.equal(totals.itemCount, 4);
assert.equal(totals.subtotal, 229.98);

cart = updateCartItemQuantity(cart, "202", "v-2", 1);
assert.equal(getCartTotals(cart).subtotal, 194.98);

cart = removeCartItem(cart, "202", "v-2");
assert.equal(getCartTotals(cart).vendorCount, 1);

assert.deepEqual(toCheckoutPayload(cart), {
  items: [
    {
      product_id: "101",
      quantity: 2,
    },
  ],
});

assert.ok(makeIdempotencyKey().length > 10);

console.log("cart-state tests passed");
