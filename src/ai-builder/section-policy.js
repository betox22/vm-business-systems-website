const REUSABLE_PLANNER_TYPES = new Set([
  "QuoteRequestForm",
  "CapabilitiesEquipment",
  "PortfolioGallery",
  "VideoShowcase",
  "CourseOffering",
]);

export function keepEssentialSections(sections, maxSections) {
  const priority = { Hero: 0, ProductGrid: 1, ServiceList: 2, FeatureBand: 3, Testimonials: 4, About: 5, Gallery: 6, Contact: 7, Footer: 8 };
  const limit = Math.max(3, maxSections);
  const sorted = [...sections].sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
  const selected = sorted.slice(0, limit);

  const preserve = (section) => {
    if (!section || selected.includes(section)) return;
    if (selected.length < limit) {
      selected.push(section);
      return;
    }
    let replaceIndex = -1;
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      const candidate = selected[index];
      if (candidate.type !== "Contact" && !REUSABLE_PLANNER_TYPES.has(candidate.type)) {
        replaceIndex = index;
        break;
      }
    }
    if (replaceIndex >= 0) selected[replaceIndex] = section;
  };

  sections.filter((section) => REUSABLE_PLANNER_TYPES.has(section.type)).forEach(preserve);
  preserve(sections.find((section) => section.type === "Contact"));
  return selected;
}
