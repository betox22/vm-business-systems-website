export function readSupabaseAuthRedirect(locationLike = globalThis.location) {
  const hashParams = new URLSearchParams(String(locationLike?.hash || "").replace(/^#/, ""));
  const queryParams = new URLSearchParams(String(locationLike?.search || ""));
  return {
    accessToken: hashParams.get("access_token") || queryParams.get("access_token") || "",
    refreshToken: hashParams.get("refresh_token") || queryParams.get("refresh_token") || "",
    type: hashParams.get("type") || queryParams.get("type") || "",
  };
}

export async function requestSupabaseMagicLink({
  email,
  redirectTo,
  projectUrl,
  anonKey,
  fetchImpl = globalThis.fetch,
}) {
  try {
    const response = await fetchImpl(`${String(projectUrl || "").replace(/\/$/, "")}/auth/v1/otp`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || `Request failed (${response.status})`;
      return {
        ok: false,
        status: response.status,
        message: String(message),
        isRateLimited: response.status === 429 || /rate|wait|seconds|retry/i.test(String(message)),
      };
    }
    return { ok: true, status: response.status, email };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : String(error || "Network request failed"),
      isRateLimited: false,
    };
  }
}

export function magicLinkFeedback(result, email, language = "en") {
  const copy = {
    en: {
      title: "Check your email",
      sent: `We sent a sign-in link to ${email}. Open it in this browser to continue.`,
      rate: "Please wait a moment before trying again.",
    },
    es: {
      title: "Revisa tu correo",
      sent: `Te enviamos un enlace de acceso a ${email}. Ábrelo en este navegador para continuar.`,
      rate: "Espera un momento antes de reintentar.",
    },
    fr: {
      title: "Consultez votre email",
      sent: `Nous avons envoyé un lien de connexion à ${email}. Ouvrez-le dans ce navigateur pour continuer.`,
      rate: "Veuillez patienter un instant avant de réessayer.",
    },
    pt: {
      title: "Confira seu email",
      sent: `Enviamos um link de acesso para ${email}. Abra-o neste navegador para continuar.`,
      rate: "Espere um momento antes de tentar novamente.",
    },
  };
  const selected = copy[language] || copy.en;
  if (result?.ok) return { kind: "success", title: selected.title, message: selected.sent };
  return {
    kind: "error",
    title: "",
    message: result?.isRateLimited ? selected.rate : String(result?.message || "Unable to send the sign-in link."),
  };
}
