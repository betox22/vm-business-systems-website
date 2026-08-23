const INLINE_EDIT_FIELD_CONFIG = Object.freeze({
  badge: Object.freeze({ mode: "single", maxLength: 60, maxLines: 1 }),
  headline: Object.freeze({ mode: "single", maxLength: 140, maxLines: 1 }),
  subtitle: Object.freeze({ mode: "multiline", maxLength: 320, maxLines: 3 }),
  primary_button: Object.freeze({ mode: "single", maxLength: 48, maxLines: 1 }),
  secondary_button: Object.freeze({ mode: "single", maxLength: 48, maxLines: 1 }),
});

const INLINE_EDIT_PLACEHOLDERS = Object.freeze({
  en: Object.freeze({
    badge: "Add a label",
    headline: "Write a headline here",
    subtitle: "Write supporting text here",
    primary_button: "Add button text",
    secondary_button: "Add button text",
  }),
  es: Object.freeze({
    badge: "Agrega una etiqueta",
    headline: "Escribe el titular aqui",
    subtitle: "Escribe el texto de apoyo aqui",
    primary_button: "Agrega el texto del boton",
    secondary_button: "Agrega el texto del boton",
  }),
});

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
