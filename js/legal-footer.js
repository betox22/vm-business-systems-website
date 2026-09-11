(() => {
  const root = document.documentElement;
  const labelsFor = (lang) => lang === "en"
    ? [
        ["/terms-of-service.html", "Terms of Service"],
        ["/privacy-policy.html", "Privacy Policy"],
        ["/disclaimers.html", "Disclaimers"],
      ]
    : [
        ["/terminos-de-servicio.html", "Términos de Servicio"],
        ["/politica-de-privacidad.html", "Política de Privacidad"],
        ["/descargos-de-responsabilidad.html", "Descargos de Responsabilidad"],
      ];

  if (!document.querySelector('link[href="/css/legal-footer.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/css/legal-footer.css";
    document.head.append(stylesheet);
  }

  const footer = document.querySelector("footer") || document.body.appendChild(document.createElement("footer"));
  if (!footer.classList.length) footer.classList.add("vm-legal-footer-host");
  const nav = document.createElement("nav");
  nav.className = "vm-legal-links";
  nav.dataset.vmLegalLinks = "";
  footer.append(nav);
  const render = () => {
    const stored = localStorage.getItem("vm_corporate_language") || localStorage.getItem("kreaton_language") || "";
    const lang = (root.lang || stored || "es").toLowerCase().startsWith("en") ? "en" : "es";
    nav.replaceChildren();
    nav.setAttribute("aria-label", lang === "en" ? "Legal" : "Información legal");
    for (const [href, text] of labelsFor(lang)) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = text;
      nav.append(link);
    }
  };
  render();
  new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["lang"] });
})();
