const INLINE_EDIT_FIELD_CONFIG = Object.freeze({
  badge: Object.freeze({ mode: "single", maxLength: 60, maxLines: 1 }),
  headline: Object.freeze({ mode: "single", maxLength: 140, maxLines: 1 }),
  subtitle: Object.freeze({ mode: "multiline", maxLength: 320, maxLines: 3 }),
  primary_button: Object.freeze({ mode: "single", maxLength: 48, maxLines: 1 }),
  secondary_button: Object.freeze({ mode: "single", maxLength: 48, maxLines: 1 }),
  title: Object.freeze({ mode: "single", maxLength: 140, maxLines: 1 }),
  text: Object.freeze({ mode: "multiline", maxLength: 520, maxLines: 6 }),
  item_title: Object.freeze({ mode: "single", maxLength: 120, maxLines: 1 }),
  item_description: Object.freeze({ mode: "multiline", maxLength: 360, maxLines: 4 }),
  faq_question: Object.freeze({ mode: "single", maxLength: 180, maxLines: 1 }),
  faq_answer: Object.freeze({ mode: "multiline", maxLength: 520, maxLines: 6 }),
  product_name: Object.freeze({ mode: "single", maxLength: 120, maxLines: 1 }),
  product_description: Object.freeze({ mode: "multiline", maxLength: 420, maxLines: 5 }),
  nav_label: Object.freeze({ mode: "single", maxLength: 40, maxLines: 1 }),
  footer_text: Object.freeze({ mode: "single", maxLength: 180, maxLines: 1 }),
  contact_value: Object.freeze({ mode: "single", maxLength: 180, maxLines: 1 }),
});

const INLINE_EDIT_PLACEHOLDERS = Object.freeze({
  en: Object.freeze({
    badge: "Add a label",
    headline: "Write a headline here",
    subtitle: "Write supporting text here",
    primary_button: "Add button text",
    secondary_button: "Add button text",
    title: "Write a section title",
    text: "Write section copy here",
    item_title: "Write an item title",
    item_description: "Write an item description",
    faq_question: "Write a question",
    faq_answer: "Write an answer",
    product_name: "Write a product or service name",
    product_description: "Write a product or service description",
    nav_label: "Write a navigation label",
    footer_text: "Write footer text",
    contact_value: "Add contact information",
  }),
  es: Object.freeze({
    badge: "Agrega una etiqueta",
    headline: "Escribe el titular aqui",
    subtitle: "Escribe el texto de apoyo aqui",
    primary_button: "Agrega el texto del boton",
    secondary_button: "Agrega el texto del boton",
    title: "Escribe el titulo de la seccion",
    text: "Escribe el contenido de la seccion",
    item_title: "Escribe el titulo del elemento",
    item_description: "Escribe la descripcion del elemento",
    faq_question: "Escribe una pregunta",
    faq_answer: "Escribe una respuesta",
    product_name: "Escribe el nombre del producto o servicio",
    product_description: "Escribe la descripcion del producto o servicio",
    nav_label: "Escribe la etiqueta de navegacion",
    footer_text: "Escribe el texto del pie de pagina",
    contact_value: "Agrega la informacion de contacto",
  }),
});

const INLINE_EDITABLE_SHARED_SHELL_TEMPLATE_IDS = new Set([
  "premium-product-store",
  "luxury-high-ticket-pro",
  "education-course-academy-pro",
  "medical-wellness-clinic-pro",
  "legal-professional-services-pro",
  "manufacturing-industrial-supplier-pro",
  "mega-marketplace",
  "listing-marketplace-pro",
  "fashion-drop-pro",
  "corporate-company-pro",
  "lead-funnel-pro",
  "restaurant-food-business",
  "digital-products-store",
  "real-estate-listings-pro",
  "home-services-premium",
  "local-services-pro-plus",
  "booking-appointment-pro",
]);

export function supportsSharedShellInlineEditing(templateId = "") {
  return INLINE_EDITABLE_SHARED_SHELL_TEMPLATE_IDS.has(String(templateId || ""));
}

export function inlineEditConfig(field) {
  return INLINE_EDIT_FIELD_CONFIG[field] || null;
}

export function inlineEditPlaceholder(field, language = "en") {
  const locale = String(language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  return INLINE_EDIT_PLACEHOLDERS[locale][field] || INLINE_EDIT_PLACEHOLDERS[locale].headline;
}

export function inlineEditPath(schema, section, field) {
  if (!inlineEditConfig(field)) return "";
  const pages = Array.isArray(schema?.pages) ? schema.pages : [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const sections = Array.isArray(pages[pageIndex]?.sections) ? pages[pageIndex].sections : [];
    const sectionIndex = sections.findIndex((candidate) => (
      candidate === section ||
      (candidate?.id && section?.id && candidate.id === section.id)
    ));
    if (sectionIndex >= 0) {
      return `pages.${pageIndex}.sections.${sectionIndex}.editable.${field}`;
    }
  }
  return "";
}

export function inlineEditSectionItemPath(schema, section, itemIndex, field) {
  return inlineEditSectionCollectionItemPath(schema, section, "items", itemIndex, field);
}

export function inlineEditSectionCollectionItemPath(schema, section, collection, itemIndex, field) {
  const sectionPath = inlineEditPath(schema, section, "title").replace(/\.title$/, "");
  const index = Number(itemIndex);
  if (
    !sectionPath
    || !["items", "includes", "fields"].includes(collection)
    || !Number.isInteger(index)
    || index < 0
    || !["", "question", "answer", "name", "title", "description", "label"].includes(field)
  ) return "";
  return `${sectionPath}.${collection}.${index}${field ? `.${field}` : ""}`;
}

export function inlineEditCatalogPath(schema, item, field) {
  if (!["name", "description", "category", "button_label"].includes(field)) return "";
  for (const collection of ["catalog_items", "products_services"]) {
    const items = Array.isArray(schema?.[collection]) ? schema[collection] : [];
    const index = items.findIndex((candidate) => candidate === item || (candidate?.id && item?.id && candidate.id === item.id));
    if (index >= 0) return `${collection}.${index}.${field}`;
  }
  return "";
}

export function inlineEditNavigationPath(schema, item) {
  const items = Array.isArray(schema?.navigation) ? schema.navigation : [];
  const index = items.findIndex((candidate) => candidate === item || (
    candidate?.page_key && item?.page_key && candidate.page_key === item.page_key
  ));
  return index >= 0 ? `navigation.${index}.label` : "";
}

export function inlineEditPageTitlePath(schema, page) {
  const pages = Array.isArray(schema?.pages) ? schema.pages : [];
  const index = pages.findIndex((candidate) => candidate === page || (
    candidate?.page_key && page?.page_key && candidate.page_key === page.page_key
  ));
  return index >= 0 ? `pages.${index}.title` : "";
}

export function inlineEditPersistentPath(path, field) {
  if (!inlineEditConfig(field)) return "";
  const value = String(path || "");
  const allowed = [
    /^pages\.\d+\.sections\.\d+\.editable\.(?:badge|headline|subtitle|primary_button|secondary_button|title|text|audience|description|ctaLabel)$/,
    /^pages\.\d+\.sections\.\d+\.editable\.items\.\d+\.(?:question|answer|name|title|description)$/,
    /^pages\.\d+\.sections\.\d+\.editable\.items\.\d+$/,
    /^pages\.\d+\.sections\.\d+\.editable\.includes\.\d+$/,
    /^pages\.\d+\.sections\.\d+\.editable\.fields\.\d+\.label$/,
    /^(?:catalog_items|products_services)\.\d+\.(?:name|description|category|button_label)$/,
    /^navigation\.\d+\.label$/,
    /^pages\.\d+\.title$/,
    /^global_components\.footer_text$/,
    /^contact\.[A-Za-z0-9_-]+$/,
  ];
  return allowed.some((pattern) => pattern.test(value)) ? value : "";
}

export function normalizeInlineEditText(value, config = {}, fallback = "") {
  const mode = config.mode === "multiline" ? "multiline" : "single";
  const maxLength = Math.max(1, Number(config.maxLength) || 320);
  const maxLines = Math.max(1, Number(config.maxLines) || 1);
  const normalize = (input) => {
    const raw = String(input || "").replace(/\r\n?/g, "\n");
    if (mode === "single") return raw.replace(/\s+/g, " ").trim().slice(0, maxLength).trim();
    return raw
      .split("\n")
      .map((line) => line.replace(/[\t\f\v ]+/g, " ").trim())
      .filter(Boolean)
      .slice(0, maxLines)
      .join("\n")
      .slice(0, maxLength)
      .trim();
  };
  return normalize(value) || normalize(fallback);
}

export function inlineEditEnterAction(config = {}, event = {}, currentText = "", selectedText = "") {
  if (config.mode !== "multiline" || event.ctrlKey || event.metaKey) return "commit";
  const lineCount = String(currentText || "").replace(/\r\n?/g, "\n").split("\n").length;
  if (lineCount >= Math.max(1, Number(config.maxLines) || 1) && !String(selectedText).includes("\n")) {
    return "block";
  }
  return "newline";
}

export function constrainInlinePaste(value, config = {}, availableLength = Infinity) {
  let result = String(value || "").replace(/\r\n?/g, "\n");
  if (config.mode !== "multiline") result = result.replace(/\s+/g, " ");
  else result = result.split("\n").slice(0, Math.max(1, Number(config.maxLines) || 1)).join("\n");
  return result.slice(0, Math.max(0, Number(availableLength)));
}

// Stage 1 compatibility aliases while the editor migrates to the generic contract.
export const inlineHeroEditPath = inlineEditPath;
export function normalizeInlineHeroText(value, fallback = "") {
  return normalizeInlineEditText(value, inlineEditConfig("headline"), fallback);
}
