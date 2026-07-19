export type UserRole = "admin" | "vendor" | "customer" | "support";

export type ProductSummary = {
  id: string;
  vendorId: string;
  vendorName: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  ratingAverage: number;
  ratingCount: number;
  primaryImageUrl?: string;
  shippingBadge?: string;
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock" | "backorder";
};

export type CartItem = {
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  imageUrl?: string;
};

export type VendorCartGroup = {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
};

export type CheckoutQuote = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
  vendorGroups: Array<{
    vendorId: string;
    vendorName: string;
    subtotal: number;
    shippingTotal: number;
    estimatedFulfillment?: string;
  }>;
};

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  vendorOrderCount: number;
  placedAt: string;
};

export type VendorOrderSummary = {
  id: string;
  vendorOrderNumber: string;
  status: string;
  subtotal: number;
  commissionAmount: number;
  vendorNetAmount: number;
  currency: string;
  createdAt: string;
};

export type VendorLedgerEntry = {
  id: string;
  entryType: "sale" | "commission" | "refund" | "adjustment" | "payout" | "reversal";
  status: "pending" | "available" | "paid" | "held" | "reversed";
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  availableAt?: string;
  paidAt?: string;
};
