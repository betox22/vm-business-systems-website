(() => {
  const checkbox = document.querySelector("#studioLegalConsent");
  if (!checkbox) return;
  const google = document.querySelector("#studioGoogleAuthButton");
  const email = document.querySelector("#studioEmailAuthForm button[type='submit']");
  const copy = checkbox.nextElementSibling;
  const renderCopy = () => {
    if (!copy) return;
    const spanish = document.documentElement.lang.toLowerCase().startsWith("es");
    copy.innerHTML = spanish
      ? 'Acepto los <a href="/terminos-de-servicio.html" target="_blank" rel="noopener">Términos de Servicio</a> y la <a href="/politica-de-privacidad.html" target="_blank" rel="noopener">Política de Privacidad</a>'
      : 'I accept the <a href="/terms-of-service.html" target="_blank" rel="noopener">Terms of Service</a> and <a href="/privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>';
  };
  const update = () => {
    const accepted = checkbox.checked;
    if (google) google.disabled = !accepted;
    if (email) email.disabled = !accepted;
    checkbox.closest(".studio-legal-consent")?.classList.toggle("is-accepted", accepted);
  };
  checkbox.addEventListener("change", update);
  new MutationObserver(() => { renderCopy(); update(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  for (const button of [google, email].filter(Boolean)) {
    new MutationObserver(() => { if (!checkbox.checked && !button.disabled) button.disabled = true; }).observe(button, { attributes: true, attributeFilter: ["disabled"] });
  }
  document.addEventListener("click", (event) => {
    if (checkbox.checked) return;
    if (event.target.closest("#studioGoogleAuthButton, #studioEmailAuthForm button[type='submit']")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      checkbox.focus();
    }
  }, true);
  renderCopy();
  update();
})();
