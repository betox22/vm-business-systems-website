// js/main.js

const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });
}

// Global preparation notice
document.addEventListener("DOMContentLoaded", () => {
  const notice = document.createElement("div");
  notice.className = "site-prep-notice";
  notice.textContent =
    "Sitio en preparación. V&M Business Systems está organizando sus servicios, partners autorizados y canales de atención.";

  document.body.prepend(notice);

  const style = document.createElement("style");
  style.textContent = `
    .site-prep-notice {
      width: 100%;
      padding: 10px 16px;
      background: #0b1220;
      color: #ffffff;
      text-align: center;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      z-index: 9999;
    }

    @media (max-width: 620px) {
      .site-prep-notice {
        font-size: 0.78rem;
        line-height: 1.35;
      }
    }
  `;

  document.head.appendChild(style);
});