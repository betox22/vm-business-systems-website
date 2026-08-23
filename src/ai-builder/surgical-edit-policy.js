const COLOR_VALUES = Object.freeze({
  azul: "#2563eb",
  blue: "#2563eb",
  rojo: "#dc2626",
  red: "#dc2626",
  verde: "#16a34a",
  green: "#16a34a",
  morado: "#7c3aed",
  purple: "#7c3aed",
  violeta: "#7c3aed",
  violet: "#7c3aed",
  negro: "#111827",
  black: "#111827",
  blanco: "#ffffff",
  white: "#ffffff",
  amarillo: "#eab308",
  yellow: "#eab308",
  naranja: "#f97316",
  orange: "#f97316",
  rosa: "#ec4899",
  pink: "#ec4899",
});

const TEXT_FIELD_PATTERN = /\b(texto|text|copy|titulo|title|headline|subtitulo|subtitle|slogan|frase|descripcion|description)\b/;
const PRODUCT_PATTERN = /\b(producto|productos|product|item|articulo|servicio|service)\b/;
const IMAGE_PATTERN = /\b(imagen|image|foto|photo|fotografia|picture)\b/;
const COLOR_PATTERN = /\b(color|colores|paleta|azul|blue|rojo|red|verde|green|morado|purple|violeta|violet|negro|black|blanco|white|amarillo|yellow|naranja|orange|rosa|pink)\b/;

export function detectSurgicalEditIntent(instruction = "", schema = {}) {
  const text = normalizeEditText(instruction);
  const productIndex = matchingProductIndex(text, schema);
  const sectionTarget = matchingSectionTarget(text, schema) || defaultHeroTarget(schema);

  if (/\b(logo|logotipo|marca grafica|brand mark)\b/.test(text)) {
    return { kind: "logo", field: "logo", confidence: 0.98 };
  }
  if (IMAGE_PATTERN.test(text)) {
    return {
      kind: "image",
      field: "image_url",
      productIndex,
      sectionTarget: productIndex >= 0 ? null : sectionTarget,
      confidence: 0.97,
    };
  }
  if (COLOR_PATTERN.test(text)) {
    return { kind: "color", field: requestedColorField(text), confidence: 0.98 };
  }
  if (PRODUCT_PATTERN.test(text)) {
    return {
      kind: "product",
      field: requestedProductField(text),
      productIndex,
      confidence: productIndex >= 0 ? 0.95 : 0.7,
    };
  }
  if (TEXT_FIELD_PATTERN.test(text)) {
    return {
      kind: "section_text",
      field: requestedTextField(text),
      sectionTarget,
      confidence: sectionTarget ? 0.94 : 0.7,
    };
  }
  if (/\b(plantilla|template|layout|estructura|redisena|redesign|overlap|superpuest|encim|solap|cortad|clipping|espaciado|spacing)\b/.test(text)) {
    return { kind: "layout", confidence: 0.9 };
  }
  return { kind: "unknown", confidence: 0 };
}

export function applySurgicalSchemaEdit(schema = {}, instruction = "") {
  const nextSchema = structuredClone(schema);
  const intent = detectSurgicalEditIntent(instruction, nextSchema);
  const changedPaths = [];
  const replacement = extractReplacement(instruction);

  if (intent.kind === "color") {
    const color = extractColor(instruction);
    if (color) {
      const previousColor = nextSchema.theme?.colors?.[intent.field];
      nextSchema.theme = { ...(nextSchema.theme || {}) };
      nextSchema.theme.colors = { ...(nextSchema.theme.colors || {}), [intent.field]: color };
      changedPaths.push(`/theme/colors/${intent.field}`);
      const brandField = {
        primary: "primaryColor",
        secondary: "secondaryColor",
        accent: "accentColor",
        background: "backgroundColor",
        text: "textColor",
      }[intent.field];
      if (brandField && [undefined, "", previousColor].includes(nextSchema.brand?.[brandField])) {
        nextSchema.brand = { ...(nextSchema.brand || {}), [brandField]: color };
        changedPaths.push(`/brand/${brandField}`);
      }
      if (intent.field === "primary" && [undefined, "", previousColor].includes(nextSchema.brand?.buttonColor)) {
        nextSchema.brand = { ...(nextSchema.brand || {}), buttonColor: color };
        changedPaths.push("/brand/buttonColor");
      }
    }
  } else if (intent.kind === "section_text" && intent.sectionTarget && replacement) {
    const section = sectionAt(nextSchema, intent.sectionTarget);
    if (section) {
      section.editable = { ...(section.editable || {}), [intent.field]: replacement };
      changedPaths.push(`/pages/${intent.sectionTarget.pageIndex}/sections/${intent.sectionTarget.sectionIndex}/editable/${intent.field}`);
    }
  } else if (intent.kind === "product" && intent.productIndex >= 0 && replacement) {
    const item = nextSchema.catalog_items?.[intent.productIndex];
    if (item && typeof item === "object") {
      item[intent.field] = intent.field === "price" ? numericPrice(replacement, item.price) : replacement;
      changedPaths.push(`/catalog_items/${intent.productIndex}/${intent.field}`);
    }
  } else if (intent.kind === "image") {
    const imageUrl = extractImageUrl(instruction);
    if (imageUrl && intent.productIndex >= 0) {
      const item = nextSchema.catalog_items?.[intent.productIndex];
      if (item && typeof item === "object") {
        item.image_url = imageUrl;
        changedPaths.push(`/catalog_items/${intent.productIndex}/image_url`);
      }
    } else if (imageUrl && intent.sectionTarget) {
      const section = sectionAt(nextSchema, intent.sectionTarget);
      if (section) {
        section.editable = { ...(section.editable || {}), image_url: imageUrl };
        changedPaths.push(`/pages/${intent.sectionTarget.pageIndex}/sections/${intent.sectionTarget.sectionIndex}/editable/image_url`);
      }
    }
  }

  return { schema: nextSchema, intent, changedPaths };
}

function normalizeEditText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function requestedColorField(text) {
  if (/\b(fondo|background)\b/.test(text)) return "background";
  if (/\b(acento|accent)\b/.test(text)) return "accent";
  if (/\b(secundari[oa]|secondary)\b/.test(text)) return "secondary";
  if (/\b(texto|text)\b/.test(text)) return "text";
  return "primary";
}

function requestedTextField(text) {
  if (/\b(subtitulo|subtitle)\b/.test(text)) return "subtitle";
  if (/\b(titulo|title|headline|slogan)\b/.test(text)) return "headline";
  if (/\b(descripcion|description)\b/.test(text)) return "description";
  return "text";
}

function requestedProductField(text) {
  if (/\b(precio|price)\b/.test(text)) return "price";
  if (/\b(categoria|category)\b/.test(text)) return "category";
  if (/\b(descripcion|description)\b/.test(text)) return "description";
  return "name";
}

function extractColor(instruction) {
  const hex = String(instruction || "").match(/#[0-9a-f]{6}\b/i)?.[0];
  if (hex) return hex.toLowerCase();
  const text = normalizeEditText(instruction);
  return Object.entries(COLOR_VALUES).find(([name]) => new RegExp(`\\b${name}\\b`).test(text))?.[1] || "";
}

function extractImageUrl(instruction) {
  return String(instruction || "").match(/https?:\/\/[^\s"'<>]+/i)?.[0] || "";
}

function extractReplacement(instruction) {
  const value = String(instruction || "").trim();
  const quoted = [...value.matchAll(/["“”']([^"“”']{2,240})["“”']/g)];
  if (quoted.length) return quoted.at(-1)[1].trim();
  const match = value.match(/(?:\s(?:por|a|to)\s+|:\s*)([^:]{2,240})$/i);
  return match?.[1]?.replace(/[.!]+$/, "").trim() || "";
}

function matchingProductIndex(text, schema) {
  const catalog = Array.isArray(schema.catalog_items) ? schema.catalog_items : [];
  for (let index = 0; index < catalog.length; index += 1) {
    const name = normalizeEditText(catalog[index]?.name);
    const tokens = name.split(" ").filter((token) => token.length >= 4);
    if (name && (text.includes(name) || (tokens.length && tokens.every((token) => text.includes(token))))) return index;
  }
  return catalog.length === 1 ? 0 : -1;
}

function matchingSectionTarget(text, schema) {
  const groups = [
    { terms: ["hero", "portada", "principal", "inicio", "home"], types: ["hero"] },
    { terms: ["about", "nosotros", "historia", "story", "quienes somos"], types: ["about", "story"] },
    { terms: ["contact", "contacto"], types: ["contact"] },
    { terms: ["faq", "preguntas", "frecuentes"], types: ["faq"] },
    { terms: ["producto", "productos", "catalogo", "tienda", "shop"], types: ["product", "catalog", "collection"] },
    { terms: ["servicio", "servicios", "service"], types: ["service"] },
    { terms: ["galeria", "gallery", "portfolio"], types: ["gallery", "portfolio"] },
  ];
  const requested = groups.find((group) => group.terms.some((term) => text.includes(term)));
  if (!requested) return null;
  for (let pageIndex = 0; pageIndex < (schema.pages || []).length; pageIndex += 1) {
    const sections = schema.pages[pageIndex]?.sections || [];
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const haystack = normalizeEditText(`${sections[sectionIndex]?.type || ""} ${sections[sectionIndex]?.id || ""}`);
      if (requested.types.some((type) => haystack.includes(type))) return { pageIndex, sectionIndex };
    }
  }
  return null;
}

function defaultHeroTarget(schema) {
  for (let pageIndex = 0; pageIndex < (schema.pages || []).length; pageIndex += 1) {
    const sections = schema.pages[pageIndex]?.sections || [];
    const sectionIndex = sections.findIndex((section) => normalizeEditText(section?.type).includes("hero"));
    if (sectionIndex >= 0) return { pageIndex, sectionIndex };
  }
  return null;
}

function sectionAt(schema, target) {
  return schema.pages?.[target.pageIndex]?.sections?.[target.sectionIndex] || null;
}

function numericPrice(value, fallback) {
  const parsed = Number(String(value || "").replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}
