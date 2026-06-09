const promptInput = document.querySelector("#promptInput");
const detectButton = document.querySelector("#detectButton");
const openBuilderButton = document.querySelector("#openBuilderButton");
const resultMeta = document.querySelector("#resultMeta");
const previewMount = document.querySelector("#previewMount");
const templateGrid = document.querySelector("#templateGrid");
const statusNote = document.querySelector("#statusNote");
let currentSelection = null;

const rendererMap = {
  dense_marketplace_catalog: "MarketplaceCatalog",
  listing_marketplace_catalog: "ClassifiedMarketplaceCatalog",
  editorial_minimal_grid: "MinimalProductGrid",
  lookbook_collection_catalog: "FashionLookbookCatalog",
  luxury_gallery_catalog: "LuxuryGalleryCatalog",
  digital_offer_catalog: "DigitalOfferCatalog",
  menu_catalog: "RestaurantMenuCatalog",
  online_ordering_catalog: "RestaurantOrderingCatalog",
  booking_menu_catalog: "BookingMenuCatalog",
  service_area_catalog: "LocalServiceCatalog",
  practice_area_catalog: "ProfessionalServicesCatalog",
  project_gallery_catalog: "BeforeAfterProjectCatalog",
  pricing_plan_catalog: "PricingPlanCatalog",
  ticket_or_offer_catalog: "EventTicketCatalog",
  service_package_catalog: "PersonalBrandServicesCatalog",
};

detectButton.addEventListener("click", () => runDetection(promptInput.value));
openBuilderButton.addEventListener("click", () => openBuilderWithPrompt());
promptInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runDetection(promptInput.value);
});

init();

async function init() {
  try {
    const templates = await window.TemplateRouter.loadTemplates();
    statusNote.textContent = `${templates.length} templates cargados. Puedes escoger uno o dejar que AI seleccione.`;
    templateGrid.innerHTML = templates.map(renderTemplateCard).join("");
    templateGrid.querySelectorAll("[data-template-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        promptInput.value = button.dataset.templatePrompt;
        runDetection(promptInput.value);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
    templateGrid.querySelectorAll("[data-open-template]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openBuilderWithPrompt(link.dataset.templateId);
      });
    });
    runDetection(promptInput.value);
  } catch (error) {
    statusNote.innerHTML = `<span class="error-note">No se pudieron cargar los templates:</span> ${escapeHtml(error.message)}`;
    templateGrid.innerHTML = "";
  }
}

async function runDetection(prompt) {
  const selection = await window.TemplateRouter.selectTemplateFromPrompt(prompt);
  currentSelection = selection;
  const renderer = rendererMap[selection.catalogType] || "MinimalProductGrid";
  highlightTemplate(selection.templateId);
  resultMeta.innerHTML = `
    <div><strong>Intent detectado</strong><br>${escapeHtml(selection.intent)}</div>
    <div><strong>Template seleccionado</strong><br>${escapeHtml(selection.templateId)} · ${escapeHtml(selection.template?.name || "")}</div>
    <div><strong>catalogType</strong><br>${escapeHtml(selection.catalogType)}</div>
    <div><strong>Renderer usado</strong><br>${escapeHtml(renderer)}</div>
    <div><strong>Motivo</strong><br>${escapeHtml(selection.reason)}</div>
  `;
  previewMount.innerHTML = renderTemplatePreview(selection, renderer);
}

function openBuilderWithPrompt(forcedTemplateId = "") {
  const selection = currentSelection || {};
  const templateId = forcedTemplateId || selection.templateId || "";
  const params = new URLSearchParams({
    guided: "1",
    prompt: promptInput.value.trim(),
  });
  if (templateId) params.set("templateId", templateId);
  if (selection.catalogType) params.set("catalogType", selection.catalogType);
  if (selection.intent) params.set("intent", selection.intent);
  window.location.href = `/client/setup/?${params.toString()}`;
}

function highlightTemplate(templateId) {
  templateGrid.querySelectorAll(".template-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.templateId === templateId);
  });
}

function renderTemplateCard(template) {
  const card = template.clientSelectionCard || {};
  const tags = card.previewTags || [];
  const prompt = examplePromptForTemplate(template);
  return `<article class="template-card" data-template-id="${escapeAttribute(template.id)}">
    <small>${escapeHtml(template.category || card.category || "")}</small>
    <h3>${escapeHtml(template.name)}</h3>
    <p><strong>Best for:</strong> ${escapeHtml(card.bestForLabel || (template.bestFor || []).join(", "))}</p>
    <p>${escapeHtml(template.visualDifference || card.difference || "")}</p>
    <p><strong>Feeling:</strong> ${escapeHtml(template.catalogModel?.customerFeeling || "")}</p>
    <div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <button type="button" data-template-prompt="${escapeAttribute(prompt)}">Probar este estilo</button>
    <a href="/client/setup/" data-open-template="1" data-template-id="${escapeAttribute(template.id)}">Usar y generar</a>
  </article>`;
}

function renderTemplatePreview(selection, renderer) {
  const template = selection.template || {};
  const sections = template.sections || [];
  const pages = template.pages || [];
  return `<div class="test-panel">
    <h2>${escapeHtml(template.name || selection.templateId)}</h2>
    <p>${escapeHtml(template.visualDifference || "")}</p>
    <p><strong>${escapeHtml(renderer)}</strong> · ${escapeHtml(selection.catalogType)}</p>
    <div class="tag-row">${(template.catalogModel?.filters || []).map((filter) => `<span>${escapeHtml(filter)}</span>`).join("")}</div>
    <h3>Vista de estructura</h3>
    <div class="meta-list">
      ${pages.map((page) => `<div><strong>${escapeHtml(page.name || page.title || "Page")}</strong><br>${escapeHtml(page.purpose || page.layout || "")}</div>`).join("")}
      ${sections.slice(0, 8).map((section) => `<div><strong>${escapeHtml(section.type)}</strong><br>${escapeHtml(JSON.stringify(section.fields || {}).slice(0, 160))}</div>`).join("")}
    </div>
  </div>`;
}

function examplePromptForTemplate(template) {
  const examples = {
    "marketplace-style": "quiero algo tipo amazon con muchas categorias",
    "classified-marketplace": "quiero algo tipo ebay con productos usados",
    "restaurant-food-business": "quiero una pagina para restaurante con menu",
    "appointment-booking": "quiero una barberia con citas",
    "digital-products-store": "quiero vender cursos digitales",
    "bold-fashion-store": "quiero una boutique tipo nike",
    "luxury-product-store": "quiero una tienda de lujo de joyeria",
    "contractor-before-after": "quiero una web de contractor con antes y despues",
  };
  return examples[template.id] || `quiero usar ${template.name}`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
