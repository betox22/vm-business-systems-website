const GENERIC_VALUES = new Set([
  "product",
  "products",
  "producto",
  "productos",
  "service",
  "services",
  "servicio",
  "servicios",
  "online",
  "website",
  "sitio web",
]);

function cleanList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[,;\n]/);
  return items
    .map((item) => String(item || "").trim())
    .filter((item) => item && !GENERIC_VALUES.has(item.toLowerCase()));
}

export function constructionPreviewModel({
  guidedState = {},
  selection = {},
  backendReadyToGenerate = false,
  isGenerating = false,
  hasCurrentSchema = false,
} = {}) {
  const offers = cleanList(guidedState.servicesProducts);
  const hasCategory = Boolean(
    String(guidedState.industry || "").trim()
    || String(guidedState.businessDescription || "").trim().length >= 32
    || String(guidedState.websiteIntent || "").trim().length >= 32
  );
  const hasConcreteTemplate = Boolean(String(selection.templateId || "").trim());
  const showRealTemplate = hasConcreteTemplate && hasCategory && offers.length >= 2;
  const brandReady = Boolean(
    String(guidedState.businessName || "").trim()
    || String(guidedState.preferredTone || "").trim()
    || cleanList(guidedState.preferredColors).length
  );
  const contentReady = hasCategory && offers.length >= 2;
  const mediaReady = Boolean(
    String(guidedState.logoUrl || "").trim()
    || cleanList(guidedState.photoUrls).length
    || String(guidedState.logoPreference || "").trim()
  );
  const ready = Boolean(backendReadyToGenerate || hasCurrentSchema);
  const completedCount = [brandReady, contentReady, mediaReady, ready].filter(Boolean).length;
  const progress = ready ? 100 : Math.max(12, Math.min(92, completedCount * 23 + (isGenerating ? 8 : 0)));

  return {
    level: showRealTemplate ? 2 : 1,
    mode: showRealTemplate ? "template" : "sketch",
    progress,
    isGenerating: Boolean(isGenerating),
    offers,
    stages: [
      { id: "brand", complete: brandReady, active: !brandReady },
      { id: "content", complete: contentReady, active: brandReady && !contentReady },
      { id: "media", complete: mediaReady, active: contentReady && !mediaReady },
      { id: "ready", complete: ready, active: (mediaReady || isGenerating) && !ready },
    ],
  };
}
