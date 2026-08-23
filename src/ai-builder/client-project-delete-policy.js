export function clientProjectDeletePayload(project = {}) {
  const projectId = String(project.id || "").trim();
  const businessName = String(project.business_name || project.businessName || "").trim();
  return projectId && businessName ? { projectId, businessName } : null;
}

export function removeClientProject(projects = [], projectId = "") {
  const cleanId = String(projectId || "").trim();
  return Array.isArray(projects)
    ? projects.filter((project) => String(project?.id || "").trim() !== cleanId)
    : [];
}

export function unfinishedClientProject(projects = [], preferredProject = null) {
  const savedProjects = Array.isArray(projects) ? projects.filter((project) => project?.id) : [];
  if (preferredProject?.id) {
    return savedProjects.find((project) => project.id === preferredProject.id) || preferredProject;
  }
  return savedProjects.find((project) => String(project.status || "draft").toLowerCase() !== "published") || null;
}
