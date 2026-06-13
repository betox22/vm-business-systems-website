const tabs = document.querySelectorAll(".template-tab");
const previews = document.querySelectorAll(".template-preview");

function activateTemplate(target) {
  const fallback = tabs[0]?.dataset.templateTarget || "";
  const nextTarget = document.querySelector(`#${CSS.escape(target)}`) ? target : fallback;
  tabs.forEach((item) => item.classList.toggle("active", item.dataset.templateTarget === nextTarget));
  previews.forEach((preview) => {
    preview.classList.toggle("active", preview.id === nextTarget);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.templateTarget || "";
    activateTemplate(target);
    const url = new URL(window.location.href);
    url.searchParams.set("template", target);
    window.history.replaceState({}, "", url);
  });
});

const initialTemplate = new URLSearchParams(window.location.search).get("template");
if (initialTemplate) activateTemplate(initialTemplate);
