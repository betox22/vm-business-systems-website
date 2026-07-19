/**
 * Mega Marketplace API client contract.
 *
 * This is a lightweight framework-independent client outline. It does not
 * contain secrets and does not replace backend authorization.
 */

export class MarketplaceApiClient {
  constructor({ baseUrl, getToken } = {}) {
    if (!baseUrl) {
      throw new Error("MarketplaceApiClient requires baseUrl.");
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.getToken = getToken || (() => null);
  }

  marketplaceHome() {
    return this.get("/api/v1/storefront/home");
  }

  departments() {
    return this.get("/api/v1/storefront/departments");
  }

  products(params = {}) {
    return this.get(`/api/v1/storefront/products${toQuery(params)}`);
  }

  productDetail(productSlug) {
    return this.get(`/api/v1/storefront/products/${encodeURIComponent(productSlug)}`);
  }

  cart() {
    return this.get("/api/v1/checkout/cart", { auth: true });
  }

  quoteCheckout(payload) {
    return this.post("/api/v1/checkout/quote", payload, { auth: true });
  }

  placeOrder(payload, idempotencyKey) {
    if (!idempotencyKey) {
      throw new Error("placeOrder requires idempotencyKey.");
    }

    return this.post("/api/v1/checkout/place-order", payload, {
      auth: true,
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });
  }

  vendorSummary() {
    return this.get("/api/v1/vendor/summary", { auth: true });
  }

  vendorProducts(params = {}) {
    return this.get(`/api/v1/vendor/products${toQuery(params)}`, { auth: true });
  }

  vendorOrders(params = {}) {
    return this.get(`/api/v1/vendor/orders${toQuery(params)}`, { auth: true });
  }

  vendorLedger(params = {}) {
    return this.get(`/api/v1/vendor/ledger${toQuery(params)}`, { auth: true });
  }

  adminSummary() {
    return this.get("/api/v1/admin/summary", { auth: true });
  }

  adminVendorApplications(params = {}) {
    return this.get(`/api/v1/admin/vendor-applications${toQuery(params)}`, { auth: true });
  }

  async get(path, options = {}) {
    return this.request("GET", path, undefined, options);
  }

  async post(path, payload, options = {}) {
    return this.request("POST", path, payload, options);
  }

  async patch(path, payload, options = {}) {
    return this.request("PATCH", path, payload, options);
  }

  async delete(path, options = {}) {
    return this.request("DELETE", path, undefined, options);
  }

  async request(method, path, payload, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(payload ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };

    if (options.auth) {
      const token = await this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      const message = data?.message || `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}

export function toQuery(params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }

  const text = query.toString();
  return text ? `?${text}` : "";
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}
