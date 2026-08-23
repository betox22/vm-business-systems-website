function resolveApiBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const apiFromQuery = params.get("api");
  if (apiFromQuery) {
    localStorage.setItem("lumaApiBaseUrl", apiFromQuery);
    return apiFromQuery.replace(/\/$/, "");
  }
  if (window.LUMA_API_BASE_URL) {
    localStorage.removeItem("lumaApiBaseUrl");
    return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  }
  if (window.location.hostname.endsWith("trycloudflare.com")) return window.location.origin;
  const savedApi = localStorage.getItem("lumaApiBaseUrl");
  if (savedApi) return savedApi.replace(/\/$/, "");
  return "http://127.0.0.1:8010";
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = `${API_BASE_URL}/ai/website-builder`;
export const INTAKE_ASSISTANT_URL = `${API_BASE_URL}/api/ai/intake-assistant`;
export const LUMA_AGENT_URL = `${API_BASE_URL}/api/luma/chat`;
export const LYRA_EDIT_URL = `${API_BASE_URL}/api/luma/edit`;
export const CLIENT_REQUESTS_URL = `${API_BASE_URL}/client-requests`;
export const CLIENT_INTAKE_SESSION_URL = `${API_BASE_URL}/api/client/intake-session`;
export const CLIENT_AUTH_ME_URL = `${API_BASE_URL}/api/client/auth/me`;
export const CLIENT_AUTH_SESSION_URL = `${API_BASE_URL}/api/client/auth/session`;
export const CLIENT_AUTH_LOGOUT_URL = `${API_BASE_URL}/api/client/auth/logout`;
export const CLIENT_PROJECTS_URL = `${API_BASE_URL}/api/client/projects`;
export const CLIENT_LOGO_GENERATION_URL = `${API_BASE_URL}/api/client/logo/generate`;
export const ASSET_UPLOAD_URL = `${API_BASE_URL}/api/admin/assets/upload`;
// Public Supabase project ref used for the Google/Apple OAuth redirect (2026-07-19).
// Not a secret -- the anon key below uses the public "anon" role (never
// service_role) and is safe to ship client-side with Supabase RLS enabled.
// Google is enabled on this Supabase project already; Apple is not enabled yet
// (needs Beto's own Apple Developer Program setup) -- until then this same URL
// with provider=apple will land on Supabase's own "provider not enabled" page,
// which is an honest failure, not a broken/undefined one. No code change will
// be needed here once Apple is turned on in Supabase.
export const SUPABASE_PROJECT_URL = "https://rzdidqclbvnqqlcaueoh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZGlkcWNsYnZucXFsY2F1ZW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTY3NzUsImV4cCI6MjA5Mzc3Mjc3NX0.R6gl2jmRRaXDzOzh_QdsAlzdzvdSyfp0muCEJGnJku0";
export const SUPABASE_AUTH_URL = "https://rzdidqclbvnqqlcaueoh.supabase.co/auth/v1/authorize";
export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt"];
export const ASSISTANT_AVATAR_FALLBACK = "/assets/nixie_idle.png";
export const ASSISTANT_AVATARS = {
  neutral: "/assets/nixie_idle.png",
  happy: "/assets/nixie_success.png",
  thinking: "/assets/nixie_thinking.png",
  listening: "/assets/nixie_listening.png",
  speaking: "/assets/nixie_speaking.png",
  building: "/assets/nixie_building.png",
  optimize: "/assets/nixie_optimize.png",
  alert: "/assets/nixie_alert.png",
  success: "/assets/nixie_success.png",
};
export const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
};
export const GUIDED_DRAFT_STORAGE_KEY = "lumaGuidedDraft";
export const GENERATED_SITE_STORAGE_KEY = "lumaGeneratedSite";
export const CLIENT_INTAKE_SESSION_STORAGE_KEY = "lumaClientIntakeSession";
export const CLIENT_WORKSPACE_IDLE_LOCK_MS = 5 * 60 * 1000;
