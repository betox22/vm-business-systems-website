const products = [
  {
    id: "p-001",
    name: "NovaCharge Magnetic Dock",
    category: "Electronics",
    vendor: "Orbit Goods",
    price: 29.99,
    rating: 4.8,
    reviews: 1284,
    badge: "Best seller",
    shipping: "Fast ship",
    desc: "Compact charging dock with reinforced magnetic hold.",
    colors: ["#12d8cf", "#5865f2"],
    visual: "dock"
  },
  {
    id: "p-002",
    name: "AeroPack Travel Organizer",
    category: "Travel",
    vendor: "Packline",
    price: 39.5,
    rating: 4.7,
    reviews: 842,
    badge: "Deal",
    shipping: "2-day",
    desc: "Modular organizer for tech, grooming and small essentials.",
    colors: ["#f97316", "#111827"],
    visual: "organizer"
  },
  {
    id: "p-003",
    name: "PulseBeam Desk Light",
    category: "Home",
    vendor: "BrightLab",
    price: 54.0,
    rating: 4.6,
    reviews: 531,
    badge: "Verified",
    shipping: "Fast ship",
    desc: "Adjustable ambient desk light with low-glare diffusion.",
    colors: ["#14d9d0", "#9333ea"],
    visual: "lamp"
  },
  {
    id: "p-004",
    name: "TrailCore Utility Jacket",
    category: "Fashion",
    vendor: "North Row",
    price: 84.99,
    rating: 4.9,
    reviews: 1904,
    badge: "Top rated",
    shipping: "Free return",
    desc: "Weather-ready lightweight jacket with reflective details.",
    colors: ["#111827", "#22c55e"],
    visual: "jacket"
  },
  {
    id: "p-005",
    name: "FlexGrip Phone Stand",
    category: "Electronics",
    vendor: "Orbit Goods",
    price: 18.75,
    rating: 4.5,
    reviews: 602,
    badge: "Deal",
    shipping: "Fast ship",
    desc: "Foldable stand for desk, travel, streaming and calls.",
    colors: ["#38bdf8", "#334155"],
    visual: "stand"
  },
  {
    id: "p-006",
    name: "GlowPatch Sticker Pack",
    category: "Accessories",
    vendor: "Flux Market",
    price: 9.99,
    rating: 4.4,
    reviews: 288,
    badge: "New",
    shipping: "Fast ship",
    desc: "Glow-in-the-dark waterproof sticker set for gear.",
    colors: ["#f72585", "#00f5d4"],
    visual: "sticker"
  },
  {
    id: "p-007",
    name: "MetroCable USB-C Turbo",
    category: "Electronics",
    vendor: "CableLab",
    price: 12.5,
    rating: 4.7,
    reviews: 1711,
    badge: "Best seller",
    shipping: "2-day",
    desc: "Braided fast-charge cable with reinforced ends.",
    colors: ["#0ea5e9", "#1e293b"],
    visual: "cable"
  },
  {
    id: "p-008",
    name: "UrbanGear Trunk Box",
    category: "Automotive",
    vendor: "RoadKit",
    price: 44.0,
    rating: 4.6,
    reviews: 476,
    badge: "Verified",
    shipping: "Free return",
    desc: "Heavy-duty organizer for vehicle storage and tools.",
    colors: ["#64748b", "#14d9d0"],
    visual: "box"
  }
];

const departments = [
  { name: "Electronics", desc: "Chargers, gadgets, cables", count: "48K", visual: "dock" },
  { name: "Home", desc: "Lighting, storage, decor", count: "31K", visual: "lamp" },
  { name: "Fashion", desc: "Outerwear and accessories", count: "22K", visual: "jacket" },
  { name: "Automotive", desc: "Tools, organizers, parts", count: "18K", visual: "box" },
  { name: "Travel", desc: "Bags, kits, essentials", count: "13K", visual: "organizer" },
  { name: "Deals", desc: "Daily marketplace offers", count: "9K", visual: "sticker" }
];

const cart = [];
let currentRoute = "home";

const app = document.querySelector("#app");
const cartCount = document.querySelector("#cartCount");

function money(value) {
  return `$${value.toFixed(2)}`;
}

function productVisual(product, extraClass = "") {
  const [a, b] = product.colors;
  return `
    <span class="product-object visual-${product.visual} ${extraClass}" style="--swatch-a:${a};--swatch-b:${b}" aria-hidden="true">
      <i></i>
      <b></b>
    </span>
  `;
}

function setRoute(route) {
  currentRoute = route;
  window.location.hash = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function productCard(product, extraClass = "") {
  return `
    <article class="product-card ${extraClass}">
      <button class="product-image" type="button" data-route="product" data-product="${product.id}" aria-label="Open ${product.name}">
        ${productVisual(product)}
      </button>
      <div class="product-info">
        <div class="product-badges">
          <span class="badge">${product.badge}</span>
          <span class="badge gold">${product.category}</span>
        </div>
        <h3>${product.name}</h3>
        <div class="vendor-line">Sold by ${product.vendor}</div>
        <p class="product-desc">${product.desc}</p>
        <div class="rating">★★★★★ ${product.rating} <span>(${product.reviews})</span></div>
        <div class="price-row">
          <span class="price">${money(product.price)}</span>
          <span class="shipping">${product.shipping}</span>
        </div>
      </div>
      <button class="add-button" type="button" data-add="${product.id}">Add to cart</button>
    </article>
  `;
}

function renderHome() {
  const heroProducts = [products[0], products[3], products[7]];
  const dealProducts = [products[1], products[4], products[6], products[5]];
  return `
    <section class="trust-strip" aria-label="Marketplace trust signals">
      <span><b></b> Protected checkout</span>
      <span><b></b> Fast vendor shipping</span>
      <span><b></b> Verified sellers</span>
      <span><b></b> Returns on eligible items</span>
    </section>

    <section class="commerce-hero">
      <div class="hero-main">
        <div class="hero-copy">
          <span class="eyebrow">One cart. Many trusted sellers.</span>
          <h1>Find sharper deals across every department.</h1>
          <p>Fast shipping picks, verified vendors, protected checkout, and fresh drops organized for quick discovery.</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" data-route="catalog">Shop marketplace</button>
            <button class="secondary-button" type="button" data-route="catalog">Explore categories</button>
          </div>
        </div>
        <div class="hero-product-stage" aria-hidden="true">
          ${heroProducts.map((product, index) => `
            <div class="hero-product hero-product-${index + 1}">
              ${productVisual(product, "hero-object")}
              <small>${product.badge}</small>
              <strong>${money(product.price)}</strong>
            </div>
          `).join("")}
        </div>
      </div>
      <aside class="hero-side">
        <div class="side-card offer-board">
          <div class="side-card-title">
            <h3>Flash picks</h3>
            <button type="button" data-route="catalog">View all</button>
          </div>
          <div class="mini-deal-grid">
            ${dealProducts.map((product) => `
              <button class="mini-deal" type="button" data-route="product">
                ${productVisual(product, "mini-object")}
                <span>${product.name}</span>
                <strong>${money(product.price)}</strong>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="side-card market-status">
          <h3>Today in stock</h3>
          <div class="metric-row">
            <div class="metric"><strong>48K</strong><span>items</span></div>
            <div class="metric"><strong>860</strong><span>vendors</span></div>
            <div class="metric"><strong>4.8</strong><span>avg rating</span></div>
          </div>
        </div>
      </aside>
    </section>

    <section>
      <div class="section-head">
        <div>
          <h2>Departments</h2>
          <p>Fast paths for a broad marketplace catalog.</p>
        </div>
        <button class="ghost-button" type="button" data-route="catalog">View all</button>
      </div>
      <div class="category-grid" aria-label="Departments">
        ${departments.map(({ name, desc, count, visual }) => {
          const sample = products.find((product) => product.visual === visual) || products[0];
          return `
          <button class="category-card" type="button" data-route="catalog">
            <span class="category-icon">
              ${productVisual(sample, "category-object")}
            </span>
            <strong>${name}</strong>
            <span>${desc} · ${count}</span>
          </button>
        `;
        }).join("")}
      </div>
    </section>

    <section>
      <div class="section-head">
        <div>
          <h2>Featured deals</h2>
          <p>Cards are consistent, scannable, and ready for real catalog data.</p>
        </div>
      </div>
      <div class="product-grid">
        ${products.slice(0, 4).map(productCard).join("")}
      </div>
    </section>
  `;
}

function renderCatalog() {
  const hotProducts = products.slice(0, 3);
  return `
    <section class="catalog-page">
      <div class="catalog-hero">
        <div>
          <span class="catalog-kicker">Marketplace catalog</span>
          <h2>Compare products from verified sellers.</h2>
          <p>High-density browsing with fast filters, vendor trust, delivery signals and cart-ready cards.</p>
          <div class="catalog-pill-row" aria-label="Active catalog filters">
            <button type="button">Fast ship</button>
            <button type="button">Top rated</button>
            <button type="button">Deals</button>
            <button type="button">Verified sellers</button>
          </div>
        </div>
        <aside class="catalog-deal-panel" aria-label="Promoted catalog picks">
          <strong>Trending now</strong>
          ${hotProducts.map((product) => `
            <button type="button" data-route="product">
              ${productVisual(product, "deal-object")}
              <span>${product.name}</span>
              <b>${money(product.price)}</b>
            </button>
          `).join("")}
        </aside>
      </div>

      <div class="catalog-mobile-filters" aria-label="Quick filters">
        <button type="button">Filters</button>
        <button type="button">Sort</button>
        <button type="button">Under $75</button>
        <button type="button">Free returns</button>
      </div>

      <section class="catalog-layout">
        <aside class="filter-panel catalog-filter-panel">
          <div class="filter-head">
            <strong>Filters</strong>
            <button type="button">Clear</button>
          </div>
          <div class="filter-group">
            <strong>Delivery</strong>
            <label class="filter-check"><input type="checkbox" checked> Fast shipping <span>42K</span></label>
            <label class="filter-check"><input type="checkbox"> Free returns <span>18K</span></label>
            <label class="filter-check"><input type="checkbox"> Local pickup <span>4K</span></label>
          </div>
          <div class="filter-group">
            <strong>Department</strong>
            ${departments.slice(0, 5).map(({ name }) => `<button class="filter-option" type="button"><span>${name}</span><span>›</span></button>`).join("")}
          </div>
          <div class="filter-group">
            <strong>Price</strong>
            <button class="filter-option" type="button"><span>Under $25</span><span>8K</span></button>
            <button class="filter-option" type="button"><span>$25 to $75</span><span>12K</span></button>
            <button class="filter-option" type="button"><span>$75+</span><span>5K</span></button>
          </div>
          <div class="filter-group">
            <strong>Seller trust</strong>
            <label class="filter-check"><input type="checkbox" checked> Verified seller <span>860</span></label>
            <label class="filter-check"><input type="checkbox"> 4.7+ rating <span>510</span></label>
          </div>
        </aside>

        <div class="catalog-results">
          <div class="results-toolbar catalog-toolbar">
            <div>
              <strong>${products.length} marketplace results</strong>
              <span>Vendor verified · protected checkout · quote-safe totals</span>
            </div>
            <div class="catalog-sort">
              <button type="button">Sort: Featured</button>
              <button type="button">Grid</button>
            </div>
          </div>

          <div class="catalog-alert">
            <strong>Buyer protection active</strong>
            <span>Final totals are re-quoted by the backend before payment.</span>
          </div>

          <div class="product-grid catalog-product-grid">
            ${products.map((product) => productCard(product, "catalog-product-card")).join("")}
          </div>
        </div>
      </section>
    </section>
  `;
}

function renderProduct() {
  const product = products[0];
  return `
    <section class="product-detail">
      <div class="gallery-panel">
        <div class="main-product-visual"><span></span></div>
        <div class="thumbnail-row">
          <button class="active" type="button"></button>
          <button type="button"></button>
          <button type="button"></button>
          <button type="button"></button>
          <button type="button"></button>
        </div>
      </div>
      <div class="product-info-panel">
        <span class="eyebrow">Verified vendor</span>
        <h1>${product.name}</h1>
        <div class="rating">★★★★★ ${product.rating} · ${product.reviews} reviews</div>
        <p>${product.desc} Designed for a broad marketplace catalog where users can compare, review vendor trust, and buy with confidence.</p>
        <h3>Choose color</h3>
        <div class="option-grid">
          <button class="active" type="button">Cyan</button>
          <button type="button">Black</button>
          <button type="button">Violet</button>
        </div>
        <h3>Marketplace protections</h3>
        <div class="status-note">Backend quote checks price, stock, shipping, and vendor split before checkout.</div>
      </div>
      <aside class="product-buy-box">
        <span class="price">${money(product.price)}</span>
        <p class="shipping">${product.shipping} · Free returns on eligible vendors</p>
        <div class="qty-row">
          <strong>Quantity</strong>
          <select><option>1</option><option>2</option><option>3</option></select>
        </div>
        <button class="primary-button" type="button" data-add="${product.id}">Add to cart</button>
        <button class="ghost-button" type="button" data-route="cart">View cart</button>
      </aside>
    </section>
  `;
}

function cartGroups() {
  const items = cart.length ? cart : [products[0], products[2], products[7]];
  const groups = new Map();
  items.forEach((product) => {
    if (!groups.has(product.vendor)) groups.set(product.vendor, []);
    groups.get(product.vendor).push(product);
  });
  return [...groups.entries()];
}

function renderCart() {
  const groups = cartGroups();
  const total = groups.flatMap(([, items]) => items).reduce((sum, item) => sum + item.price, 0);
  return `
    <div class="section-head">
      <div>
        <h2>Cart grouped by vendor</h2>
        <p>Vendor grouping is visible before checkout.</p>
      </div>
      <button class="ghost-button" type="button" data-route="catalog">Continue shopping</button>
    </div>
    <section class="cart-layout">
      <div>
        ${groups.map(([vendor, items]) => `
          <article class="cart-group">
            <div class="cart-group-header">
              <strong>${vendor}</strong>
              <span class="badge">vendor order preview</span>
            </div>
            ${items.map((item) => `
              <div class="cart-item">
                <div class="cart-thumb"></div>
                <div>
                  <h3>${item.name}</h3>
                  <p>${item.category} · ${item.shipping}</p>
                </div>
                <strong>${money(item.price)}</strong>
              </div>
            `).join("")}
          </article>
        `).join("")}
      </div>
      <aside class="summary-panel">
        <h3>Backend quote summary</h3>
        <div class="summary-line"><span>Items</span><strong>${money(total)}</strong></div>
        <div class="summary-line"><span>Estimated shipping</span><strong>${money(9.99)}</strong></div>
        <div class="summary-line"><span>Tax estimate</span><strong>${money(total * 0.07)}</strong></div>
        <div class="summary-line total"><span>Total</span><strong>${money(total + 9.99 + total * 0.07)}</strong></div>
        <button class="primary-button" type="button" data-route="checkout">Proceed to checkout</button>
      </aside>
    </section>
  `;
}

function renderCheckout() {
  return `
    <div class="section-head">
      <div>
        <h2>Checkout</h2>
        <p>One customer checkout, multiple vendor orders behind the scenes.</p>
      </div>
    </div>
    <section class="checkout-layout">
      <div>
        <article class="checkout-step">
          <div class="checkout-step-header"><strong>1. Contact and shipping</strong><span class="badge">required</span></div>
          <div class="checkout-step-body field-grid">
            <div class="field"><label>Email</label><input value="customer@example.com" /></div>
            <div class="field"><label>Phone</label><input value="+1 000 000 0000" /></div>
            <div class="field"><label>Address</label><input value="123 Market Street" /></div>
            <div class="field"><label>City</label><input value="Miami" /></div>
          </div>
        </article>
        <article class="checkout-step">
          <div class="checkout-step-header"><strong>2. Payment</strong><span class="badge">provider isolated</span></div>
          <div class="checkout-step-body">
            <div class="status-note">Payment UI remains isolated. Place order requires an Idempotency-Key and fresh backend quote.</div>
          </div>
        </article>
        <article class="checkout-step">
          <div class="checkout-step-header"><strong>3. Review vendor split</strong><span class="badge">quote ready</span></div>
          <div class="checkout-step-body">
            ${cartGroups().map(([vendor, items]) => `
              <div class="summary-line"><span>${vendor} · ${items.length} item(s)</span><strong>${money(items.reduce((s, p) => s + p.price, 0))}</strong></div>
            `).join("")}
          </div>
        </article>
      </div>
      <aside class="summary-panel">
        <h3>Place order</h3>
        <div class="summary-line"><span>Backend quote</span><strong>ready</strong></div>
        <div class="summary-line"><span>Idempotency</span><strong>required</strong></div>
        <div class="summary-line total"><span>Total</span><strong>$138.41</strong></div>
        <button class="primary-button" type="button">Place order securely</button>
      </aside>
    </section>
  `;
}

function render() {
  const routes = {
    home: renderHome,
    catalog: renderCatalog,
    product: renderProduct,
    cart: renderCart,
    checkout: renderCheckout
  };

  app.innerHTML = (routes[currentRoute] || routes.home)();
  cartCount.textContent = String(cart.length);
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  cart.push(product);
  cartCount.textContent = String(cart.length);
}

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    setRoute(routeButton.dataset.route);
    return;
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    addToCart(addButton.dataset.add);
    addButton.textContent = "Added";
    setTimeout(() => {
      addButton.textContent = "Add to cart";
    }, 900);
  }
});

document.querySelector("#searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  setRoute("catalog");
});

const initialRoute = window.location.hash.replace("#", "");
if (["home", "catalog", "product", "cart", "checkout"].includes(initialRoute)) {
  currentRoute = initialRoute;
}

render();
