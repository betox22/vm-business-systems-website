(() => {
  const copy = {
    es: {
      navProducts: "Productos", navCompany: "Empresa", navSupport: "Soporte",
      clientAccess: "Acceso cliente", internalAccess: "Acceso interno",
      heroTitle: "Tecnología especializada.<br>Productos con identidad propia.",
      heroBody: "Creamos soluciones digitales independientes para operar negocios, desarrollar nuevas experiencias y construir presencia web.",
      exploreProducts: "Explorar productos", discoverVm: "Conocer VM Business Systems",
      listoBody: "La app insignia para ventas, inventario y operación comercial.",
      discoverListo: "Conocer Listo", kreatonBody: "Crea y administra páginas web con inteligencia artificial.",
      visitKreaton: "Ir a Kreaton", accessTitle: "Un acceso claro<br>para cada persona.",
      imClient: "Soy cliente", clientBody: "Ver mis proyectos, avances y entregas.",
      enterClient: "Entrar como cliente", imVm: "Soy parte de VM",
      vmBody: "Administrar solicitudes, páginas y clientes.", enterInternal: "Entrar al panel interno"
    },
    en: {
      navProducts: "Products", navCompany: "Company", navSupport: "Support",
      clientAccess: "Client access", internalAccess: "Internal access",
      heroTitle: "Specialized technology.<br>Products with an identity of their own.",
      heroBody: "We create independent digital solutions to run businesses, develop new experiences and build a strong web presence.",
      exploreProducts: "Explore products", discoverVm: "Discover VM Business Systems",
      listoBody: "Our flagship app for sales, inventory and business operations.",
      discoverListo: "Discover Listo", kreatonBody: "Create and manage websites with artificial intelligence.",
      visitKreaton: "Go to Kreaton", accessTitle: "A clear access path<br>for every person.",
      imClient: "I am a client", clientBody: "View my projects, progress and deliveries.",
      enterClient: "Enter as a client", imVm: "I am part of VM",
      vmBody: "Manage requests, websites and clients.", enterInternal: "Enter the internal panel"
    }
  };

  function applyLanguage(language) {
    const selected = copy[language] ? language : "es";
    document.documentElement.lang = selected;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = copy[selected][element.dataset.i18n];
      if (value) element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const value = copy[selected][element.dataset.i18nHtml];
      if (value) element.innerHTML = value;
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.classList.toggle("active", button.dataset.language === selected);
      button.setAttribute("aria-pressed", String(button.dataset.language === selected));
    });
    localStorage.setItem("vm-language", selected);
  }

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => applyLanguage(button.dataset.language));
  });
  document.querySelectorAll("[data-product-href]").forEach((card) => {
    const openProduct = () => { window.location.href = card.dataset.productHref; };
    card.addEventListener("click", (event) => {
      if (!event.target.closest("a")) openProduct();
    });
  });
  applyLanguage(localStorage.getItem("vm-language") || "es");
})();
