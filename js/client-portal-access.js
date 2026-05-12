const portalAccessForm = {
  email: document.getElementById("portalAccessEmail"),
  password: document.getElementById("portalAccessPassword"),
  button: document.getElementById("portalAccessButton"),
  message: document.getElementById("portalAccessMessage"),
};

const portalPreviewSession = {
  gatewayUrlKey: "vm_portal_gateway_url",
  tokenKey: "vm_portal_preview_token",
  infoKey: "vm_portal_preview_info",
};

function resolvePortalGatewayUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryGateway = params.get("gateway") || params.get("gateway_url");
  if (queryGateway && /^https?:\/\//i.test(queryGateway.trim())) {
    const normalized = queryGateway.trim().replace(/\/$/, "");
    localStorage.setItem(portalPreviewSession.gatewayUrlKey, normalized);
    return normalized;
  }

  const storedGateway = localStorage.getItem(portalPreviewSession.gatewayUrlKey);
  if (storedGateway && /^https?:\/\//i.test(storedGateway.trim())) {
    return storedGateway.trim().replace(/\/$/, "");
  }

  return "http://localhost:8788";
}

function setPortalAccessMessage(message, isError = false) {
  if (!portalAccessForm.message) {
    return;
  }

  portalAccessForm.message.textContent = message;
  portalAccessForm.message.classList.toggle("error", isError);
  portalAccessForm.message.classList.toggle("success", !isError);
}

async function requestPortalPreviewAccess() {
  const gatewayUrl = resolvePortalGatewayUrl();
  const email = portalAccessForm.email.value.trim();
  const password = portalAccessForm.password.value;

  if (!email || !password) {
    setPortalAccessMessage(
      "Ingresa el email y la contraseña temporales para validar el acceso.",
      true,
    );
    return;
  }

  setPortalAccessMessage("Validando acceso temporal...", false);

  try {
    const response = await fetch(`${gatewayUrl.replace(/\/$/, "")}/portal/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.success === false || !payload.preview_token) {
      throw new Error(payload.message || "No se pudo validar el acceso temporal.");
    }

    sessionStorage.setItem(portalPreviewSession.tokenKey, payload.preview_token);
    sessionStorage.setItem(
      portalPreviewSession.infoKey,
      JSON.stringify(payload.session || {}),
    );
    setPortalAccessMessage(
      "Acceso temporal concedido. Abriendo la vista interna...",
      false,
    );
    window.location.href = payload.redirect_to || "client-portal-preview.html";
  } catch (error) {
    const fallbackHint =
      /localhost:8788/i.test(gatewayUrl) && window.location.hostname !== "localhost"
        ? " El portal público sigue apuntando al gateway local. Use la URL del portal con ?gateway=https://tu-backend para validación remota."
        : "";
    setPortalAccessMessage(
      error instanceof Error
        ? `${error.message}${fallbackHint}`
        : "No se pudo abrir la vista interna del portal.",
      true,
    );
  }
}

if (portalAccessForm.button) {
  portalAccessForm.button.addEventListener("click", requestPortalPreviewAccess);
}
