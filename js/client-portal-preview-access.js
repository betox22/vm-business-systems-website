const portalPreviewGuard = {
  sessionKey: "vm_portal_preview_token",
  infoKey: "vm_portal_preview_info",
};

if (!sessionStorage.getItem(portalPreviewGuard.sessionKey)) {
  window.location.replace("client-portal.html");
}

window.vmPortalPreviewSession = (() => {
  try {
    return JSON.parse(
      sessionStorage.getItem(portalPreviewGuard.infoKey) || "{}",
    );
  } catch {
    return {};
  }
})();
