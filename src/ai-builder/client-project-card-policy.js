const PROJECT_STATUS_CLASSES = new Map([
  ["published", "is-published"],
  ["draft", "is-draft"],
]);

export const CLIENT_PROJECT_PREVIEW_TIMEOUT_MS = 7000;

export function clientProjectPreviewPath(projectId) {
  const cleanId = String(projectId || "").trim();
  return cleanId ? `/site.html?site_id=${encodeURIComponent(cleanId)}&embed=project-card` : "";
}

export function isClientProjectPreviewMessage(data) {
  return Boolean(
    data
    && data.type === "kreaton:project-preview"
    && ["ready", "error"].includes(data.status),
  );
}

export function clientProjectStatusClass(status) {
  return PROJECT_STATUS_CLASSES.get(String(status || "draft").trim().toLowerCase()) || "is-draft";
}

export function clientProjectDomain(publicUrl) {
  const cleanUrl = String(publicUrl || "").trim();
  if (!cleanUrl) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch (_error) {
    return cleanUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

export function clientProjectVisualHue(project = {}) {
  const identity = String(project.template_name || project.business_name || project.id || "kreaton");
  let hash = 0;
  for (const character of identity) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}
