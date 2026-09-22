const composedSectionCache = new Map();
const pendingSectionLoads = new Map();

function sectionIds(schema) {
  return [...new Set((schema.pages || [])
    .flatMap((page) => page.sections || [])
    .filter((section) => section.type === "composed")
    .map((section) => section.section_id))];
}

export function hasUnloadedComposedSections(schema) {
  return sectionIds(schema).some((sectionId) => !composedSectionCache.has(sectionId));
}

async function loadComposedSection(sectionId) {
  if (composedSectionCache.has(sectionId)) return;
  if (pendingSectionLoads.has(sectionId)) return pendingSectionLoads.get(sectionId);
  if (typeof sectionId !== "string" || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(sectionId)) {
    composedSectionCache.set(sectionId, null);
    return;
  }
  const loading = (async () => {
    const base = `/templates/sections/${sectionId}/`;
    try {
      const manifestResponse = await fetch(`${base}manifest.json`);
      if (!manifestResponse.ok) throw new Error(`Manifest ${manifestResponse.status}`);
      const manifest = await manifestResponse.json();
      if (manifest.id !== sectionId || manifest.section_type === "quote_upload"
        || manifest.html_partial !== `${sectionId}/section.html`
        || manifest.css_partial !== `${sectionId}/section.css`) throw new Error("Unsupported section manifest");
      const [htmlResponse, cssResponse] = await Promise.all([
        fetch(`/templates/sections/${manifest.html_partial}`),
        fetch(`/templates/sections/${manifest.css_partial}`),
      ]);
      if (!htmlResponse.ok || !cssResponse.ok) throw new Error("Section partial unavailable");
      const [html, css] = await Promise.all([htmlResponse.text(), cssResponse.text()]);
      composedSectionCache.set(sectionId, { manifest, html });
      const style = document.createElement("style");
      style.dataset.composedSection = sectionId;
      style.textContent = `@scope ([data-composed-section="${sectionId}"]) {${css}}`;
      document.head.appendChild(style);
    } catch (error) {
      composedSectionCache.set(sectionId, null);
      console.warn(`Composed section unavailable: ${sectionId}`, error);
    }
  })();
  pendingSectionLoads.set(sectionId, loading);
  try {
    await loading;
  } finally {
    pendingSectionLoads.delete(sectionId);
  }
}

export async function preloadComposedSections(schema) {
  await Promise.all(sectionIds(schema).map(loadComposedSection));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function renderComposedSection(section) {
  const sectionId = section.section_id;
  const cached = composedSectionCache.get(sectionId);
  if (!cached) return "";
  const copy = section.copy_bindings || {};
  const images = section.image_bindings || {};
  const required = cached.manifest.required_copy_fields || [];
  if (required.some((field) => typeof copy[field] !== "string")) return "";
  const imageSlots = new Set((cached.manifest.image_slots || []).map((slot) => slot.slot_id));
  let invalid = false;
  const html = cached.html.replace(/\{\{([^{}]+)\}\}/g, (_, field) => {
    if (imageSlots.has(field)) {
      const url = images[field];
      if (typeof url !== "string" || !/^(https?:\/\/|\/[^/])/i.test(url)) {
        invalid = true;
        return "";
      }
      return escapeAttribute(url);
    }
    if (typeof copy[field] !== "string") {
      invalid = true;
      return "";
    }
    return escapeHtml(copy[field]);
  });
  if (invalid) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || (["href", "src", "action"].includes(attribute.name)
        && /^\s*(?:javascript:|data:)/i.test(attribute.value))) node.removeAttribute(attribute.name);
    }
  });
  return `<div data-composed-section="${escapeAttribute(sectionId)}">${template.innerHTML}</div>`;
}
