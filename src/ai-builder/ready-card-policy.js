export function shouldShowReadyCard({ guidedStep, isGeneratingWebsite, currentSchema }) {
  return guidedStep === "review" && !isGeneratingWebsite && !currentSchema;
}

export function removeReadyCard(chat) {
  chat?.querySelectorAll(".luma-ready-card").forEach((card) => card.remove());
}
