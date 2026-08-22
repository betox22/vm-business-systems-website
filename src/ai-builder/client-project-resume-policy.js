export function clientProjectEntryDecision({ projects = [], hasCurrentSchema = false } = {}) {
  if (hasCurrentSchema) return { action: "keep_current" };

  const savedProjects = Array.isArray(projects) ? projects.filter((project) => project?.id) : [];
  if (savedProjects.length === 1) {
    return { action: "confirm_resume", project: savedProjects[0] };
  }
  if (savedProjects.length > 1) {
    return { action: "choose_project", projects: savedProjects };
  }
  return { action: "hydrate_session" };
}

export function savedProjectName(project = {}) {
  return String(project.business_name || project.businessName || "").trim() || "Untitled page";
}
