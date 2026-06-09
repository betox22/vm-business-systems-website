import type { SiteTemplate } from "./types";
import templates from "./all-templates.json";

export const TEMPLATE_REGISTRY = templates as SiteTemplate[];

export function getTemplateById(id: string): SiteTemplate | undefined {
  return TEMPLATE_REGISTRY.find((template) => template.id === id);
}

export function getTemplatesByCategory(category: SiteTemplate["category"]): SiteTemplate[] {
  return TEMPLATE_REGISTRY.filter((template) => template.category === category);
}

export function suggestTemplateFromBusinessType(input: string): SiteTemplate {
  const normalized = input.toLowerCase();

  const rules: Array<{ keywords: string[]; templateId: string }> = [
    { keywords: ["ropa", "fashion", "boutique", "sneaker", "streetwear", "clothing"], templateId: "bold-fashion-store" },
    { keywords: ["joyeria", "jewelry", "perfume", "reloj", "watch", "luxury", "cuero", "leather"], templateId: "luxury-product-store" },
    { keywords: ["curso", "course", "ebook", "template", "software", "digital", "membership"], templateId: "digital-products-store" },
    { keywords: ["electronica", "electronics", "general", "dropshipping", "ferreteria", "home goods"], templateId: "marketplace-style" },
    { keywords: ["limpieza", "cleaning", "plumbing", "electric", "landscaping", "repair", "handyman"], templateId: "local-business-pro" },
    { keywords: ["barber", "salon", "spa", "massage", "clinic", "appointment", "cita"], templateId: "appointment-booking" },
    { keywords: ["law", "abogado", "accounting", "contador", "insurance", "real estate", "consulting"], templateId: "professional-services" },
    { keywords: ["restaurant", "restaurante", "food", "cafe", "bakery", "catering", "food truck"], templateId: "restaurant-food-business" },
    { keywords: ["contractor", "construction", "remodel", "painting", "flooring", "roofing"], templateId: "contractor-before-after" },
    { keywords: ["app", "saas", "startup", "ai", "platform"], templateId: "startup-landing" },
    { keywords: ["coach", "consultant", "freelancer", "speaker", "creator", "personal brand"], templateId: "personal-brand-landing" },
    { keywords: ["event", "webinar", "promo", "launch", "conference"], templateId: "event-promo-landing" }
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return getTemplateById(rule.templateId)!;
    }
  }

  return getTemplateById("minimal-store")!;
}
