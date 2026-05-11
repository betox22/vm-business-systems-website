const demoPortalPayload = {
  overview: {
    success: true,
    status: "ok",
    client: {
      client_id: "demo-client-los-andes",
      business_id: "los-andes-central",
      branch_code: "principal",
      license_ids: ["LIC-FLOW-POS-2026-001"],
      display_name: "Comercial Los Andes, C.A.",
      software_name: "FLOW POS",
    },
    summary: {
      devices_total: 2,
      backups_total: 12,
      latest_device_seen_at: "2026-05-10T21:40:00.000Z",
      latest_backup_at: "2026-05-10T22:23:57.376719Z",
      latest_backup_status: "uploaded",
    },
    tenant_contexts: [
      {
        business_id: "los-andes-central",
        branch_code: "principal",
        last_activity_at: "2026-05-10T22:23:57.376719Z",
        source: "device+backup",
      },
      {
        business_id: "los-andes-central",
        branch_code: "deposito",
        last_activity_at: "2026-05-10T18:05:00.000Z",
        source: "device",
      },
    ],
    latest_backup: {
      backup_id: "flow_auto_2026-05-10_22-23-57-376719",
      backup_type: "automatico",
      status: "uploaded",
      storage_path:
        "clients/demo-client-los-andes/businesses/los-andes-central/branches/principal/backups/2026/05/flow_auto_2026-05-10_22-23-57-376719.flowbackup",
      verified_at: "2026-05-10T22:24:02.000Z",
      sha256: "80c302d88e23fa416387b7a0d04c3f97628138174cea0a5e8c4927d3b952916a",
      tenant_scope: {
        businessId: "los-andes-central",
        branchCode: "principal",
      },
    },
    latest_release: {
      version: "0.4.1",
      storage_path: "windows/stable/0.4.1/FLOW-Setup-0.4.1.exe",
    },
    current_exchange_rate: {
      currency_code: "USD",
      quote_currency_code: "VES",
      rate_value: 499.8608,
      valid_date: "2026-05-08T00:00:00.000Z",
      fetched_at: "2026-05-10T22:30:00.000Z",
      source_name: "Banco Central de Venezuela",
      source_type: "bcv_website",
      source_url: "https://www.bcv.org.ve/",
    },
    current_exchange_rate_error: null,
  },
  devices: {
    devices: [
      {
        device_display_name: "Caja principal",
        device_identifier: "FLOW-WINDOWS-DEMO-001",
        platform: "windows-x64",
        status: "active",
        business_id: "los-andes-central",
        branch_code: "principal",
        last_seen_at: "2026-05-10T21:40:00.000Z",
      },
      {
        device_display_name: "Servidor de respaldo",
        device_identifier: "FLOW-WINDOWS-DEMO-002",
        platform: "windows-x64",
        status: "active",
        business_id: "los-andes-central",
        branch_code: "deposito",
        last_seen_at: "2026-05-10T18:05:00.000Z",
      },
    ],
  },
  backups: {
    backups: [
      {
        backup_id: "flow_auto_2026-05-10_22-23-57-376719",
        status: "uploaded",
        storage_path:
          "clients/demo-client-los-andes/businesses/los-andes-central/branches/principal/backups/2026/05/flow_auto_2026-05-10_22-23-57-376719.flowbackup",
        backup_type: "automatico",
        file_size_bytes: 950272,
        created_at: "2026-05-10T22:23:57.376719Z",
        verified_at: "2026-05-10T22:24:02.000Z",
        sha256: "80c302d88e23fa416387b7a0d04c3f97628138174cea0a5e8c4927d3b952916a",
        tenant_scope: {
          businessId: "los-andes-central",
          branchCode: "principal",
        },
      },
      {
        backup_id: "flow_manual_2026-05-10_16-10-18-120111",
        status: "uploaded",
        storage_path:
          "clients/demo-client-los-andes/businesses/los-andes-central/branches/principal/backups/2026/05/flow_manual_2026-05-10_16-10-18-120111.flowbackup",
        backup_type: "manual",
        file_size_bytes: 948800,
        created_at: "2026-05-10T16:10:18.120111Z",
      },
      {
        backup_id: "flow_auto_2026-05-09_21-00-03-001112",
        status: "uploaded",
        storage_path:
          "clients/demo-client-los-andes/businesses/los-andes-central/branches/deposito/backups/2026/05/flow_auto_2026-05-09_21-00-03-001112.flowbackup",
        backup_type: "automatico",
        file_size_bytes: 947120,
        created_at: "2026-05-09T21:00:03.001112Z",
      },
    ],
  },
};

const portalElements = {
  gatewayUrl: document.getElementById("gatewayUrl"),
  flowWebUrl: document.getElementById("flowWebUrl"),
  clientId: document.getElementById("clientId"),
  businessId: document.getElementById("businessId"),
  branchCode: document.getElementById("branchCode"),
  portalToken: document.getElementById("portalToken"),
  loadButtons: [
    document.getElementById("portalLoadButtonHero"),
    document.getElementById("portalLoadButtonCard"),
  ].filter(Boolean),
  demoButtons: [
    document.getElementById("portalDemoButtonHero"),
    document.getElementById("portalDemoButtonCard"),
  ].filter(Boolean),
  printButtons: [
    document.getElementById("portalPrintButtonHero"),
    document.getElementById("portalPrintButtonCard"),
  ].filter(Boolean),
  openFlowButtons: [
    document.getElementById("portalOpenFlowButtonHero"),
    document.getElementById("portalOpenFlowButtonCard"),
  ].filter(Boolean),
  downloadInstallerButtons: [
    document.getElementById("portalDownloadInstallerButtonHero"),
    document.getElementById("portalDownloadInstallerButtonCard"),
  ].filter(Boolean),
  logoutButton: document.getElementById("portalLogoutButton"),
  clearButton: document.getElementById("portalClearButton"),
  diagnosticBox: document.getElementById("portalDiagnosticBox"),
  dashboardTitle: document.getElementById("portalDashboardTitle"),
  dashboardSubtitle: document.getElementById("portalDashboardSubtitle"),
  sessionRoleBadge: document.getElementById("portalSessionRoleBadge"),
  sessionIdentity: document.getElementById("portalSessionIdentity"),
  clientMetric: document.getElementById("portalClientMetric"),
  licenseMetric: document.getElementById("portalLicenseMetric"),
  devicesMetric: document.getElementById("portalDevicesMetric"),
  devicesCaption: document.getElementById("portalDevicesCaption"),
  backupsMetric: document.getElementById("portalBackupsMetric"),
  backupsCaption: document.getElementById("portalBackupsCaption"),
  releaseMetric: document.getElementById("portalReleaseMetric"),
  releaseCaption: document.getElementById("portalReleaseCaption"),
  rateTitle: document.getElementById("portalRateTitle"),
  rateValue: document.getElementById("portalRateValue"),
  rateMeta: document.getElementById("portalRateMeta"),
  rateCaption: document.getElementById("portalRateCaption"),
  tenantContexts: document.getElementById("portalTenantContexts"),
  latestBackup: document.getElementById("portalLatestBackup"),
  devicesList: document.getElementById("portalDevicesList"),
  backupsList: document.getElementById("portalBackupsList"),
};

const portalStorageKeys = {
  gatewayUrl: "vm_portal_gateway_url",
  flowWebUrl: "vm_portal_flow_web_url",
  clientId: "vm_portal_client_id",
  businessId: "vm_portal_business_id",
  branchCode: "vm_portal_branch_code",
  previewToken: "vm_portal_preview_token",
  previewInfo: "vm_portal_preview_info",
};

const seededDemoTenant = {
  clientId: demoPortalPayload.overview.client.client_id,
  businessId: demoPortalPayload.overview.client.business_id,
  branchCode: demoPortalPayload.overview.client.branch_code,
};

const portalRuntimeState = {
  overview: null,
  devices: null,
  backups: null,
  source: "demo",
};

function setPortalText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function portalEmptyBox(message) {
  return `<div class="portal-empty-box">${message}</div>`;
}

function portalEscaped(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadPortalState() {
  const params = new URLSearchParams(window.location.search);
  portalElements.gatewayUrl.value =
    params.get("gateway") ||
    localStorage.getItem(portalStorageKeys.gatewayUrl) ||
    "http://localhost:8788";
  portalElements.flowWebUrl.value =
    params.get("flow_web_url") ||
    localStorage.getItem(portalStorageKeys.flowWebUrl) ||
    "http://localhost:7357";
  portalElements.clientId.value =
    params.get("client_id") ||
    localStorage.getItem(portalStorageKeys.clientId) ||
    "";
  portalElements.businessId.value =
    params.get("business_id") ||
    localStorage.getItem(portalStorageKeys.businessId) ||
    "";
  portalElements.branchCode.value =
    params.get("branch_code") ||
    localStorage.getItem(portalStorageKeys.branchCode) ||
    "";
}

function currentPreviewSession() {
  if (window.vmPortalPreviewSession) {
    return window.vmPortalPreviewSession;
  }

  try {
    return JSON.parse(
      sessionStorage.getItem(portalStorageKeys.previewInfo) || "{}",
    );
  } catch {
    return {};
  }
}

function applySessionChrome() {
  const session = currentPreviewSession();
  const roleLabel = session.role_label || "Sesion temporal";
  const displayName = session.display_name || session.email || "Acceso interno";

  setPortalText(portalElements.sessionRoleBadge, roleLabel);
  setPortalText(
    portalElements.sessionIdentity,
    `${displayName} · ${session.email || "sin email"}${
      session.role ? ` · rol ${session.role}` : ""
    }`,
  );

  document.body.dataset.portalRole = session.role || "preview";
}

function savePortalState() {
  localStorage.setItem(
    portalStorageKeys.gatewayUrl,
    portalElements.gatewayUrl.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.flowWebUrl,
    portalElements.flowWebUrl.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.clientId,
    portalElements.clientId.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.businessId,
    portalElements.businessId.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.branchCode,
    portalElements.branchCode.value.trim(),
  );
}

function useDemoDefaults() {
  portalElements.clientId.value = seededDemoTenant.clientId;
  portalElements.businessId.value = seededDemoTenant.businessId;
  portalElements.branchCode.value = seededDemoTenant.branchCode;
}

function portalHeaders() {
  const previewToken = sessionStorage.getItem(portalStorageKeys.previewToken) || "";
  if (previewToken) {
    return { Authorization: `Bearer ${previewToken}` };
  }

  const token = portalElements.portalToken.value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function portalQuery() {
  const query = new URLSearchParams();
  const clientId = portalElements.clientId.value.trim();
  const businessId = portalElements.businessId.value.trim();
  const branchCode = portalElements.branchCode.value.trim();
  if (clientId) {
    query.set("client_id", clientId);
  }
  if (businessId) {
    query.set("business_id", businessId);
  }
  if (branchCode) {
    query.set("branch_code", branchCode);
  }
  return query;
}

async function fetchPortalJson(path) {
  const gatewayBase = portalElements.gatewayUrl.value.trim().replace(/\/$/, "");
  if (!gatewayBase) {
    throw new Error("Falta la URL del gateway para consultar el portal.");
  }

  const response = await fetch(
    `${gatewayBase}${path}?${portalQuery().toString()}`,
    {
      headers: portalHeaders(),
    },
  );
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "No se pudo cargar la información del portal.");
  }
  return payload;
}

async function fetchPortalPayloadOrThrow() {
  const [overview, devices, backups] = await Promise.all([
    fetchPortalJson("/portal/overview"),
    fetchPortalJson("/portal/devices"),
    fetchPortalJson("/portal/backups"),
  ]);

  return { overview, devices, backups };
}

function renderTenantContexts(items) {
  if (!items.length) {
    portalElements.tenantContexts.innerHTML = portalEmptyBox(
      "No hay contextos tenant resumidos para este filtro todavía.",
    );
    return;
  }

  portalElements.tenantContexts.innerHTML = items
    .map(
      (item) => `
        <article class="portal-list-card">
          <div class="portal-card-topline">
            <strong>${portalEscaped(item.business_id)} · ${portalEscaped(item.branch_code)}</strong>
            <span class="portal-inline-pill">${portalEscaped(item.source)}</span>
          </div>
          <p>Última actividad: ${portalEscaped(item.last_activity_at || "sin fecha")}</p>
        </article>
      `,
    )
    .join("");
}

function renderDevices(items) {
  if (!items.length) {
    portalElements.devicesList.innerHTML = portalEmptyBox(
      "No hay equipos registrados para este cliente o filtro.",
    );
    return;
  }

  portalElements.devicesList.innerHTML = items
    .map(
      (item) => `
        <article class="portal-list-card">
          <div class="portal-card-topline">
            <strong>${portalEscaped(item.device_display_name)}</strong>
            <span class="portal-inline-pill">${portalEscaped(item.status)}</span>
          </div>
          <p>${portalEscaped(item.device_identifier)}</p>
          <div class="portal-pill-row">
            <span class="portal-inline-pill">${portalEscaped(item.platform)}</span>
            <span class="portal-inline-pill">${portalEscaped(item.business_id || "sin empresa")}</span>
            <span class="portal-inline-pill">${portalEscaped(item.branch_code || "sin sucursal")}</span>
          </div>
          <p>Última señal: ${portalEscaped(item.last_seen_at || "-")}</p>
        </article>
      `,
    )
    .join("");
}

function renderBackups(items) {
  if (!items.length) {
    portalElements.backupsList.innerHTML = portalEmptyBox(
      "No hay respaldos cloud para este cliente o filtro.",
    );
    return;
  }

  portalElements.backupsList.innerHTML = items
    .map(
      (item) => `
        <article class="portal-list-card">
          <div class="portal-card-topline">
            <strong>${portalEscaped(item.backup_id)}</strong>
            <span class="portal-inline-pill">${portalEscaped(item.status)}</span>
          </div>
          <p>${portalEscaped(item.storage_path)}</p>
          <div class="portal-pill-row">
            <span class="portal-inline-pill">${portalEscaped(item.backup_type)}</span>
            <span class="portal-inline-pill">${portalEscaped(String(item.file_size_bytes))} bytes</span>
          </div>
          <p>Creado: ${portalEscaped(item.created_at || "-")}</p>
        </article>
      `,
    )
    .join("");
}

function renderLatestBackup(item) {
  if (!item) {
    portalElements.latestBackup.innerHTML = portalEmptyBox(
      "Todavía no hay un respaldo válido resumido para este cliente.",
    );
    return;
  }

  portalElements.latestBackup.innerHTML = `
    <article class="portal-list-card portal-latest-card">
      <div class="portal-card-topline">
        <strong>${portalEscaped(item.backup_id)}</strong>
        <span class="portal-inline-pill">${portalEscaped(item.status)}</span>
      </div>
      <p>${portalEscaped(item.storage_path)}</p>
      <div class="portal-pill-row">
        <span class="portal-inline-pill">${portalEscaped(item.backup_type)}</span>
        <span class="portal-inline-pill">${portalEscaped(item.tenant_scope?.businessId || "-")}</span>
        <span class="portal-inline-pill">${portalEscaped(item.tenant_scope?.branchCode || "-")}</span>
      </div>
      <p>Verificado: ${portalEscaped(item.verified_at || "-")}</p>
      <p>Hash: ${portalEscaped(item.sha256 || "-")}</p>
    </article>
  `;
}

function renderCurrentExchangeRate(rate, errorMessage) {
  if (!rate) {
    setPortalText(portalElements.rateTitle, "BCV USD/VES");
    setPortalText(portalElements.rateValue, "--");
    setPortalText(
      portalElements.rateMeta,
      errorMessage || "Sin consulta central todavía.",
    );
    setPortalText(
      portalElements.rateCaption,
      errorMessage
        ? "La consulta central no respondió; revise gateway, conectividad o fuente BCV."
        : "La referencia central aparecerá aquí para validar tasa oficial, hora de consulta y estado del servicio.",
    );
    return;
  }

  const pair = `${rate.currency_code || "USD"}/${rate.quote_currency_code || "VES"}`;
  setPortalText(portalElements.rateTitle, `BCV ${pair}`);
  setPortalText(
    portalElements.rateValue,
    typeof rate.rate_value === "number"
      ? rate.rate_value.toFixed(4)
      : String(rate.rate_value || "--"),
  );
  setPortalText(
    portalElements.rateMeta,
    `Fecha valor: ${rate.valid_date || "-"} · Consultada: ${rate.fetched_at || "-"}`,
  );
  setPortalText(
    portalElements.rateCaption,
    `${rate.source_name || "Fuente central"} · ${rate.source_type || "sin tipo"} · ${rate.source_url || "sin URL"}`,
  );
}

function setPortalDiagnostic(value) {
  setPortalText(
    portalElements.diagnosticBox,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

function scrollPortalToSummary() {
  const target =
    portalElements.clientMetric?.closest(".portal-live-section") ||
    portalElements.clientMetric?.closest(".section");
  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function renderPortalPayload(overview, devices, backups, sourceLabel) {
  portalRuntimeState.overview = overview;
  portalRuntimeState.devices = devices;
  portalRuntimeState.backups = backups;
  portalRuntimeState.source = sourceLabel;

  const session = overview.session || currentPreviewSession();
  const displayName =
    overview.client?.display_name ||
    overview.client?.client_id ||
    "-";
  const softwareName =
    overview.client?.software_name ||
    (overview.latest_release?.version
      ? `FLOW ${overview.latest_release.version}`
      : "Sin software resumido");

  setPortalText(
    portalElements.dashboardTitle,
    displayName,
  );
  setPortalText(
    portalElements.dashboardSubtitle,
    `${softwareName} · ${overview.client?.business_id || "-"} · ${overview.client?.branch_code || "-"}${
      session?.role_label ? ` · ${session.role_label}` : ""
    }`,
  );

  setPortalText(portalElements.clientMetric, displayName);
  setPortalText(
    portalElements.licenseMetric,
    overview.client?.license_ids?.length
      ? `${softwareName} · Licencias: ${overview.client.license_ids.join(", ")}`
      : `${softwareName} · Sin licencias resumidas todavía.`,
  );
  setPortalText(
    portalElements.devicesMetric,
    String(overview.summary?.devices_total || 0),
  );
  setPortalText(
    portalElements.devicesCaption,
    overview.summary?.latest_device_seen_at
      ? `Última señal: ${overview.summary.latest_device_seen_at}`
      : "Sin señales de equipos todavía.",
  );
  setPortalText(
    portalElements.backupsMetric,
    String(overview.summary?.backups_total || 0),
  );
  setPortalText(
    portalElements.backupsCaption,
    overview.summary?.latest_backup_at
      ? `Último respaldo: ${overview.summary.latest_backup_at}`
      : "Sin respaldo resumido todavía.",
  );
  setPortalText(
    portalElements.releaseMetric,
    overview.latest_release?.version || "Sin release",
  );
  setPortalText(
    portalElements.releaseCaption,
    overview.latest_release?.storage_path || "Sin release publicado todavía.",
  );
  renderCurrentExchangeRate(
    overview.current_exchange_rate || null,
    overview.current_exchange_rate_error || "",
  );

  renderTenantContexts(overview.tenant_contexts || []);
  renderLatestBackup(overview.latest_backup || null);
  renderDevices(devices.devices || []);
  renderBackups(backups.backups || []);

  setPortalDiagnostic({
    source: sourceLabel,
    overview,
    devices,
    backups,
    session,
  });
}

function currentPortalRoleForFlow() {
  const session = currentPreviewSession();
  const role = String(session.role || "").trim().toLowerCase();
  if (role === "client" || role === "representative" || role === "admin") {
    return role;
  }
  return "client";
}

function buildFlowWebUrl() {
  const flowWebBase = portalElements.flowWebUrl.value.trim();
  const gatewayBase = portalElements.gatewayUrl.value.trim();
  if (!flowWebBase) {
    throw new Error(
      "Falta la URL base de FLOW Web. Configúrala en herramientas internas.",
    );
  }

  const url = new URL(flowWebBase);
  url.searchParams.set("portal_role", currentPortalRoleForFlow());
  url.searchParams.set("portal_autologin", "true");
  if (gatewayBase) {
    url.searchParams.set("gateway_url", gatewayBase);
  }

  const clientId = portalElements.clientId.value.trim();
  const businessId = portalElements.businessId.value.trim();
  const branchCode = portalElements.branchCode.value.trim();

  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }
  if (businessId) {
    url.searchParams.set("business_id", businessId);
  }
  if (branchCode) {
    url.searchParams.set("branch_code", branchCode);
  }

  return url.toString();
}

function openPendingWindow(title, message) {
  const pendingWindow = window.open("about:blank", "_blank", "noopener");
  if (!pendingWindow) {
    return null;
  }

  pendingWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${portalEscaped(title)}</title>
        <style>
          body {
            margin: 0;
            font-family: "Segoe UI", sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            display: grid;
            place-items: center;
            min-height: 100vh;
          }

          main {
            max-width: 560px;
            padding: 32px;
            border-radius: 24px;
            background: rgba(15, 23, 42, 0.94);
            border: 1px solid rgba(148, 163, 184, 0.25);
            box-shadow: 0 22px 60px rgba(15, 23, 42, 0.4);
          }

          h1 {
            margin: 0 0 12px;
            font-size: 24px;
          }

          p {
            margin: 0;
            line-height: 1.6;
            color: #cbd5e1;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>${portalEscaped(title)}</h1>
          <p>${portalEscaped(message)}</p>
        </main>
      </body>
    </html>
  `);
  pendingWindow.document.close();
  return pendingWindow;
}

function openFlowWeb() {
  try {
    savePortalState();
    const targetUrl = buildFlowWebUrl();
    const pendingWindow = openPendingWindow(
      "Abriendo FLOW Web",
      "Preparando la app web con el tenant y el rol del portal...",
    );
    if (pendingWindow) {
      pendingWindow.location.replace(targetUrl);
    } else {
      window.open(targetUrl, "_blank", "noopener");
    }

    const flowWebBase = portalElements.flowWebUrl.value.trim();
    const isLocalFlowWeb = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
      flowWebBase,
    );
    setPortalDiagnostic({
      action: "open-flow-web",
      target: targetUrl,
      local_runtime_expected: isLocalFlowWeb,
      reminder: isLocalFlowWeb
        ? 'Si la nueva pestaña da error, levanta FLOW Web con: flutter run -d chrome --web-port 7357 --dart-define=FLOW_DEMO_MODE=true'
        : null,
      message:
        "FLOW Web se abrió en una nueva pestaña con rol y tenant cargados desde el portal.",
    });
  } catch (error) {
    setPortalDiagnostic({
      success: false,
      action: "open-flow-web",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function downloadInstaller() {
  let pendingWindow = null;
  try {
    savePortalState();
    pendingWindow = openPendingWindow(
      "Preparando instalador",
      "Validando la sesión del portal y generando una URL firmada corta para Windows...",
    );
    setPortalDiagnostic("Preparando descarga protegida del instalador...");
    const payload = await fetchPortalJson("/portal/releases/windows/download");
    const target = payload?.download?.download_url || "";
    if (!/^https?:\/\//i.test(target)) {
      throw new Error(
        "El gateway no devolvió una URL válida para la descarga protegida del instalador.",
      );
    }

    if (pendingWindow) {
      pendingWindow.location.replace(target);
    } else {
      window.open(target, "_blank", "noopener");
    }
    setPortalDiagnostic({
      action: "download-installer",
      target,
      release: payload.release || null,
      expires_in_seconds: payload.download?.expires_in_seconds || null,
      message:
        "Se abrió una URL firmada corta del instalador Windows desde el portal.",
    });
  } catch (error) {
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.close();
    }
    setPortalDiagnostic({
      success: false,
      action: "download-installer",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function loadPortal() {
  try {
    savePortalState();
    setPortalDiagnostic("Cargando portal real...");
    const { overview, devices, backups } = await fetchPortalPayloadOrThrow();

    renderPortalPayload(overview, devices, backups, "real");
    scrollPortalToSummary();
  } catch (error) {
    setPortalDiagnostic({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function loadSeededDemoPortal() {
  try {
    useDemoDefaults();
    savePortalState();
    setPortalDiagnostic(
      "Intentando cargar el tenant demo real desde la nube...",
    );
    const { overview, devices, backups } = await fetchPortalPayloadOrThrow();
    renderPortalPayload(overview, devices, backups, "real-demo");
    scrollPortalToSummary();
  } catch (error) {
    loadDemoPortal();
    setPortalDiagnostic({
      source: "demo-fallback",
      message:
        "No se pudo abrir el tenant demo real desde la nube. Se mostró el demo visual embebido como respaldo.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function loadDemoPortal() {
  useDemoDefaults();
  savePortalState();
  renderPortalPayload(
    demoPortalPayload.overview,
    demoPortalPayload.devices,
    demoPortalPayload.backups,
    "demo",
  );
  scrollPortalToSummary();
}

function clearPortal() {
  portalElements.flowWebUrl.value =
    localStorage.getItem(portalStorageKeys.flowWebUrl) || "http://localhost:7357";
  portalElements.clientId.value = "";
  portalElements.businessId.value = "";
  portalElements.branchCode.value = "";
  portalElements.portalToken.value = "";
  localStorage.removeItem(portalStorageKeys.clientId);
  localStorage.removeItem(portalStorageKeys.businessId);
  localStorage.removeItem(portalStorageKeys.branchCode);
  setPortalText(portalElements.clientMetric, "-");
  setPortalText(portalElements.licenseMetric, "Sin datos cargados todavía.");
  setPortalText(portalElements.devicesMetric, "0");
  setPortalText(portalElements.devicesCaption, "Sin señales registradas aún.");
  setPortalText(portalElements.backupsMetric, "0");
  setPortalText(portalElements.backupsCaption, "Sin respaldo resumido todavía.");
  setPortalText(portalElements.releaseMetric, "-");
  setPortalText(portalElements.releaseCaption, "Sin release publicado cargado.");
  renderCurrentExchangeRate(null, "");
  portalElements.tenantContexts.innerHTML = portalEmptyBox(
    "No hay contextos tenant resumidos para este filtro todavía.",
  );
  portalElements.latestBackup.innerHTML = portalEmptyBox(
    "Todavía no hay un respaldo válido resumido para este cliente.",
  );
  portalElements.devicesList.innerHTML = portalEmptyBox(
    "No hay equipos registrados para este cliente o filtro.",
  );
  portalElements.backupsList.innerHTML = portalEmptyBox(
    "No hay respaldos cloud para este cliente o filtro.",
  );
  setPortalDiagnostic("Sin cargar.");
}

loadPortalState();
if (!portalElements.clientId.value.trim()) {
  useDemoDefaults();
}

portalElements.loadButtons.forEach((button) => {
  button.addEventListener("click", loadPortal);
});

portalElements.demoButtons.forEach((button) => {
  button.addEventListener("click", loadDemoPortal);
});

portalElements.printButtons.forEach((button) => {
  button.addEventListener("click", () => window.print());
});

portalElements.openFlowButtons.forEach((button) => {
  button.addEventListener("click", openFlowWeb);
});

portalElements.downloadInstallerButtons.forEach((button) => {
  button.addEventListener("click", downloadInstaller);
});

if (portalElements.clearButton) {
  portalElements.clearButton.addEventListener("click", clearPortal);
}

if (portalElements.logoutButton) {
  portalElements.logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(portalStorageKeys.previewToken);
    sessionStorage.removeItem(portalStorageKeys.previewInfo);
    window.location.replace("client-portal.html");
  });
}

applySessionChrome();

if (sessionStorage.getItem(portalStorageKeys.previewToken)) {
  loadSeededDemoPortal();
} else {
  loadDemoPortal();
}
