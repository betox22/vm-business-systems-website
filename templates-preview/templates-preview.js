const tabs = document.querySelectorAll(".template-tab");
const previews = document.querySelectorAll(".template-preview");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.templateTarget;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    previews.forEach((preview) => {
      preview.classList.toggle("active", preview.id === target);
    });
  });
});
