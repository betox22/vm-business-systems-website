let models = [
  {
    id: "nova-air",
    name: "Nova Air",
    badge: "Lightweight",
    price: 799,
    finish: "Sky graphite",
    color: "#79d8ff",
    storage: "256 GB",
    battery: "28h battery",
    weight: "1.2 lb",
    sku: "NVA-AIR-256",
    inventory: "Ships today"
  },
  {
    id: "nova-pro",
    name: "Nova Pro",
    badge: "Best fit",
    price: 1099,
    finish: "Titanium violet",
    color: "#7467ff",
    storage: "512 GB",
    battery: "36h battery",
    weight: "1.3 lb",
    sku: "NVA-PRO-512",
    inventory: "Limited run"
  },
  {
    id: "nova-studio",
    name: "Nova Studio",
    badge: "Creator",
    price: 1499,
    finish: "Obsidian blue",
    color: "#101827",
    storage: "1 TB",
    battery: "42h battery",
    weight: "1.4 lb",
    sku: "NVA-STU-1TB",
    inventory: "Preorder"
  }
];

let specs = [
  ["Display", "6.8 inch edge-to-edge OLED"],
  ["Processor", "N1 neural performance chip"],
  ["Camera", "48 MP adaptive light system"],
  ["Build", "Aerospace aluminum and ceramic glass"],
  ["Connectivity", "5G, Wi-Fi 7, Bluetooth LE"],
  ["Warranty", "2 year premium care included"]
];

let categories = [
  {
    id: "flagship",
    name: "Flagship devices",
    desc: "Main product line, hero launches, and premium models.",
    count: "3 products"
  },
  {
    id: "accessories",
    name: "Accessories",
    desc: "Cases, docks, chargers, mounts, and add-on kits.",
    count: "12 products"
  },
  {
    id: "bundles",
    name: "Bundles",
    desc: "Curated kits for creators, travel, home, and work.",
    count: "6 bundles"
  },
  {
    id: "care",
    name: "Care plans",
    desc: "Warranty, protection, support, and replacement options.",
    count: "4 plans"
  }
];

let paymentMethods = [
  {
    id: "stripe-card",
    label: "Card checkout",
    detail: "Stripe-hosted card flow, tokenized and server-confirmed.",
    status: "Primary"
  },
  {
    id: "wallets",
    label: "Apple Pay / Google Pay",
    detail: "Wallet-ready through the active payment provider.",
    status: "Ready"
  },
  {
    id: "paypal",
    label: "PayPal",
    detail: "Reserved provider slot for store owners that enable it.",
    status: "Optional"
  },
  {
    id: "manual",
    label: "Manual transfer",
    detail: "Keeps orders pending until the store verifies payment.",
    status: "Manual"
  }
];

let customerOrders = [
  {
    id: "KR-2048",
    status: "In transit",
    product: "Nova Pro",
    total: 1176,
    tracking: "UPS 1Z88942",
    date: "Jul 12"
  },
  {
    id: "KR-1982",
    status: "Delivered",
    product: "Nova Air",
    total: 854,
    tracking: "FedEx 784451",
    date: "Jun 28"
  }
];

let ownerProducts = [
  { name: "Nova Air", category: "Flagship devices", stock: 42, price: 799, status: "Published" },
  { name: "Nova Pro", category: "Flagship devices", stock: 18, price: 1099, status: "Published" },
  { name: "Nova Studio", category: "Flagship devices", stock: 8, price: 1499, status: "Preorder" },
  { name: "MagSafe Dock Kit", category: "Accessories", stock: 126, price: 129, status: "Draft" }
];

let ownerMetrics = [
  ["Sales today", "$4,820"],
  ["Open orders", "14"],
  ["Low stock", "3"],
  ["Pending payments", "2"]
];

const state = {
  route: "home",
  selectedModelId: "nova-pro",
  cart: [],
  cartData: null,
  orderPlaced: false,
  cartId: `premium-cart-${Date.now()}`,
  backendReady: false,
  backendMode: "demo",
  backendMessage: "Demo data",
  loading: true,
  currentOrder: null,
  checkoutBusy: false
};

const app = document.querySelector("#app");
const businessId = "demo-premium";
const apiBase = resolveApiBase();

function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("api");
  if (explicit) return explicit.replace(/\/$/, "");
  if (window.KREATON_API_BASE) return String(window.KREATON_API_BASE).replace(/\/$/, "");
  if (window.location.port && window.location.port !== "8010") return "http://127.0.0.1:8010/api/v1";
  return `${window.location.origin}/api/v1`;
}

async function apiJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 3500);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`${response.status} ${detail.slice(0, 120)}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function setBackendMode(mode, message) {
  state.backendMode = mode;
  state.backendReady = mode === "api";
  state.backendMessage = message;
}

function backendBadge() {
  return `
    <div class="backend-badge ${state.backendReady ? "is-live" : "is-demo"}">
      <span></span>
      <strong>${state.backendReady ? "Backend connected" : "Preview mode"}</strong>
      <em>${state.backendMessage}</em>
    </div>
  `;
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function modelFromProduct(product, index = 0) {
  const colors = ["#79d8ff", "#7467ff", "#101827", "#3bd88f", "#ff9f43"];
  const specsMap = product.specs || {};
  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name,
    badge: product.badge || product.status || "Product",
    price: Number(product.price || 0),
    finish: specsMap.Finish || specsMap.finish || product.categoryId || "Premium finish",
    color: colors[index % colors.length],
    storage: specsMap.Storage || specsMap.storage || specsMap.Included || "Configurable",
    battery: specsMap.Battery || specsMap.battery || specsMap.Compatibility || "Ready to ship",
    weight: specsMap.Weight || specsMap.weight || "Product line",
    sku: product.sku || product.id,
    inventory: Number(product.stock || 0) > 0 ? `${product.stock} in stock` : "Check availability",
    description: product.description || "",
    imageUrl: product.imageUrl || ""
  };
}

function categoryFromApi(category) {
  return {
    id: category.id,
    name: category.name,
    desc: category.description || "",
    count: `${category.productCount || 0} products`
  };
}

function ownerProductFromApi(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.categoryId,
    stock: product.stock,
    price: product.price,
    status: product.status || (product.published ? "Published" : "Draft")
  };
}

function orderFromApi(order) {
  return {
    id: order.orderNumber || order.id,
    status: order.status || "Pending",
    product: (order.items || []).map((item) => item.name).join(", ") || "Order",
    total: order.total || 0,
    tracking: order.tracking?.trackingNumber || "Tracking pending",
    date: order.createdAt ? new Date(order.createdAt * 1000).toLocaleDateString() : "Today"
  };
}

async function hydrateFromBackend() {
  state.loading = true;
  render();
  try {
    const [home, payments, owner, orders] = await Promise.all([
      apiJson(`/storefront/${businessId}/home`),
      apiJson(`/store-owner/${businessId}/payments`, { headers: { "X-User-Role": "store_owner" } }),
      apiJson(`/store-owner/${businessId}/products`, { headers: { "X-User-Role": "store_owner" } }),
      apiJson(`/customer/orders`, { headers: { "X-User-Id": "demo-customer" } })
    ]);

    categories = (home.categories || []).map(categoryFromApi);
    models = (home.featuredProducts || []).map(modelFromProduct).slice(0, 4);
    if (models.length) {
      state.selectedModelId = models.find((model) => model.id === state.selectedModelId)?.id || models[0].id;
    }
    ownerProducts = (owner.products || []).map(ownerProductFromApi);
    customerOrders = (orders.orders || []).map(orderFromApi);
    paymentMethods = (payments.methods?.enabledMethods || []).map((method) => ({
      id: method,
      label: methodLabel(method),
      detail: methodDetail(method, payments.methods),
      status: method === "card" ? (payments.methods.providerConfigured ? "Connected" : "Needs setup") : "Optional"
    }));
    ownerMetrics = [
      ["Sales today", money(0)],
      ["Open orders", String((payments.events || []).filter((event) => event.status !== "fulfilled").length)],
      ["Low stock", String(ownerProducts.filter((product) => Number(product.stock) <= 10).length)],
      ["Pending payments", String((payments.events || []).filter((event) => event.status === "pending_payment").length)]
    ];
    setBackendMode("api", `${apiBase}`);
  } catch (error) {
    setBackendMode("demo", `API fallback: ${error.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

function methodLabel(method) {
  const labels = {
    card: "Card checkout",
    apple_pay: "Apple Pay",
    google_pay: "Google Pay",
    paypal: "PayPal",
    manual_transfer: "Manual transfer"
  };
  return labels[method] || method.replaceAll("_", " ");
}

function methodDetail(method, config = {}) {
  if (method === "card") return config.providerConfigured ? "Stripe Checkout is configured server-side." : "Stripe key not configured yet.";
  if (method === "manual_transfer") return config.manualInstructions || "Manual payment keeps the order pending until verified.";
  return "Wallet/payment option controlled by the provider configuration.";
}

function cartItemsForRender() {
  if (state.cartData?.items?.length) {
    return state.cartData.items.map((item) => ({
      id: item.productId,
      name: item.name,
      finish: item.sku,
      storage: `${item.stockAvailable} available`,
      qty: item.quantity,
      price: item.unitPrice,
      lineTotal: item.lineTotal
    }));
  }
  return state.cart.length ? state.cart : [{ ...selectedModel(), qty: 1, lineTotal: selectedModel().price }];
}

function cartTotalsForRender(items) {
  if (state.cartData) {
    return {
      subtotal: state.cartData.subtotal,
      shipping: state.cartData.shippingEstimate,
      tax: state.cartData.taxEstimate,
      total: state.cartData.total
    };
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal > 0 ? 0 : 0;
  const tax = subtotal * 0.07;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

function currentCheckoutItem() {
  return cartItemsForRender()[0] || { ...selectedModel(), qty: 1, price: selectedModel().price };
}

function selectedModel() {
  return models.find((model) => model.id === state.selectedModelId) || models[0];
}

function productVisual(size = "large", model = selectedModel()) {
  return `
    <div class="device device-${size}" style="--model-color: ${model.color}">
      <div class="device-screen">
        <div class="screen-dot"></div>
        <div class="screen-glow"></div>
        <div class="screen-lens lens-one"></div>
        <div class="screen-lens lens-two"></div>
      </div>
      <div class="device-edge"></div>
    </div>
  `;
}

function renderHome() {
  const model = selectedModel();

  return `
    <div class="page">
    ${backendBadge()}
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Nova Series</span>
        <h1>A premium store for every product in the line.</h1>
        <p>
          Launch a flagship product, sell accessories, build bundles, and keep
          the purchase experience polished from discovery to checkout.
        </p>
        <div class="hero-actions">
          <button class="buy-button" type="button" data-route="shop">Explore collection</button>
          <button class="secondary-button" type="button" data-route="categories">View categories</button>
        </div>
        <div class="hero-specs">
          <div><strong>${model.battery}</strong><span>All-day power</span></div>
          <div><strong>${model.storage}</strong><span>Fast storage</span></div>
          <div><strong>${money(model.price)}</strong><span>Starting at</span></div>
        </div>
      </div>
      <div class="hero-product" aria-label="Premium product render">
        ${productVisual("large")}
      </div>
    </section>

    <section class="story-band">
      <div class="story-inner">
        <div class="story-copy">
          <span class="eyebrow">Focused commerce</span>
          <h2>Clean retail for focused brands.</h2>
          <p>Built for product lines that need strong presentation, category structure, model comparison, and direct checkout without marketplace clutter.</p>
        </div>
        <div class="material-stack">
          <article class="material-card"><strong>Launch story</strong><span>Hero copy, proof points and product positioning can be edited per brand.</span></article>
          <article class="material-card"><strong>Direct purchase</strong><span>Single-store checkout keeps payment, tax, fulfillment, and tracking clean.</span></article>
          <article class="material-card"><strong>Product proof</strong><span>Specs, media, and comparison blocks stay inside the product experience.</span></article>
        </div>
      </div>
    </section>

    <section class="feature-section section">
      <div class="feature-visual">${productVisual("medium")}</div>
      <div class="feature-copy">
        <span class="eyebrow">Product storytelling</span>
        <h2>Show the craft. Then make buying effortless.</h2>
        <p>
          Product story, specs, highlights, model names, photos, and purchase
          flow stay editable while the premium structure remains intact.
        </p>
        <button class="buy-button" type="button" data-route="product">Configure product</button>
      </div>
    </section>

    <section class="section category-preview">
      <div class="section-heading">
        <span class="eyebrow">Store structure</span>
        <h2>One brand can still have categories.</h2>
      </div>
      <div class="category-grid">
        ${categories.map(renderCategoryCard).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <span class="eyebrow">Choose a model</span>
        <h2>Compare the line. Choose the right finish.</h2>
      </div>
      <div class="model-grid">
        ${models.map(renderModelCard).join("")}
      </div>
    </section>

    <section class="section specs-preview">
      <div class="section-heading">
        <span class="eyebrow">Technical proof</span>
        <h2>Technical proof without visual noise.</h2>
      </div>
      <div class="spec-card-grid">
        ${specs.slice(0, 4).map(([label, value]) => `
          <article class="spec-card">
            <span>${label}</span>
            <strong>${value}</strong>
          </article>
        `).join("")}
      </div>
    </section>
    </div>
  `;
}

function renderShop() {
  return `
    <div class="page">
      <section class="section shop-page">
        <div class="section-heading centered">
          <span class="eyebrow">Shop</span>
          <h1>Products organized by brand category.</h1>
          <p>A premium single-vendor store can sell multiple products, bundles and accessories while keeping the flagship product experience polished.</p>
        </div>
        <div class="category-strip">
          ${categories.map((category) => `
            <button type="button" data-route="categories">
              <strong>${category.name}</strong>
              <span>${category.count}</span>
            </button>
          `).join("")}
        </div>
        <div class="model-grid shop-grid">
          ${models.map((model) => renderModelCard(model, true)).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderCategories() {
  return `
    <div class="page">
      <section class="section categories-page">
        <div class="section-heading centered">
          <span class="eyebrow">Categories</span>
          <h1>Organize the store by collections.</h1>
          <p>Use categories for devices, accessories, bundles, care plans, services, or any product family the brand needs.</p>
        </div>
        <div class="category-grid category-grid-large">
          ${categories.map(renderCategoryCard).join("")}
        </div>
        <div class="category-actions">
          <button class="buy-button" type="button" data-route="shop">Shop products</button>
          <button class="secondary-button" type="button" data-route="product">Open featured product</button>
        </div>
      </section>
    </div>
  `;
}

function renderProduct() {
  const model = selectedModel();

  return `
    <div class="page">
    <section class="product-layout section">
      <div class="gallery-panel">
        <div class="gallery-main">${productVisual("large")}</div>
        <div class="gallery-row">
          <button class="gallery-thumb active" type="button">${productVisual("thumb")}</button>
          <button class="gallery-thumb" type="button"><span class="thumb-chip">Materials</span></button>
          <button class="gallery-thumb" type="button"><span class="thumb-chip">In use</span></button>
        </div>
      </div>

      <aside class="product-info">
        <span class="eyebrow">${model.badge}</span>
        <h1>${model.name}</h1>
        <p class="purchase-subtitle">
          ${model.finish}. ${model.storage}. ${model.battery}. A polished product
          detail flow with real inventory, variants, media, specs, and checkout.
        </p>
        <div class="price-line"><strong>${money(model.price)}</strong><span>or financing-ready monthly payments</span></div>
        <p class="inventory">${model.inventory} · SKU ${model.sku}</p>

        <div class="choice-panel">
          <h3>Choose model</h3>
          <div class="option-row" role="list" aria-label="Choose model">
            ${models.map((item) => `<button class="${item.id === state.selectedModelId ? "active" : ""}" type="button" data-model="${item.id}">${item.name}<br><small>${money(item.price)}</small></button>`).join("")}
          </div>
        </div>

        <div class="buy-panel">
          <h3>Purchase</h3>
          <button class="buy-button full" type="button" data-add="${model.id}">Add to cart</button>
          <button class="secondary-button full" type="button" data-route="checkout">Buy now</button>
          <button class="secondary-button full" type="button" data-scroll="#product-compare">Compare similar products</button>
          <div class="assurance-list">
            <span><b></b>Secure checkout</span>
            <span><b></b>Shipping tracking ready</span>
            <span><b></b>Customer account ready</span>
          </div>
        </div>
      </aside>
    </section>

    <section class="section product-internal" id="product-specs">
      <div class="section-heading">
        <span class="eyebrow">Specs inside the product</span>
        <h2>Technical details stay where the buyer needs them.</h2>
      </div>
      <div class="spec-card-grid">
        ${specs.map(([label, value]) => `
          <article class="spec-card">
            <span>${label}</span>
            <strong>${value}</strong>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="section product-internal" id="product-compare">
      <div class="section-heading">
        <span class="eyebrow">Compare similar products</span>
        <h2>Compare models inside the product decision flow.</h2>
      </div>
      <div class="comparison-grid">
        ${models.map((item) => renderComparisonCard(item)).join("")}
      </div>
    </section>
    </div>
  `;
}

function renderSpecs() {
  return `
    <div class="page">
    <section class="section specs-page">
      <div class="section-heading centered">
        <span class="eyebrow">Compare</span>
        <h1>Find the model that matches the job.</h1>
        <p>Structured specifications make this template useful for premium electronics, equipment, tools, accessories, and launch products.</p>
      </div>
      <div class="comparison-grid">
        ${models.map((model) => `
          <article class="comparison-card ${model.id === state.selectedModelId ? "is-selected" : ""}">
            <div class="mini-product">${productVisual("mini", model)}</div>
            <span>${model.badge}</span>
            <h2>${model.name}</h2>
            <strong>${money(model.price)}</strong>
            <button type="button" data-model="${model.id}">Select</button>
            <dl>
              <div><dt>Finish</dt><dd>${model.finish}</dd></div>
              <div><dt>Storage</dt><dd>${model.storage}</dd></div>
              <div><dt>Battery</dt><dd>${model.battery}</dd></div>
              <div><dt>Weight</dt><dd>${model.weight}</dd></div>
            </dl>
          </article>
        `).join("")}
      </div>
      <div class="spec-table">
        ${specs.map(([label, value]) => `
          <div>
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join("")}
      </div>
    </section>
    </div>
  `;
}

function renderAccount() {
  return `
    <div class="page">
      <section class="section account-page">
        <div class="section-heading centered">
          <span class="eyebrow">Customer account</span>
          <h1>Orders, tracking, addresses, and support in one place.</h1>
          <p>Every buyer has a clean account area for saved purchases, shipping updates, support, and future reorders.</p>
        </div>
        <div class="account-layout">
          <aside class="account-profile">
            <div class="profile-avatar">AR</div>
            <h2>Alex Rivera</h2>
            <p>alex@example.com</p>
            <div class="assurance-list">
              <span><b></b>Verified customer</span>
              <span><b></b>2 saved addresses</span>
              <span><b></b>Support history ready</span>
            </div>
          </aside>
          <div class="order-list">
            ${customerOrders.map((order) => `
              <article class="order-card">
                <div>
                  <span>${order.date}</span>
                  <h3>Order ${order.id}</h3>
                  <p>${order.product} · ${order.tracking}</p>
                </div>
                <div>
                  <strong>${money(order.total)}</strong>
                  <em>${order.status}</em>
                </div>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderStoreAdmin() {
  return `
    <div class="page">
      <section class="section admin-page">
        ${backendBadge()}
        <div class="section-heading">
          <span class="eyebrow">Store owner backend</span>
          <h1>Manage products, orders, payments, and fulfillment.</h1>
          <p>This is the owner-side control surface this template expects from the commerce backend.</p>
        </div>
        <div class="metric-grid">
          ${ownerMetrics.map(([label, value]) => `
            <article class="metric-card">
              <span>${label}</span>
              <strong>${value}</strong>
            </article>
          `).join("")}
        </div>
        <div class="admin-layout">
          <section class="admin-panel">
            <div class="panel-head">
              <h2>Products and inventory</h2>
              <button class="secondary-button" type="button">Add product</button>
            </div>
            <div class="admin-table">
              ${ownerProducts.map((product) => `
                <article>
                  <strong>${product.name}</strong>
                  <span>${product.category}</span>
                  <span>${product.stock} in stock</span>
                  <span>${money(product.price)}</span>
                  <em>${product.status}</em>
                </article>
              `).join("")}
            </div>
          </section>
          <aside class="admin-panel">
            <h2>Commerce modules</h2>
            <div class="module-list">
              <span>Orders</span>
              <span>Payments</span>
              <span>Shipping and tracking</span>
              <span>Customers</span>
              <span>Discounts</span>
              <span>Staff roles</span>
              <span>Audit log</span>
            </div>
            <h2 class="panel-subhead">Payment methods</h2>
            <div class="module-list">
              ${paymentMethods.map((method) => `<span>${method.label} · ${method.status}</span>`).join("")}
            </div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

function renderCategoryCard(category) {
  return `
    <button class="category-card" type="button" data-route="shop">
      <span>${category.count}</span>
      <strong>${category.name}</strong>
      <p>${category.desc}</p>
    </button>
  `;
}

function renderComparisonCard(model) {
  return `
    <article class="comparison-card ${model.id === state.selectedModelId ? "is-selected" : ""}">
      <div class="mini-product">${productVisual("mini", model)}</div>
      <span>${model.badge}</span>
      <h2>${model.name}</h2>
      <strong>${money(model.price)}</strong>
      <button type="button" data-view-model="${model.id}">View product</button>
      <dl>
        <div><dt>Finish</dt><dd>${model.finish}</dd></div>
        <div><dt>Storage</dt><dd>${model.storage}</dd></div>
        <div><dt>Battery</dt><dd>${model.battery}</dd></div>
        <div><dt>Weight</dt><dd>${model.weight}</dd></div>
      </dl>
    </article>
  `;
}

function renderCart() {
  const cartItems = cartItemsForRender();
  const totals = cartTotalsForRender(cartItems);

  return `
    <div class="page">
    <section class="cart-page section">
      <div class="cart-hero">
        <div>
          <span class="eyebrow">Cart</span>
          <h1>Your premium order.</h1>
          <p>Single-store checkout keeps orders, taxes, fulfillment and tracking clean.</p>
        </div>
        <button class="secondary-button" type="button" data-route="shop">Continue shopping</button>
      </div>
      <div class="cart-layout">
        <div class="cart-card">
          ${cartItems.map((item) => `
            <article class="cart-item">
              <div class="cart-thumb"></div>
              <div>
                <h3>${item.name}</h3>
                <p>${item.finish} · ${item.storage}</p>
                <span>Qty ${item.qty}</span>
              </div>
                <strong>${money(item.lineTotal || item.price * item.qty)}</strong>
            </article>
          `).join("")}
        </div>
        <aside class="summary-panel">
          <h3>Summary</h3>
          <div class="summary-line"><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
          <div class="summary-line"><span>Shipping</span><strong>${totals.shipping ? money(totals.shipping) : "Included"}</strong></div>
          <div class="summary-line"><span>Estimated tax</span><strong>${money(totals.tax)}</strong></div>
          <div class="summary-line total"><span>Total</span><strong>${money(totals.total)}</strong></div>
          <p class="backend-note">${state.backendReady ? "Cart totals are coming from the commerce API." : "Demo cart. Start the API to use real cart endpoints."}</p>
          <button class="buy-button full" type="button" data-route="checkout">Checkout</button>
        </aside>
      </div>
    </section>
    </div>
  `;
}

function renderCheckout() {
  const item = currentCheckoutItem();
  const totals = cartTotalsForRender(cartItemsForRender());
  return `
    <div class="page">
    <section class="checkout-page section">
      <div class="checkout-hero">
        <div>
          <span class="eyebrow">Checkout</span>
          <h1>Secure purchase flow.</h1>
          <p>The storefront requests checkout. The backend creates the payment session, verifies webhooks, reserves inventory, and writes the order.</p>
        </div>
        <strong>${money(totals.total || item.price)}</strong>
      </div>
      <div class="checkout-layout">
        <form class="checkout-stack">
          <div class="checkout-step">
            <h3>Contact</h3>
            <div class="field">
              <label>Contact email</label>
            <input type="email" value="customer@example.com" aria-label="Contact email" />
            </div>
          </div>
          <div class="checkout-step">
            <h3>Shipping</h3>
          <div class="field-grid">
              <div class="field">
                <label>First name</label>
              <input type="text" value="Alex" aria-label="First name" />
              </div>
              <div class="field">
                <label>Last name</label>
              <input type="text" value="Rivera" aria-label="Last name" />
              </div>
          </div>
            <div class="field">
              <label>Shipping address</label>
              <input type="text" value="120 Market Street" aria-label="Shipping address" />
            </div>
          </div>
          <div class="checkout-step">
            <h3>Payment method</h3>
            ${paymentMethods.map((method, index) => `
              <button class="checkout-option ${index === 0 ? "active" : ""}" type="button">
                <span class="${index === 0 ? "checkout-dot" : ""}"></span>
                <strong>${method.label}</strong>
                <small>${method.detail}</small>
                <em>${method.status}</em>
              </button>
            `).join("")}
          </div>
          <button class="buy-button full" type="button" data-place-order="true" ${state.checkoutBusy ? "disabled" : ""}>
            ${state.checkoutBusy ? "Creating secure session..." : "Place secure order"}
          </button>
        </form>
        <aside class="summary-panel">
          <h3>Order</h3>
          <div class="summary-line"><span>${item.name}</span><strong>${money(item.lineTotal || item.price)}</strong></div>
          <div class="summary-line"><span>Shipping</span><strong>${totals.shipping ? money(totals.shipping) : "Included"}</strong></div>
          <div class="summary-line"><span>Tax estimate</span><strong>${money(totals.tax || item.price * 0.07)}</strong></div>
          <div class="summary-line total"><span>Total</span><strong>${money(totals.total || item.price * 1.07)}</strong></div>
          <div class="payment-contract">
            <strong>Production contract</strong>
            <span>POST /api/v1/checkout/create-session</span>
            <span>Idempotency-Key required</span>
            <span>Webhook reconciliation required</span>
            <span>${state.backendReady ? "API route connected" : "API fallback mode"}</span>
          </div>
        </aside>
      </div>
    </section>
    </div>
  `;
}

function renderOrderConfirmation() {
  const item = selectedModel();
  const order = state.currentOrder;
  const status = order?.status || "paid";
  const title = status === "paid" ? "Payment confirmed. Order created." : "Order created. Payment pending.";
  const body = status === "paid"
    ? "The backend confirmed the payment provider event, created the order, and deducted inventory."
    : "The backend created the order and reserved inventory. Store admin must connect Stripe or verify manual payment before fulfillment.";
  return `
    <div class="page">
      <section class="section confirmation-page">
        <div class="confirmation-card">
          <span class="eyebrow">Order confirmed</span>
          <h1>${title}</h1>
          <p>${body}</p>
          <div class="confirmation-grid">
            <div><span>Order</span><strong>${order?.orderNumber || `KR-${Date.now().toString().slice(-6)}`}</strong></div>
            <div><span>Product</span><strong>${item.name}</strong></div>
            <div><span>Total</span><strong>${money(order?.total || item.price * 1.07)}</strong></div>
            <div><span>Status</span><strong>${status.replaceAll("_", " ")}</strong></div>
          </div>
          <div class="hero-actions">
            <button class="buy-button" type="button" data-route="account">View account</button>
            <button class="secondary-button" type="button" data-route="shop">Continue shopping</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderModelCard(model, openProduct = false) {
  return `
    <button class="model-card ${model.id === state.selectedModelId ? "active" : ""}" type="button" ${openProduct ? `data-view-model="${model.id}"` : `data-model="${model.id}"`} style="--model-a:${model.color};--model-b:#101827;">
      <span class="eyebrow">${model.badge}</span>
      <div class="model-device"></div>
      <h3>${model.name}</h3>
      <p>${model.finish} · ${model.storage} · ${model.battery}</p>
      <strong>${money(model.price)}</strong>
    </button>
  `;
}

function render() {
  const routes = {
    home: renderHome,
    shop: renderShop,
    categories: renderCategories,
    product: renderProduct,
    cart: renderCart,
    checkout: renderCheckout,
    order: renderOrderConfirmation,
    account: renderAccount,
    admin: renderStoreAdmin
  };

  if (state.loading) {
    app.innerHTML = `
      <div class="page">
        ${backendBadge()}
        <section class="section loading-page">
          <div class="loading-copy">
            <span class="eyebrow">Commerce runtime</span>
            <h1>Connecting storefront and backend.</h1>
            <p>Loading catalog, payment methods, cart state, account data, and store admin modules.</p>
          </div>
          <div class="skeleton-grid">
            <span></span><span></span><span></span>
          </div>
        </section>
      </div>
    `;
  } else {
    app.innerHTML = (routes[state.route] || renderHome)();
  }
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === state.route);
  });
}

async function addToCart(modelId) {
  const model = models.find((item) => item.id === modelId);
  if (!model) return;
  if (state.backendReady) {
    try {
      state.cartData = await apiJson("/checkout/cart/items", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          cartId: state.cartId,
          productId: model.id,
          quantity: 1
        })
      });
    } catch (error) {
      setBackendMode("demo", `Cart API fallback: ${error.message}`);
    }
  }
  if (!state.cartData) {
    const existing = state.cart.find((item) => item.id === model.id);
    if (existing) {
      existing.qty += 1;
    } else {
      state.cart.push({ ...model, qty: 1 });
    }
  }
  state.route = "cart";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function placeOrder() {
  state.checkoutBusy = true;
  render();
  if (!state.cartData && state.backendReady) {
    await addToCart(state.selectedModelId);
    state.route = "checkout";
  }
  if (state.backendReady) {
    try {
      const result = await apiJson("/checkout/create-session", {
        method: "POST",
        headers: { "Idempotency-Key": `premium-${Date.now()}` },
        body: JSON.stringify({
          cartId: state.cartId,
          businessId,
          customer: { email: "customer@example.com", firstName: "Alex", lastName: "Rivera" },
          shippingAddress: {
            line1: "120 Market Street",
            city: "Miami",
            region: "FL",
            postalCode: "33101",
            country: "US"
          },
          successUrl: `${window.location.origin}${window.location.pathname}?order=success`,
          cancelUrl: `${window.location.origin}${window.location.pathname}?route=cart`
        })
      });
      state.currentOrder = result.order;
      state.backendMessage = result.payment?.providerStatus || "Order created";
      if (result.payment?.checkoutUrl) {
        window.open(result.payment.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setBackendMode("demo", `Checkout API fallback: ${error.message}`);
      state.currentOrder = null;
    }
  }
  state.checkoutBusy = false;
  state.orderPlaced = true;
  state.route = "order";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    state.route = routeButton.dataset.route;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const viewModelButton = event.target.closest("[data-view-model]");
  if (viewModelButton) {
    state.selectedModelId = viewModelButton.dataset.viewModel;
    state.route = "product";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const modelButton = event.target.closest("[data-model]");
  if (modelButton) {
    state.selectedModelId = modelButton.dataset.model;
    render();
    return;
  }

  const scrollButton = event.target.closest("[data-scroll]");
  if (scrollButton) {
    const target = document.querySelector(scrollButton.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    addToCart(addButton.dataset.add);
    return;
  }

  const placeOrderButton = event.target.closest("[data-place-order]");
  if (placeOrderButton) {
    placeOrder();
  }
});

hydrateFromBackend();
