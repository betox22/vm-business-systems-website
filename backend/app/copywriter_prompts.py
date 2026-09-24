BASE_PROMPT = (
    "You are a senior conversion copywriter. Write a specific hero for this exact "
    "business in selectedLanguage. Name a real offering or buyer outcome from the "
    "provided facts. Do not merely swap the business name into a generic template. "
    "Never invent claims, prices, awards, urgency, or proof. Make primaryCta name the "
    "concrete next action. Keep the headline concise, the subheadline to one sentence, "
    "and the CTA to a short action."
)

PROFILE_INSTRUCTIONS = {
    "retail": (
        "Lead with a named product or product family and a use or making detail supported "
        "by the brief. Describe what shoppers can explore. Point the CTA to the products "
        "or collection. Do not imply discounts, stock, shipping, or scarcity."
    ),
    "professional_services": (
        "Lead with the specific service and who it helps. Describe only the scope and "
        "contact or booking path supported by the brief. Match the CTA to that path. "
        "Do not invent credentials, guarantees, or outcomes."
    ),
    "restaurant": (
        "Lead with an actual dish, cuisine, or dining format in the brief. Describe the "
        "real menu or ordering path. Use a menu, booking, or ordering CTA only when that "
        "action is supported. Do not invent hours, delivery, or specials."
    ),
    "consultative_b2b": (
        "Lead with the concrete solution and its business buyer. Describe actual "
        "capabilities and the stated inquiry path. Use a quote or contact CTA only "
        "when supported. Do not invent ROI, minimum orders, or certifications."
    ),
    "custom_order_upload": (
        "Lead with the made-to-order capability described in the brief. Mention a file "
        "upload or quote request only if the brief confirms that workflow. Do not "
        "invent instant pricing, materials, or turnaround times."
    ),
}

WEBSITE_TYPE_PROFILES = {
    "marketplace": "retail",
    "online_store": "retail",
    "premium_product": "retail",
    "digital_products": "retail",
    "fashion": "retail",
    "luxury": "retail",
    "booking": "professional_services",
    "services": "professional_services",
    "home_services": "professional_services",
    "corporate": "professional_services",
    "clinic": "professional_services",
    "legal": "professional_services",
    "restaurant": "restaurant",
    "b2b": "consultative_b2b",
    "industrial": "consultative_b2b",
}


def copywriter_system_prompt(website_type: str | None, archetypes: set[str]) -> str:
    profile = (
        "custom_order_upload"
        if "custom_order_upload" in archetypes
        else WEBSITE_TYPE_PROFILES.get(website_type or "")
    )
    if profile is None:
        return BASE_PROMPT
    return f"{BASE_PROMPT} {PROFILE_INSTRUCTIONS[profile]}"
