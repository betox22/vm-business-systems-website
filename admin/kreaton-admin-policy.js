export function flattenClientProjects(clients = []) {
  return clients.flatMap((client) => (client.projects || []).map((project) => ({
    ...project,
    ownerId: client.id,
    ownerEmail: client.email,
    ownerStatus: client.accountStatus,
  }))).sort((left, right) => projectTimestamp(right) - projectTimestamp(left));
}

function projectTimestamp(project) {
  const value = project.updatedAt || project.createdAt || 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = Number(new Date(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function adminCapabilities(identity = {}) {
  const permissions = new Set(identity.permissions || []);
  return {
    canReadClients: permissions.has("clients:read"),
    canDeleteProjects: identity.role === "super_admin" && permissions.has("sites:delete"),
    canReadTemplates: identity.role === "super_admin" && permissions.has("templates:read"),
    canManageTemplates: identity.role === "super_admin" && permissions.has("templates:write"),
    canReadAudit: permissions.has("audit:read"),
  };
}

export function dashboardStats(clients = [], templates = []) {
  const projects = flattenClientProjects(clients);
  return {
    clients: clients.length,
    projects: projects.length,
    published: projects.filter((project) => String(project.status).toLowerCase() === "published").length,
    disabledTemplates: templates.filter((template) => !template.enabled).length,
  };
}

export function templateUpdatePayload(enabled, reason) {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Escribe el motivo del cambio.");
  return { enabled: Boolean(enabled), reason: cleanReason };
}
