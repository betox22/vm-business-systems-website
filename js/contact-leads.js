(() => {
  const form = document.getElementById("leadRequestForm");
  if (!form) return;

  const submitButton = document.getElementById("leadSubmitButton");
  const status = document.getElementById("leadFormStatus");
  const fallback = document.getElementById("leadFormFallback");
  const isLocal = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const apiBase = String(isLocal ? "http://127.0.0.1:8000" : (window.LUMA_API_BASE_URL || "")).replace(/\/$/, "");

  function setStatus(message, state = "") {
    status.textContent = message;
    status.dataset.state = state;
  }

  form.addEventListener("input", (event) => {
    if (event.target.matches("input, select, textarea")) event.target.removeAttribute("aria-invalid");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    fallback.hidden = true;
    const invalid = form.querySelector(":invalid");
    if (invalid) {
      invalid.setAttribute("aria-invalid", "true");
      invalid.focus();
      setStatus("Revisa los campos obligatorios y sus formatos.", "error");
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    submitButton.disabled = true;
    submitButton.textContent = "Enviando…";
    setStatus("Registrando tu solicitud…");
    try {
      const response = await fetch(`${apiBase}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Lead request failed (${response.status})`);
      const result = await response.json();
      form.reset();
      setStatus(`Solicitud enviada. Referencia: ${result.reference}`, "success");
    } catch (error) {
      console.error("Could not submit lead request", error);
      setStatus("No fue posible registrar la solicitud.", "error");
      fallback.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Enviar solicitud";
    }
  });
})();
