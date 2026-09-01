const PILOT_TEMPLATES = new Set([
  "mega-retail-store",
  "b2b-saas-enterprise-pro",
]);

const DEFAULT_GSAP_URL = "/vendor/gsap.min.js?v=3.13.0";
let gsapLoadPromise = null;

export function supportsSharedSiteMotion(templateId = "") {
  return PILOT_TEMPLATES.has(String(templateId || "").trim().toLowerCase());
}

export function normalizeSectionMotion(motion = {}) {
  const animate = motion?.animate === true;
  const conversionGoal = String(motion?.conversionGoal || "").trim();
  const trigger = String(motion?.trigger || "none");
  const target = String(motion?.target || "none");
  const treatment = String(motion?.treatment || "static");
  const valid = animate
    && conversionGoal
    && conversionGoal.toLowerCase() !== "none"
    && ["load", "scroll", "interaction"].includes(trigger)
    && ["headline_and_cta", "section_content", "primary_cta"].includes(target)
    && ["hero_enter", "reveal_up", "stagger_cards", "cta_emphasis"].includes(treatment);
  return valid
    ? { animate: true, conversionGoal, trigger, target, treatment }
    : { animate: false, conversionGoal: "none", trigger: "none", target: "none", treatment: "static" };
}

export function motionDataAttributes(motion = {}) {
  const plan = normalizeSectionMotion(motion);
  if (!plan.animate) return "";
  return [
    'data-motion-enabled="true"',
    `data-motion-trigger="${escapeAttribute(plan.trigger)}"`,
    `data-motion-target="${escapeAttribute(plan.target)}"`,
    `data-motion-treatment="${escapeAttribute(plan.treatment)}"`,
    `data-motion-goal="${escapeAttribute(plan.conversionGoal)}"`,
  ].join(" ");
}

export function isMotionInteractionBlocked(element) {
  return Boolean(element?.isContentEditable || element?.closest?.('[contenteditable="true"], .is-inline-editing'));
}

export function createSharedSiteMotion({
  root,
  templateId,
  assetUrl = DEFAULT_GSAP_URL,
  windowRef = window,
  documentRef = document,
} = {}) {
  const cleanup = [];
  let destroyed = false;
  const controller = {
    active: false,
    ready: Promise.resolve(false),
    destroy() {
      destroyed = true;
      cleanup.splice(0).forEach((dispose) => dispose());
      controller.active = false;
    },
  };

  const reducedMotion = windowRef.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const hasMotion = Boolean(root?.querySelector?.('[data-motion-enabled="true"]'));
  if (!root || !supportsSharedSiteMotion(templateId) || reducedMotion || !hasMotion) return controller;

  controller.ready = loadGsap({ assetUrl, windowRef, documentRef })
    .then((gsap) => {
      if (destroyed || !gsap) return false;
      controller.active = true;
      bindSectionAnimations({ root, gsap, windowRef, cleanup });
      bindInteractionFeedback({ root, gsap, windowRef, cleanup });
      return true;
    })
    .catch((error) => {
      console.warn("KREATON motion stayed static because GSAP could not load", error);
      return false;
    });
  return controller;
}

function loadGsap({ assetUrl, windowRef, documentRef }) {
  if (windowRef.gsap) return Promise.resolve(windowRef.gsap);
  if (gsapLoadPromise) return gsapLoadPromise;
  gsapLoadPromise = new Promise((resolve, reject) => {
    const existing = documentRef.querySelector?.('script[data-kreaton-gsap="true"]');
    const script = existing || documentRef.createElement("script");
    const onLoad = () => windowRef.gsap ? resolve(windowRef.gsap) : reject(new Error("GSAP loaded without a global API"));
    const onError = () => reject(new Error(`Could not load ${assetUrl}`));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = assetUrl;
      script.async = true;
      script.dataset.kreatonGsap = "true";
      documentRef.head.appendChild(script);
    }
  }).catch((error) => {
    gsapLoadPromise = null;
    throw error;
  });
  return gsapLoadPromise;
}

function bindSectionAnimations({ root, gsap, windowRef, cleanup }) {
  root.querySelectorAll('[data-motion-enabled="true"]').forEach((section) => {
    const treatment = section.dataset.motionTreatment;
    const trigger = section.dataset.motionTrigger;
    if (trigger === "load" && treatment === "hero_enter") {
      animateHero(section, gsap);
      return;
    }
    if (trigger === "scroll") observeSection(section, treatment, { gsap, windowRef, cleanup });
    if (trigger === "interaction" && treatment === "cta_emphasis") {
      const cta = section.querySelector("[data-motion-cta]");
      if (cta) bindElementFeedback(cta, { gsap, cleanup, emphasize: true });
    }
  });
}

function animateHero(section, gsap) {
  const targets = [
    ...section.querySelectorAll("[data-motion-headline], [data-motion-copy], [data-motion-cta]"),
  ];
  if (!targets.length) return;
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 22 },
    { autoAlpha: 1, y: 0, duration: 0.66, stagger: 0.09, ease: "power3.out", force3D: true, clearProps: "transform" },
  );
}

function observeSection(section, treatment, { gsap, windowRef, cleanup }) {
  const reveal = () => {
    const items = treatment === "stagger_cards"
      ? [...section.querySelectorAll("[data-motion-item]")]
      : [section.querySelector("[data-motion-content]") || section];
    gsap.fromTo(
      items.filter(Boolean),
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.58, stagger: treatment === "stagger_cards" ? 0.08 : 0, ease: "power2.out", force3D: true, clearProps: "transform" },
    );
  };
  if (!windowRef.IntersectionObserver) {
    reveal();
    return;
  }
  const observer = new windowRef.IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    reveal();
  }, { threshold: 0.18, rootMargin: "0px 0px -8%" });
  observer.observe(section);
  cleanup.push(() => observer.disconnect());
}

function bindInteractionFeedback({ root, gsap, cleanup }) {
  root.querySelectorAll("button, a, input, textarea, select").forEach((element) => {
    bindElementFeedback(element, { gsap, cleanup });
  });
}

function bindElementFeedback(element, { gsap, cleanup, emphasize = false }) {
  const isField = element.matches("input, textarea, select");
  const animate = (vars) => {
    if (!isMotionInteractionBlocked(element)) gsap.to(element, { duration: 0.16, ease: "power2.out", overwrite: "auto", force3D: true, ...vars });
  };
  const handlers = isField
    ? [["focus", () => animate({ scale: 1.01, boxShadow: "0 0 0 3px color-mix(in srgb, var(--site-primary, #0e7c66) 20%, transparent)" })], ["blur", () => animate({ scale: 1, boxShadow: "none" })]]
    : [["pointerenter", () => animate({ y: emphasize ? -3 : -2, scale: emphasize ? 1.025 : 1.015 })], ["pointerleave", () => animate({ y: 0, scale: 1 })], ["pointerdown", () => animate({ y: 0, scale: 0.98 })], ["pointerup", () => animate({ y: emphasize ? -3 : -2, scale: emphasize ? 1.025 : 1.015 })], ["focus", () => animate({ y: -2, scale: 1.015 })], ["blur", () => animate({ y: 0, scale: 1 })]];
  handlers.forEach(([eventName, handler]) => element.addEventListener(eventName, handler));
  cleanup.push(() => {
    handlers.forEach(([eventName, handler]) => element.removeEventListener(eventName, handler));
    gsap.killTweensOf(element);
  });
}

function escapeAttribute(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
