const portalPreviewGuard = {
  sessionKey: "vm_portal_preview_token",
  infoKey: "vm_portal_preview_info",
};

const storedPreviewToken =
  sessionStorage.getItem(portalPreviewGuard.sessionKey) ||
  localStorage.getItem(portalPreviewGuard.sessionKey) ||
  "";
const storedPreviewInfo =
  sessionStorage.getItem(portalPreviewGuard.infoKey) ||
  localStorage.getItem(portalPreviewGuard.infoKey) ||
  "{}";

if (storedPreviewToken) {
  sessionStorage.setItem(portalPreviewGuard.sessionKey, storedPreviewToken);
  sessionStorage.setItem(portalPreviewGuard.infoKey, storedPreviewInfo);
}

if (!storedPreviewToken) {
  window.location.replace("client-portal.html");
}

window.vmPortalPreviewSession = (() => {
  try {
    return JSON.parse(storedPreviewInfo);
  } catch {
    return {};
  }
})();
