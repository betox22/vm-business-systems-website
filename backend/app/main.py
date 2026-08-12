from __future__ import annotations

import uuid
import re
import os
import json
import time
from collections import defaultdict, deque
from typing import Any, Dict, Optional

from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .agents import semantic_seed_catalog, split_items, state_is_commerce_seed_target
from .client_auth import fetch_supabase_user, supabase_auth_configured
from .commerce import router as commerce_router
from .db import get_session, init_db
from .db_models import GeneratedSite, Store
from .domains import router as domains_router
from .models import (
    AssetUploadRequest,
    AssetUploadResponse,
    LumaChatRequest,
    LumaChatResponse,
    LyraEditRequest,
    LyraEditResponse,
    CatalogSource,
    ColorProvenance,
    WebsiteGenerationRequest,
    WebsiteGenerationResponse,
)
from .lyra_edit_engine import LyraEditEngine
from .lyra_intake_engine import LyraIntakeDecision, LyraIntakeEngine
from .orchestrator import (
    LyraOrchestrator,
    assistant_message_for_state,
    next_question_for_state,
    normalize_state_payload,
    site_plan_from_state,
)
from .storage import StorageError, parse_data_url, supabase_storage_configured, upload_asset_to_supabase, validate_upload
from .taxonomy import infer_seed_profile


orchestrator = LyraOrchestrator()
intake_engine = LyraIntakeEngine()
edit_engine = LyraEditEngine()
client_intake_sessions: Dict[str, Dict[str, Any]] = {}


CLIENT_DRAFT_KEYS = {
    "websiteIntent",
    "businessName",
    "businessDescription",
    "industry",
    "location",
    "servicesProducts",
    "targetAudience",
    "preferredTone",
    "preferredColors",
    "contactInfo",
    "desiredDomain",
    "logoUrl",
    "logoPreference",
    "photoUrls",
    "logoPalette",
    "colorProvenance",
    "selectedLanguage",
    "hasLogo",
    "hasPhotos",
    "salesMode",
    "hasLogoPhotos",
    "sectionsPreference",
    "selectedTemplateId",
    "selectedTemplateName",
    "catalogType",
    "websiteType",
    "salesFlow",
    "brandStyle",
    "intakeFollowupAnswer",
    "fieldMeta",
    "generatedSiteId",
    "projectId",
    "videoUrls",
}


def _trim_text(value: Any, limit: int = 1200) -> str:
    text = str(value or "").strip()
    return text[:limit]


def _safe_list(value: Any, limit: int = 20) -> list[Any]:
    if isinstance(value, list):
        return value[:limit]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def sanitize_client_draft(raw: Any) -> Dict[str, Any]:
    """Keep client sessions small and restoreable.

    The public login gate only needs intake fields. Large generated objects such
    as sitePlan, aiStudioPlan, designStrategy, qualityRules and previous schemas
    are intentionally excluded because older sessions can grow enough to stall
    mobile restore.
    """

    if not isinstance(raw, dict):
        return {}
    draft: Dict[str, Any] = {}
    for key in CLIENT_DRAFT_KEYS:
        if key not in raw:
            continue
        value = raw.get(key)
        if key in {"servicesProducts", "preferredColors", "photoUrls", "videoUrls", "logoPalette"}:
            draft[key] = _safe_list(value)
        elif key == "colorProvenance":
            try:
                draft[key] = ColorProvenance.model_validate(value or {}).model_dump()
            except (TypeError, ValueError):
                draft[key] = ColorProvenance().model_dump()
        elif key == "contactInfo":
            info = value if isinstance(value, dict) else {}
            draft[key] = {
                "name": _trim_text(info.get("name"), 160),
                "email": _trim_text(info.get("email"), 200),
                "phone": _trim_text(info.get("phone"), 80),
                "whatsapp": _trim_text(info.get("whatsapp"), 80),
                "instagram": _trim_text(info.get("instagram"), 120),
                "website": _trim_text(info.get("website"), 200),
                "notes": _trim_text(info.get("notes"), 700),
            }
        elif key == "fieldMeta":
            meta = value if isinstance(value, dict) else {}
            draft[key] = {
                str(field)[:80]: {
                    "source": _trim_text((field_meta or {}).get("source"), 40) if isinstance(field_meta, dict) else "",
                    "confidence": (field_meta or {}).get("confidence", 0) if isinstance(field_meta, dict) else 0,
                }
                for field, field_meta in list(meta.items())[:40]
            }
        elif key in {"hasLogo", "hasPhotos"}:
            draft[key] = bool(value)
        else:
            draft[key] = _trim_text(value)
    return draft


def _has_form_value(value: Any) -> bool:
    if isinstance(value, list):
        return any(_has_form_value(item) for item in value)
    if isinstance(value, dict):
        return any(_has_form_value(item) for item in value.values())
    return bool(str(value or "").strip())


def _explicit_meta(source: str = "explicit", confidence: float = 1.0) -> Dict[str, Any]:
    return {"source": source, "confidence": confidence}


def _inferred_meta(confidence: float = 0.5) -> Dict[str, Any]:
    return _explicit_meta("inferred", confidence)


def build_generation_field_meta(request: WebsiteGenerationRequest) -> Dict[str, Dict[str, Any]]:
    """Treat structured form fields as explicit evidence for the intake gate."""

    meta: Dict[str, Dict[str, Any]] = {
        key: value
        for key, value in (request.fieldMeta or {}).items()
        if isinstance(value, dict)
    }
    preferred_tone = request.preferredTone or request.preferred_tone or request.brandStyle
    preferred_colors = request.preferredColors or request.preferred_colors
    logo_preference = request.logoPreference

    # A structured industry field is direct client input. Keep the closed taxonomy
    # for downstream classification, but do not block generation just because a
    # newly described industry has not received a taxonomy alias yet.
    if _has_form_value(request.industry):
        meta["industry"] = _explicit_meta()
        meta["niche"] = _explicit_meta()

    if _has_form_value(preferred_tone):
        meta["preferredTone"] = _explicit_meta()
        meta["brand_style"] = _explicit_meta()
    if _has_form_value(preferred_colors):
        meta["preferredColors"] = _explicit_meta()
        meta["brand_style"] = _explicit_meta()
    if _has_form_value(request.logoUrl):
        meta["logo"] = _explicit_meta()
    if _has_form_value(logo_preference):
        meta["logo"] = _explicit_meta()
        meta["logoPreference"] = _explicit_meta()
    return meta


def _generation_context_text(request: WebsiteGenerationRequest) -> str:
    values = [
        request.businessName or request.business_name or "",
        request.businessDescription or request.business_description or "",
        request.industry or "",
        request.servicesProducts or request.services_products or "",
    ]
    return " ".join(str(value) for value in values if value)


def infer_generation_industry(request: WebsiteGenerationRequest) -> str:
    if _has_form_value(request.industry):
        return str(request.industry)
    profile = infer_seed_profile(_generation_context_text(request))
    return "" if profile == "default" else profile


def infer_generation_sales_flow_with_meta(request: WebsiteGenerationRequest) -> tuple[str, Optional[Dict[str, Any]]]:
    explicit = request.salesFlow or request.sales_flow or request.designStrategy.get("salesFlow") or request.designStrategy.get("salesMode")
    if _has_form_value(explicit):
        return str(explicit), _explicit_meta()

    text = _generation_context_text(request).lower()
    if re.search(r"\b(reserva|reservas|booking|cita|citas|appointment)\b", text):
        return "booking", _inferred_meta()
    if re.search(r"\b(cotiza|cotizacion|cotización|quote|presupuesto)\b", text):
        return "quote_request", _inferred_meta()
    if re.search(r"\b(vendo|vender|venta|ventas|tienda|shop|store|online|comprar|producto|productos|catalogo|catálogo)\b", text):
        return "online_sales", _inferred_meta()
    return "", None


def infer_generation_sales_flow(request: WebsiteGenerationRequest) -> str:
    sales_flow, _meta = infer_generation_sales_flow_with_meta(request)
    return sales_flow


def generation_missing_info_message(missing_fields: list[str], language: str) -> str:
    labels = {
        "en": {
            "business_name": "business name",
            "business_description": "what the business sells or does",
            "niche": "business category",
            "sales_flow": "how customers should buy or contact you",
            "brand_style": "brand style or permission for LYRA to choose it",
            "logo": "whether to use, skip, or provide a logo",
        },
        "es": {
            "business_name": "nombre del negocio",
            "business_description": "qué vende o hace el negocio",
            "niche": "categoría del negocio",
            "sales_flow": "cómo deben comprar o contactarte los clientes",
            "brand_style": "estilo de marca o permiso para que LYRA lo elija",
            "logo": "si usaremos, omitiremos o subirás un logo",
        },
        "fr": {
            "business_name": "nom de l'entreprise",
            "business_description": "ce que l'entreprise vend ou fait",
            "niche": "catégorie de l'entreprise",
            "sales_flow": "comment les clients doivent acheter ou vous contacter",
            "brand_style": "style de marque ou autorisation pour LYRA de le choisir",
            "logo": "utiliser, ignorer ou fournir un logo",
        },
        "pt": {
            "business_name": "nome do negócio",
            "business_description": "o que o negócio vende ou faz",
            "niche": "categoria do negócio",
            "sales_flow": "como os clientes devem comprar ou entrar em contato",
            "brand_style": "estilo da marca ou permissão para a LYRA escolher",
            "logo": "usar, pular ou enviar um logo",
        },
    }
    language_labels = labels.get(language, labels["en"])
    readable = [language_labels.get(field, field.replace("_", " ")) for field in missing_fields]
    joined = ", ".join(readable)
    prefix = {
        "es": f"Antes de generar el sitio todavía necesito confirmar: {joined}.",
        "fr": f"Avant de générer le site, je dois encore confirmer : {joined}.",
        "pt": f"Antes de gerar o site, ainda preciso confirmar: {joined}.",
    }.get(language, f"Before generating the site, I still need to confirm: {joined}.")
    question = intake_engine.fallback_question_for_missing(missing_fields, language)
    return f"{prefix} {question}".strip()

app = FastAPI(title="KREATON LYRA API", version="0.1.0")

# 2026-07-25 security hardening: this used to be allow_origins=["*"] with
# allow_credentials=False. A wildcard origin can never be combined with
# credentials (browsers reject that combination outright), which is exactly
# what blocked moving client sessions from localStorage to an httpOnly
# cookie. Pin this to the real frontend origins instead so cookies can flow
# between the frontend and this API's custom domain.
#
# vmbusinesssystems.com is the real app's domain -- it serves both the
# KREATON/LYRA product (ai-builder.html, client/setup/) and V&M Business
# Systems' general pages (contact.html etc.) from the same GitHub Pages
# deployment, so it stays the one canonical frontend origin.
CLIENT_ALLOWED_ORIGINS = [
    "https://vmbusinesssystems.com",
    "https://www.vmbusinesssystems.com",
    "https://lyra.vmbusinesssystems.com",
    "http://127.0.0.1:5177",
    "http://localhost:5177",
]

# usekreaton.com is scoped to generated client sites only, not the main app:
# every generated site gets a real, resolvable subdomain of usekreaton.com
# (see persist_generated_site's public_url + the Cloudflare Worker in
# cloudflare/subdomain-proxy-worker.js that serves site.html on
# *.usekreaton.com). A fixed allow_origins entry can't express "one of
# unlimited generated subdomains" -- allow_origin_regex is the documented
# way to allow a whole pattern with allow_credentials=True still on. Scoped
# strictly to usekreaton.com subdomains, not a bare ".*".
#
# 2026-08-10: this briefly also covered the bare apex (usekreaton.com with
# zero subdomain labels) during a same-day full-domain-cutover experiment
# that got reverted a few hours later -- see docs/AGENT_LOG.md. The apex
# isn't the app's origin anymore, but the regex still matches it harmlessly
# (nothing serves content there to trigger a CORS request from it).
CLIENT_ALLOWED_ORIGIN_REGEX = r"^https://([a-z0-9-]+\.)*usekreaton\.com$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=CLIENT_ALLOWED_ORIGINS,
    allow_origin_regex=CLIENT_ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Baseline security headers on every response from this API.

    This service is a pure JSON/API backend (no HTML it serves is meant to be
    framed or to run inline scripts from third parties), so a strict,
    API-appropriate policy is safe to apply globally rather than tuning it
    per route. The equivalent headers for the static frontend
    (vmbusinesssystems.com, served via GitHub Pages) can't be set here --
    GitHub Pages doesn't support custom response headers -- those need to be
    added at the Cloudflare edge in front of that domain instead.
    """

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response


app.include_router(commerce_router)
app.include_router(domains_router)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {"status": "ok", "service": "kreaton-lyra-api"}
# Bug fix (2026-07-19): this route used to also answer GET "/", which meant the
# bare domain (and Supabase's OAuth "Site URL" fallback, used whenever the
# actual redirect_to isn't on the allow list) always showed this raw JSON
# instead of the real site. Render's own health check already targets
# /healthz (see render.yaml), so "/" is free for the redirect defined near
# the bottom of this file (see the 2026-08-10 security fix comment there).


def storage_is_configured() -> bool:
    """Report whether a server-side storage provider appears configured.

    The current backend does not initialize a storage client yet, so this
    checks the environment variables expected by the rebuild kit and common
    S3/R2-compatible storage providers without exposing secret values.
    """

    supabase_ready = supabase_storage_configured()
    object_storage_ready = bool(
        os.getenv("STORAGE_BUCKET") or os.getenv("S3_BUCKET") or os.getenv("R2_BUCKET")
    ) and bool(
        os.getenv("STORAGE_ENDPOINT")
        or os.getenv("S3_ENDPOINT_URL")
        or os.getenv("R2_ENDPOINT")
        or os.getenv("AWS_ENDPOINT_URL")
    )
    return supabase_ready or object_storage_ready


@app.get("/api/ai-status")
async def ai_status() -> Dict[str, bool]:
    planner = getattr(orchestrator, "ai_site_planner", None)
    return {
        "openaiConfigured": bool(os.getenv("OPENAI_API_KEY")),
        "intakeAIAvailable": getattr(intake_engine, "client", None) is not None,
        "plannerAIAvailable": getattr(planner, "client", None) is not None,
        "storageConfigured": storage_is_configured(),
    }


@app.get("/api/build-info")
async def build_info() -> Dict[str, Any]:
    return {
        "service": os.getenv("RENDER_SERVICE_NAME") or "kreaton-lyra-api",
        "commit": os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "",
        "branch": os.getenv("RENDER_GIT_BRANCH") or os.getenv("GIT_BRANCH") or "",
        "version": app.version,
    }


@app.post("/api/admin/assets/upload", response_model=AssetUploadResponse)
async def upload_asset(request: AssetUploadRequest, http_request: Request) -> AssetUploadResponse:
    """Persist a client-uploaded photo/logo to real storage instead of embedding base64.

    The frontend (ai-builder.js uploadAssetFile) already calls this endpoint and
    gracefully falls back to an embedded base64 data URL if it fails, so this can be
    deployed without a frontend change. Today the only wired provider is Supabase
    Storage; if it is not configured, we fail clearly so the frontend fallback kicks in
    (rather than silently returning a broken URL).

    Despite the "/api/admin/" path, this is called unauthenticated from the public
    guided-intake flow (logo/photo upload happens before a prospect has a real
    account) -- the path is legacy naming, not an enforced permission boundary.
    Since login can't be required without breaking that flow, the guardrails here
    are per-IP rate limiting plus a hard MIME/size check (validate_upload), so an
    unauthenticated caller can't push unlimited or arbitrary files through the
    service-role Supabase key.
    """

    _enforce_rate_limit(http_request, "upload_asset", limit=20, window_seconds=60)
    if not supabase_storage_configured():
        raise HTTPException(
            status_code=503,
            detail="Storage is not configured on the server (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
        )
    if not request.dataUrl:
        raise HTTPException(status_code=400, detail="dataUrl is required.")

    try:
        data, detected_content_type = parse_data_url(request.dataUrl)
        validate_upload(
            asset_type=request.assetType,
            content_type=request.contentType or detected_content_type,
            data=data,
        )
    except StorageError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    try:
        public_url = upload_asset_to_supabase(
            business_id=request.businessId,
            site_id=request.siteId,
            asset_type=request.assetType,
            file_name=request.fileName,
            content_type=request.contentType or detected_content_type,
            data=data,
        )
    except StorageError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    return AssetUploadResponse(
        url=public_url,
        assetType=request.assetType,
        fileName=request.fileName,
    )


@app.get("/api/client/auth/me")
async def client_auth_me(
    request: Request,
    authorization: str = Header(default=""),
    luma_client_session: str = Cookie(default=""),
) -> Dict[str, Any]:
    """Resolve the real Supabase user for the client's access token.

    The frontend (ai-builder.js resumeClientSessionFromAuthToken /
    fetchClientAuthUser) already calls this after a Google/Apple OAuth
    redirect and sends `Authorization: Bearer <token>` -- this endpoint just
    didn't exist before, so that call always failed and login silently fell
    back to the unauthenticated "type any email" path. See client_auth.py.

    Also accepts the httpOnly `luma_client_session` cookie set by
    POST /api/client/auth/session, so callers that have migrated off
    localStorage don't need to send the header at all.
    """

    _enforce_rate_limit(request, "client_auth_me")
    token = _bearer_token(authorization, luma_client_session)
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token.")
    if not supabase_auth_configured():
        raise HTTPException(status_code=503, detail="Account login is not configured on the server yet.")
    user = fetch_supabase_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "userMetadata": user.get("user_metadata") or {},
    }


class ClientAuthSessionRequest(BaseModel):
    access_token: str
    refresh_token: str = ""


@app.post("/api/client/auth/session")
async def client_auth_session(
    payload: ClientAuthSessionRequest,
    request: Request,
    response: Response,
) -> Dict[str, Any]:
    """Exchange a Supabase access token for an httpOnly session cookie.

    The frontend still receives the access token from Supabase in the OAuth
    redirect's URL fragment (browsers never send fragments to a server, so
    there's no way around capturing it client-side first) -- but instead of
    only keeping it in localStorage, it now also POSTs it here once, and this
    sets it as an httpOnly cookie that JavaScript can no longer read. Scoped
    to the shared parent domain so the cookie is sent to both
    vmbusinesssystems.com and this API's luma-api.vmbusinesssystems.com.

    2026-08-10 note: this was briefly changed to ".usekreaton.com" as part
    of a same-day full domain cutover, then reverted a few hours later --
    vmbusinesssystems.com also serves general V&M Business Systems pages
    (contact.html etc.) that are NOT part of the KREATON/LYRA product, so
    moving GitHub Pages' one-domain-per-repo custom domain to usekreaton.com
    took the whole site with it, not just the app. usekreaton.com stays
    scoped to what it was originally for: real subdomains for generated
    client sites (see persist_generated_site's public_url below), not the
    main app's own domain. See docs/AGENT_LOG.md same-day entries for both
    the cutover and the revert.

    2026-08-10 (later same day) note: the KREATON app itself is now ALSO
    served, unchanged, from usekreaton.com and www.usekreaton.com via
    cloudflare/subdomain-proxy-worker.js (a proxy in front of GitHub Pages,
    not a new GitHub Pages custom domain -- see that file's header comment).
    That means a visitor can load the app from usekreaton.com while this API
    still lives at luma-api.vmbusinesssystems.com -- two different
    registrable domains, so from the browser's point of view that XHR is
    CROSS-SITE, not just cross-origin. A SameSite=Lax cookie is dropped on
    cross-site fetches, which would silently break login for anyone using
    the usekreaton.com entry point while leaving vmbusinesssystems.com
    logins looking fine -- exactly the kind of bug that's easy to miss
    testing from just one domain. samesite="none" (below) fixes that; it
    still requires Secure (already true) and still requires the requesting
    origin to be on the CORS allowlist (CLIENT_ALLOWED_ORIGIN_REGEX already
    covers usekreaton.com), so this doesn't open the cookie up to arbitrary
    third-party sites.
    """

    _enforce_rate_limit(request, "client_auth_session", limit=10)
    if not supabase_auth_configured():
        raise HTTPException(status_code=503, detail="Account login is not configured on the server yet.")
    user = fetch_supabase_user(payload.access_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=payload.access_token,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        domain=".vmbusinesssystems.com",
    )
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "userMetadata": user.get("user_metadata") or {},
    }


@app.post("/api/client/auth/logout")
async def client_auth_logout(response: Response) -> Dict[str, str]:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        domain=".vmbusinesssystems.com",
        secure=True,
        samesite="none",
    )
    return {"status": "logged_out"}


# --- Client session cookie -------------------------------------------------
#
# The frontend used to keep the Supabase access token only in localStorage
# and send it as `Authorization: Bearer <token>`. That is readable by any
# script that runs on the page (e.g. via a future XSS bug), so
# POST /api/client/auth/session below exchanges that token for an httpOnly
# cookie instead. Every endpoint that used to only read the Authorization
# header now also accepts this cookie, so both the old header-based flow and
# the new cookie-based flow work side by side during the transition.
SESSION_COOKIE_NAME = "luma_client_session"
SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days

# --- Basic in-memory rate limiting ------------------------------------------
#
# There is no password-login endpoint in this API today (that flow goes
# straight from the frontend to Supabase), so brute-forcing a password isn't
# a real concern here. What is worth limiting is abuse of the endpoints that
# accept a client-supplied token and call out to Supabase on every request.
# This is a simple per-process sliding window, which is fine as long as this
# service runs as a single Render instance (see render.yaml) -- if it's ever
# scaled to multiple instances, this needs to move to something shared like
# Redis, since each instance would otherwise track its own counts.
_rate_limit_buckets: Dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    """Best-effort real client IP for rate-limit bucketing.

    Found 2026-08-10, right after shipping rate limiting: this domain is
    Cloudflare-proxied in front of Render (confirmed via `server: cloudflare`
    / `cf-ray` response headers), and a 50-request burst against the live
    /api/luma/chat endpoint never triggered its 40/min limit even though the
    exact same logic reliably 429s locally under TestClient. The likely cause
    is that whatever sits between Cloudflare and this uvicorn process
    (Render's own edge) isn't reliably preserving the original client IP as
    the first hop in X-Forwarded-For, so requests from one real caller were
    landing in different rate-limit buckets. Cloudflare always sets
    CF-Connecting-IP to the true end-client IP itself (not something a client
    can spoof through Cloudflare, since Cloudflare overwrites it), so prefer
    that when present -- it's the one signal in this chain guaranteed to be
    both correct and stable per real visitor.
    """
    cf_ip = request.headers.get("cf-connecting-ip", "").strip()
    if cf_ip:
        return cf_ip
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(request: Request, scope: str, *, limit: int = 20, window_seconds: int = 60) -> None:
    key = f"{scope}:{_client_ip(request)}"
    now = time.monotonic()
    bucket = _rate_limit_buckets[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment and try again.")
    bucket.append(now)


def _bearer_token(authorization: str, session_cookie: str = "") -> str:
    token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
    return token or (session_cookie or "").strip()


def authenticated_client_user(
    authorization: str, session_cookie: str = "", *, required: bool = True
) -> Optional[Dict[str, Any]]:
    token = _bearer_token(authorization, session_cookie)
    if not token:
        if required:
            raise HTTPException(status_code=401, detail="Missing access token.")
        return None
    if not supabase_auth_configured():
        if required:
            raise HTTPException(status_code=503, detail="Account login is not configured on the server yet.")
        return None
    user = fetch_supabase_user(token)
    if not user:
        if required:
            raise HTTPException(status_code=401, detail="Invalid or expired session.")
        return None
    return user


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return (slug or "new-site")[:48]


def _schema_json(schema: Dict[str, Any]) -> str:
    return json.dumps(schema or {}, ensure_ascii=False, separators=(",", ":"))


def _schema_summary(schema: Dict[str, Any]) -> Dict[str, str]:
    business = schema.get("business") if isinstance(schema.get("business"), dict) else {}
    selected_template = schema.get("selected_template") if isinstance(schema.get("selected_template"), dict) else {}
    active_template = schema.get("active_template") if isinstance(schema.get("active_template"), dict) else {}
    theme = schema.get("theme") if isinstance(schema.get("theme"), dict) else {}
    theme_colors = theme.get("colors") if isinstance(theme.get("colors"), dict) else {}
    navigation = schema.get("navigation") if isinstance(schema.get("navigation"), list) else []
    first_page = (schema.get("pages") or [{}])[0] if isinstance(schema.get("pages"), list) and schema.get("pages") else {}
    first_section = (first_page.get("sections") or [{}])[0] if isinstance(first_page.get("sections"), list) and first_page.get("sections") else {}
    editable = first_section.get("editable") if isinstance(first_section.get("editable"), dict) else {}
    template_id = selected_template.get("id") or active_template.get("id") or schema.get("template_id") or ""
    template_name = selected_template.get("name") or active_template.get("name") or template_id or "Generated site"
    return {
        "business_name": str(business.get("name") or schema.get("businessName") or "Generated site").strip()[:220],
        "business_type": str(business.get("industry") or selected_template.get("category") or "website").strip()[:140],
        "template_id": str(template_id or "generated-site").strip()[:140],
        "template_name": str(template_name).strip()[:180],
        "template_mode": str(selected_template.get("category") or "ai_generated").strip()[:120],
        "description": str(business.get("description") or "").strip()[:1200],
        "hero_title": str(editable.get("headline") or first_page.get("title") or business.get("name") or "").strip()[:260],
        "hero_body": str(editable.get("subtitle") or editable.get("text") or "").strip()[:1200],
        "announcement": str((navigation[0] or {}).get("label") if navigation else "").strip()[:180],
        "accent_color": str(
            theme_colors.get("accent")
            or theme_colors.get("primary")
            or theme.get("accent")
            or theme.get("primary")
            or ""
        ).strip()[:80],
    }


def _project_owner_filter(owner_user_id: str, owner_email: str):
    clauses = []
    if owner_user_id:
        clauses.append(GeneratedSite.owner_user_id == owner_user_id)
    if owner_email:
        clauses.append(GeneratedSite.owner_email == owner_email)
    return or_(*clauses) if clauses else GeneratedSite.owner_email == "__none__"


def _get_or_create_store(
    session: Session,
    *,
    owner_user_id: str,
    owner_email: str,
    business_name: str,
    business_type: str,
) -> Store:
    query = select(Store)
    if owner_user_id:
        query = query.where(Store.owner_user_id == owner_user_id)
    else:
        query = query.where(Store.owner_email == owner_email)
    store = session.execute(query.order_by(Store.updated_at.desc())).scalar_one_or_none()
    if store:
        store.owner_user_id = owner_user_id or store.owner_user_id
        store.owner_email = owner_email or store.owner_email
        store.name = business_name or store.name
        store.business_type = business_type or store.business_type
        return store

    store_id = f"store_{uuid.uuid4().hex[:12]}"
    store = Store(
        id=store_id,
        owner_user_id=owner_user_id or None,
        owner_email=owner_email,
        name=business_name or "Client workspace",
        business_type=business_type or "website",
        public_url=f"{_slugify(business_name or store_id)}.usekreaton.com",
        status="draft",
    )
    session.add(store)
    return store


def persist_generated_site(
    session: Session,
    *,
    user: Dict[str, Any],
    request: WebsiteGenerationRequest,
    schema: Dict[str, Any],
) -> GeneratedSite:
    owner_user_id = str(user.get("id") or "").strip()
    owner_email = str(user.get("email") or "").strip().lower()
    if not owner_email:
        raise HTTPException(status_code=401, detail="Authenticated user email missing.")

    summary = _schema_summary(schema)
    site_id = (
        request.generatedSiteId
        or request.generated_site_id
        or request.projectId
        or request.project_id
        or ""
    ).strip()
    existing_site = None
    if site_id:
        existing_site = session.execute(
            select(GeneratedSite).where(
                GeneratedSite.id == site_id,
                _project_owner_filter(owner_user_id, owner_email),
            )
        ).scalar_one_or_none()
        if not existing_site:
            raise HTTPException(status_code=404, detail="Generated site not found for this account.")

    store = _get_or_create_store(
        session,
        owner_user_id=owner_user_id,
        owner_email=owner_email,
        business_name=summary["business_name"],
        business_type=summary["business_type"],
    )
    if existing_site:
        site = existing_site
    else:
        site_id = f"site_{uuid.uuid4().hex[:12]}"
        site = GeneratedSite(
            id=site_id,
            store_id=store.id,
            owner_user_id=owner_user_id or None,
            owner_email=owner_email,
            business_name=summary["business_name"],
            business_type=summary["business_type"],
            template_id=summary["template_id"],
            template_name=summary["template_name"],
            template_mode=summary["template_mode"],
            domain_slug=_slugify(summary["business_name"]),
            public_url=f"{_slugify(summary['business_name'])}-{site_id[-6:]}.usekreaton.com",
            status="draft",
            generated_config="{}",
        )
        session.add(site)

    site.store_id = store.id
    site.owner_user_id = owner_user_id or site.owner_user_id
    site.owner_email = owner_email
    site.business_name = summary["business_name"]
    site.business_type = summary["business_type"]
    site.template_id = summary["template_id"]
    site.template_name = summary["template_name"]
    site.template_mode = summary["template_mode"]
    site.description = summary["description"]
    site.hero_title = summary["hero_title"]
    site.hero_body = summary["hero_body"]
    site.announcement = summary["announcement"]
    site.accent_color = summary["accent_color"]
    site.domain_slug = site.domain_slug or _slugify(summary["business_name"])
    site.public_url = site.public_url or f"{site.domain_slug}-{site.id[-6:]}.usekreaton.com"
    site.status = "draft"
    site.generated_config = _schema_json(schema)
    session.commit()
    session.refresh(site)
    return site


def _project_item(site: GeneratedSite) -> Dict[str, Any]:
    return {
        "id": site.id,
        "business_name": site.business_name,
        "template_name": site.template_name,
        "status": site.status,
        "updated_at": site.updated_at,
        "public_url": site.public_url,
    }


def _intake_session_key(email: str, project_id: str = "", request_id: str = "") -> str:
    identity = str(project_id or request_id or "active").strip() or "active"
    return f"{email}:{identity}"


@app.get("/api/client/projects")
async def client_projects(
    authorization: str = Header(default=""),
    luma_client_session: str = Cookie(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    user = authenticated_client_user(authorization, luma_client_session)
    owner_user_id = str(user.get("id") or "").strip()
    owner_email = str(user.get("email") or "").strip().lower()
    sites = session.execute(
        select(GeneratedSite)
        .where(_project_owner_filter(owner_user_id, owner_email))
        .order_by(GeneratedSite.updated_at.desc())
    ).scalars().all()
    return {"projects": [_project_item(site) for site in sites]}


@app.get("/api/client/projects/{project_id}")
async def client_project_detail(
    project_id: str,
    authorization: str = Header(default=""),
    luma_client_session: str = Cookie(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    user = authenticated_client_user(authorization, luma_client_session)
    owner_user_id = str(user.get("id") or "").strip()
    owner_email = str(user.get("email") or "").strip().lower()
    site = session.execute(
        select(GeneratedSite).where(
            GeneratedSite.id == project_id,
            _project_owner_filter(owner_user_id, owner_email),
        )
    ).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Project not found.")
    try:
        schema = json.loads(site.generated_config or "{}")
    except json.JSONDecodeError:
        schema = {}
    return {
        "project": _project_item(site),
        "schema": schema,
        "business_id": site.store_id,
        "site_id": site.id,
        "generatedSiteId": site.id,
        "storage_status": site.status,
    }


def _public_site_payload(site: GeneratedSite) -> Dict[str, Any]:
    """Shape a GeneratedSite row for the unauthenticated public viewer.

    Deliberately narrower than _project_item / client_project_detail's
    response: no owner_email, no store id beyond what's needed to render the
    page, nothing that identifies the account behind the site. Anyone with
    the site's id or its public_url is meant to be able to view it (that's
    the point of a public site viewer), but not learn who owns it.
    """

    try:
        schema = json.loads(site.generated_config or "{}")
    except json.JSONDecodeError:
        schema = {}
    return {
        "site_id": site.id,
        "business_name": site.business_name,
        "template_name": site.template_name,
        "public_url": site.public_url,
        "schema": schema,
        "catalog_items": (schema.get("catalog_items") if isinstance(schema, dict) else None) or [],
    }


@app.get("/public/sites/{site_id}")
async def public_site_by_id(
    site_id: str,
    http_request: Request,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Resolve a generated site for the public site-viewer page (site-viewer.js).

    Unauthenticated by design -- this is what makes a generated site visible
    to anyone with the link, which is the whole point of showing a finished
    site to a prospect. Rate limited like the other public endpoints instead
    of gated behind login.
    """

    _enforce_rate_limit(http_request, "public_site", limit=60, window_seconds=60)
    site = session.execute(select(GeneratedSite).where(GeneratedSite.id == site_id)).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found.")
    return _public_site_payload(site)


@app.get("/public/resolve-site")
async def public_resolve_site(
    host: str,
    http_request: Request,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Resolve a generated site by its stored domain (site-viewer.js's other lookup path).

    GeneratedSite.public_url is "{slug}-{id}.usekreaton.com" by default (see
    persist_generated_site) -- a real, owned domain as of 2026-08-10, wired
    to this API via a Cloudflare Worker that reverse-proxies
    *.usekreaton.com to the GitHub Pages origin (see
    cloudflare/subdomain-proxy-worker.js). A site's public_url can also be
    overwritten with a real custom domain once that flow is wired up (see
    domains.py) -- this endpoint matches whatever ends up in that column
    either way, so custom domains start working here with no further change.
    """

    _enforce_rate_limit(http_request, "public_site", limit=60, window_seconds=60)
    normalized_host = str(host or "").strip().lower()
    if not normalized_host:
        raise HTTPException(status_code=400, detail="host is required.")
    site = session.execute(
        select(GeneratedSite).where(GeneratedSite.public_url == normalized_host)
    ).scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="No site found for this host.")
    return _public_site_payload(site)


@app.post("/api/luma/chat", response_model=LumaChatResponse)
@app.post("/api/ai/intake-assistant", response_model=LumaChatResponse)
async def luma_chat(request: LumaChatRequest, http_request: Request) -> LumaChatResponse:
    # This is the public guided-intake funnel -- prospects use it before
    # creating any real account (see /api/client/intake-session, which is
    # also unauthenticated by design), so it intentionally does not require
    # login. Per-IP rate limiting is the guardrail against unmetered OpenAI
    # cost from scripted abuse instead. See _enforce_rate_limit.
    _enforce_rate_limit(http_request, "luma_chat", limit=40, window_seconds=60)
    state = normalize_state_payload(request.current)
    if request.selectedTemplateId and not state.selectedTemplateId:
        state.selectedTemplateId = request.selectedTemplateId
    apply_current_step_hint(state, request)

    intake_decision = await intake_engine.run(
        message=request.message,
        state=state,
        conversation_history=request.history,
        selected_language=state.selectedLanguage,
    )
    intake_decision = intake_engine.validate_and_repair_decision(
        state=state,
        decision=intake_decision,
        message=request.message,
    )
    state = intake_engine.apply_decision(state, intake_decision)

    if intake_decision.canGenerate:
        final_state = await orchestrator.run(request.message, state, skip_intake_strategy=True)
        generation_missing_fields = intake_engine.missing_fields_from_state(
            final_state,
            {},
            final_state.fieldMeta,
        )
        ready = not generation_missing_fields
        plan = site_plan_from_state(final_state)
        assistant_message = assistant_message_for_state(final_state) if ready else assistant_message_for_intake_turn(intake_decision, final_state)
        next_question = "" if ready else intake_engine.fallback_question_for_missing(
            generation_missing_fields,
            final_state.selectedLanguage,
        )
    else:
        final_state = state
        ready = False
        generation_missing_fields = intake_decision.missingCriticalFields
        plan = {}
        assistant_message = assistant_message_for_intake_turn(intake_decision, final_state)
        next_question = intake_decision.nextQuestion or next_question_for_state(final_state)

    return LumaChatResponse(
        assistantMessage=assistant_message,
        emotion="success" if ready else "speaking",
        updatedFields={
            "businessName": final_state.businessName,
            "businessDescription": final_state.businessDescription,
            "industry": final_state.industry,
            "location": final_state.location,
            "servicesProducts": final_state.servicesProducts,
            "targetAudience": final_state.targetAudience,
            "preferredTone": final_state.preferredTone,
            "preferredColors": final_state.preferredColors,
            "salesFlow": final_state.salesFlow,
            "websiteIntent": final_state.websiteIntent,
            "websiteType": final_state.websiteType,
            "selectedTemplateId": final_state.selectedTemplateId,
            "selectedTemplateName": final_state.selectedTemplateName,
            "catalogType": final_state.catalogType,
            "colors": final_state.colors,
            "typography": final_state.typography,
            "generatedCopy": final_state.generatedCopy,
            "catalogItems": final_state.catalogItems,
            "fieldMeta": final_state.fieldMeta,
            "detectedIntent": intake_decision.detectedIntent.model_dump(),
            "intakeCanGenerate": intake_decision.canGenerate,
            "sitePlan": plan,
        },
        nextQuestion=next_question,
        readyToGenerate=ready,
        missingImportantFields=generation_missing_fields,
        confidence=final_state.confidence,
        selectedTemplateId=final_state.selectedTemplateId,
        selected_template_id=final_state.selectedTemplateId,
        sitePlan=plan,
        used_dev_fallback=not intake_decision.usedAI,
    )


def intake_message_for_decision(decision: LyraIntakeDecision, state: Any) -> str:
    if decision.warning:
        return {
            "es": "No pude procesar eso con suficiente precision.",
            "fr": "Je n'ai pas pu traiter cela avec assez de precision.",
            "pt": "Nao consegui processar isso com precisao suficiente.",
        }.get(state.selectedLanguage, "I could not process that with enough precision.")
    return {
        "es": "Entendido. Actualice lo que pude confirmar.",
        "fr": "Compris. J'ai mis a jour ce que je peux confirmer.",
        "pt": "Entendido. Atualizei o que pude confirmar.",
    }.get(state.selectedLanguage, "Got it. I updated what I could confirm.")


def assistant_message_for_intake_turn(decision: LyraIntakeDecision, state: Any) -> str:
    if decision.usedAI and not decision.warning:
        direct_response = str(decision.userQuestionResponse or "").strip()
        if direct_response:
            return direct_response
    return intake_message_for_decision(decision, state)


def apply_current_step_hint(state: Any, request: LumaChatRequest) -> None:
    """Use the active guided step as a deterministic hint before AI extraction.

    This prevents short answers like "Crazy Box" from being ignored just because
    they do not match a natural-language regex.
    """
    step = request.currentStep or request.current_step or ""
    message = str(request.message or "").strip()
    if not message:
        return

    if step == "websiteIntent" and not state.websiteIntent:
        state.websiteIntent = message
        mark_field_meta(state, "websiteIntent", "explicit", 0.95)
    elif step == "businessName" and not state.businessName and len(message) <= 70:
        state.businessName = message
        mark_field_meta(state, "businessName", "explicit", 0.95)
    elif step == "businessDescription" and not state.businessDescription:
        state.businessDescription = message
        mark_field_meta(state, "businessDescription", "explicit", 0.92)
    elif step == "servicesProducts" and not state.servicesProducts:
        state.servicesProducts = [item.strip() for item in re.split(r"[,;\n]+", message) if item.strip()]
        mark_field_meta(state, "servicesProducts", "explicit", 0.9)
    elif step == "preferredColors" and not state.preferredColors:
        state.preferredColors = message
        mark_field_meta(state, "preferredColors", "explicit", 0.9)
        brand_source = "explicit_delegation" if re.search(r"\b(tu decides|tú decides|decide tu|decide tú|sorprendeme|sorpréndeme|you decide)\b", message, re.I) else "explicit"
        mark_field_meta(state, "brand_style", brand_source, 0.9)
    elif step in {"preferredTone", "brand_style"} and not state.preferredTone:
        state.preferredTone = message
        brand_source = "explicit_delegation" if re.search(r"\b(tu decides|tú decides|decide tu|decide tú|sorprendeme|sorpréndeme|you decide)\b", message, re.I) else "explicit"
        mark_field_meta(state, "preferredTone", brand_source, 0.9)
        mark_field_meta(state, "brand_style", brand_source, 0.9)
    elif step in {"hasLogoPhotos", "logo"}:
        logo_source = "explicit"
        mark_field_meta(state, "logo", logo_source, 0.9)


def mark_field_meta(state: Any, field: str, source: str, confidence: float) -> None:
    meta = dict(getattr(state, "fieldMeta", {}) or {})
    meta[field] = {"source": source, "confidence": confidence}
    state.fieldMeta = meta


@app.post("/api/client/intake-session")
async def client_intake_session(
    payload: Dict[str, Any],
    authorization: str = Header(default=""),
    luma_client_session: str = Cookie(default=""),
) -> Dict[str, Any]:
    email = str(payload.get("email") or "").strip().lower()
    auth_user = authenticated_client_user(authorization, luma_client_session, required=False)
    if auth_user:
        auth_email = str(auth_user.get("email") or "").strip().lower()
        if auth_email:
            email = auth_email
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="A complete email is required.")

    force_new = bool(payload.get("forceNew"))
    project_id = str(
        payload.get("generatedSiteId")
        or payload.get("projectId")
        or payload.get("siteId")
        or ""
    ).strip()
    incoming_request_id = str(payload.get("requestId") or "").strip()
    session_key = _intake_session_key(email, project_id, incoming_request_id)
    existing = client_intake_sessions.get(session_key)
    if not existing and not force_new:
        existing = client_intake_sessions.get(_intake_session_key(email, project_id, ""))
        if not existing and incoming_request_id:
            existing = client_intake_sessions.get(_intake_session_key(email, "", incoming_request_id))
        if not existing:
            existing = client_intake_sessions.get(email)
    draft = sanitize_client_draft(payload.get("draft"))
    name = str(payload.get("name") or draft.get("businessName") or "").strip()
    selected_language = payload.get("selectedLanguage") or draft.get("selectedLanguage") or "en"

    if force_new or not existing:
        request_id = payload.get("requestId") or f"req_{uuid.uuid4().hex[:12]}"
        session_key = _intake_session_key(email, project_id, request_id)
        session = {
            "requestId": request_id,
            "request_id": request_id,
            "projectId": project_id,
            "generatedSiteId": project_id,
            "requestNumber": f"KR-{uuid.uuid4().hex[:6].upper()}",
            "request_number": "",
            "clientEmail": email,
            "client_email": email,
            "clientName": name,
            "selectedLanguage": selected_language,
            "draft": draft,
            "restored": False,
            "storageStatus": "stored",
            "storage_status": "stored",
        }
        session["request_number"] = session["requestNumber"]
        client_intake_sessions[session_key] = session
        return session

    existing["draft"] = sanitize_client_draft({**sanitize_client_draft(existing.get("draft")), **draft})
    existing["projectId"] = project_id or existing.get("projectId") or ""
    existing["generatedSiteId"] = project_id or existing.get("generatedSiteId") or ""
    existing["clientName"] = name or existing.get("clientName") or ""
    existing["selectedLanguage"] = selected_language
    existing["restored"] = True
    existing["storageStatus"] = "stored"
    existing["storage_status"] = "stored"
    client_intake_sessions[_intake_session_key(email, existing.get("projectId") or "", existing.get("requestId") or "")] = existing
    return existing


@app.post("/api/luma/edit", response_model=LyraEditResponse)
async def luma_edit(request: LyraEditRequest, http_request: Request) -> LyraEditResponse:
    _enforce_rate_limit(http_request, "luma_edit", limit=20, window_seconds=60)
    try:
        result = await edit_engine.run(
            current_schema=request.currentSchema,
            instruction=request.instruction,
            selected_language=request.selectedLanguage,
            user_context=request.userContext,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lyra edit failed: {error}") from error

    return LyraEditResponse(**result)


@app.post("/ai/website-builder", response_model=WebsiteGenerationResponse)
async def website_builder(
    request: WebsiteGenerationRequest,
    http_request: Request,
    authorization: str = Header(default=""),
    luma_client_session: str = Cookie(default=""),
    session: Session = Depends(get_session),
) -> WebsiteGenerationResponse:
    # Full site generation runs the entire multi-agent orchestrator (several
    # OpenAI calls per request, see LyraOrchestrator.run), so this gets a
    # much tighter limit than the chat/edit endpoints above.
    _enforce_rate_limit(http_request, "website_builder", limit=6, window_seconds=300)
    payload = request.model_dump()
    field_meta = build_generation_field_meta(request)
    sales_flow, sales_flow_meta = infer_generation_sales_flow_with_meta(request)
    if sales_flow_meta:
        existing_sales_meta = field_meta.get("salesFlow") or field_meta.get("sales_flow")
        normalized_sales_meta = existing_sales_meta if isinstance(existing_sales_meta, dict) else sales_flow_meta
        field_meta["salesFlow"] = normalized_sales_meta
        field_meta["sales_flow"] = normalized_sales_meta
    state = normalize_state_payload({
        "businessName": request.businessName or request.business_name,
        "businessDescription": request.businessDescription or request.business_description,
        "industry": infer_generation_industry(request),
        "location": request.location,
        "servicesProducts": request.servicesProducts or request.services_products,
        "targetAudience": request.targetAudience or request.target_audience,
        "preferredTone": request.preferredTone or request.preferred_tone or request.brandStyle,
        "preferredColors": request.preferredColors or request.preferred_colors,
        "contactInfo": request.contactInfo or request.contact_info,
        "logoUrl": request.logoUrl,
        "logoPreference": request.logoPreference,
        "logoPalette": request.logoPalette,
        "colorProvenance": request.colorProvenance.model_dump(),
        "photoUrls": request.photoUrls,
        "selectedLanguage": request.selectedLanguage,
        "selectedTemplateId": request.selected_template_id or request.designStrategy.get("selectedTemplateId"),
        "salesFlow": sales_flow,
        "fieldMeta": field_meta,
    })
    missing_fields = intake_engine.missing_fields_from_state(state, {}, field_meta)
    if missing_fields:
        return WebsiteGenerationResponse(
            website_schema={},
            catalog_source="seed_fallback",
            needs_more_info=True,
            missing_fields=missing_fields,
            next_question=generation_missing_info_message(missing_fields, state.selectedLanguage),
            storage_status="needs_more_info",
            used_dev_mock=False,
        )
    prompt_context = " ".join(str(value) for value in payload.values() if value)
    final_state = await orchestrator.run(prompt_context, state, run_review=True)
    catalog_items, catalog_source = resolve_catalog_items_and_source(final_state)
    schema = build_schema_from_state(final_state, catalog_items=catalog_items, catalog_source=catalog_source)
    auth_user = authenticated_client_user(authorization, luma_client_session, required=False)
    db_site = persist_generated_site(session, user=auth_user, request=request, schema=schema) if auth_user else None
    if not auth_user and (request.generatedSiteId or request.generated_site_id or request.projectId or request.project_id):
        raise HTTPException(status_code=401, detail="Login is required to update a saved project.")
    return WebsiteGenerationResponse(
        website_schema=schema,
        catalog_source=catalog_source,
        storage_status="stored" if db_site else "generated",
        used_dev_mock=False,
        business_id=db_site.store_id if db_site else f"biz_{uuid.uuid4().hex[:10]}",
        site_id=db_site.id if db_site else f"site_{uuid.uuid4().hex[:10]}",
        generatedSiteId=db_site.id if db_site else None,
        projectId=db_site.id if db_site else None,
        generation_id=f"gen_{uuid.uuid4().hex[:10]}",
    )


def resolve_catalog_items_and_source(state) -> tuple[list[Dict[str, Any]], CatalogSource]:
    fallback_context = " ".join([
        state.businessName or "",
        state.businessDescription or "",
        state.industry or "",
        " ".join(state.servicesProducts),
    ])
    if state.catalogItems:
        return state.catalogItems, getattr(state, "catalogSource", None) or "seed_fallback"
    if state_is_commerce_seed_target(state, fallback_context):
        return semantic_seed_catalog(state, fallback_context, count=6), "seed_fallback"
    return [], getattr(state, "catalogSource", None) or "seed_fallback"


def build_schema_from_state(
    state,
    *,
    catalog_items: list[Dict[str, Any]] | None = None,
    catalog_source: CatalogSource | None = None,
) -> Dict[str, Any]:
    name = state.businessName or "Your Business"
    template_id = state.selectedTemplateId or "corporate-company-pro"
    copy = state.generatedCopy.get("hero", {})
    headline = copy.get("headline") or name
    subheadline = copy.get("subheadline") or state.businessDescription or ""
    primary_cta = copy.get("primaryCta") or "Explore"
    if catalog_items is None or catalog_source is None:
        catalog_items, catalog_source = resolve_catalog_items_and_source(state)
    colors = state.colors or {}
    logo_preference = state.logoPreference or ""
    logo_pending_generation = bool(logo_preference and not state.logoUrl)
    logo_status = "provided" if state.logoUrl else "pending_ai_generation" if logo_pending_generation else "not_provided"
    color_provenance = (
        state.colorProvenance.model_dump()
        if hasattr(state.colorProvenance, "model_dump")
        else ColorProvenance.model_validate(state.colorProvenance or {}).model_dump()
    )

    return {
        "version": "1.0",
        "generation_metadata": {
            "catalog_source": catalog_source,
            "theme_source": "backend_generated",
            "logo_status": logo_status,
            "logo_pending_generation": logo_pending_generation,
        },
        "business": {
            "name": name,
            "description": state.businessDescription or subheadline,
            "industry": state.industry or "",
            "location": state.location or "",
            "selectedLanguage": state.selectedLanguage,
            "tone": state.preferredTone or "",
        },
        "brand": {
            "logoUrl": state.logoUrl or "",
            "logoPreference": logo_preference,
            "logoStatus": logo_status,
            "logoPendingGeneration": logo_pending_generation,
            "preferredColors": state.preferredColors or "",
            "logoPalette": state.logoPalette,
            "colorProvenance": color_provenance,
        },
        "theme": {
            "colors": {
                "background": colors.get("background", "#F8FAFC"),
                "surface": colors.get("surface", "#FFFFFF"),
                "primary": colors.get("primary", "#0F172A"),
                "secondary": colors.get("secondary", "#E2E8F0"),
                "accent": colors.get("accent", "#14B8A6"),
                "text": colors.get("text", "#111827"),
                "success": colors.get("success", "#15803D"),
                "warning": colors.get("warning", "#B45309"),
                "error": colors.get("error", "#B91C1C"),
                "info": colors.get("info", "#1D4ED8"),
            },
            "fonts": {
                "heading": state.typography.get("heading", "Inter"),
                "body": state.typography.get("body", "Inter"),
            },
            "buttons": {"primary_label": primary_cta},
        },
        "selected_template": {
            "id": template_id,
            "name": state.selectedTemplateName or template_id,
            "category": state.websiteType or "website",
            "intent": state.catalogType or "",
            "reason": "Selected by LYRA orchestrator from business intake.",
        },
        "active_template": {
            "id": template_id,
            "name": state.selectedTemplateName or template_id,
        },
        "layout_mode": {
            "template_id": template_id,
            "catalog_type": state.catalogType or "",
            "intent": state.websiteType or "",
            "navigation": {"sticky_header": True},
        },
        "catalog_model": {"catalogType": state.catalogType or "standard_catalog"},
        "navigation": [
            {"label": "Home", "page_key": "home"},
            {"label": "Catalog", "page_key": "catalog"},
            {"label": "Contact", "page_key": "contact"},
        ],
        "pages": [
            {
                "page_key": "home",
                "title": "Home",
                "slug": "/",
                "order": 1,
                "sections": [
                    {
                        "id": "hero",
                        "type": "MarketplaceHero" if state.websiteType == "marketplace" else "Hero",
                        "order": 1,
                        "editable": {
                            "headline": headline,
                            "subtitle": subheadline,
                            "primary_button": primary_cta,
                            "secondary_button": "View categories",
                        },
                        "settings": {"layout": "commerce", "container_width": "wide"},
                    },
                    {
                        "id": "catalog",
                        "type": "ProductGrid",
                        "order": 2,
                        "editable": {
                            "title": "Featured products",
                            "text": "Editable products generated from the business strategy.",
                        },
                        "settings": {"layout": "marketplace_grid", "columns": 4},
                    },
                ],
            },
            {
                "page_key": "catalog",
                "title": "Catalog",
                "slug": "/catalog",
                "order": 2,
                "sections": [
                    {
                        "id": "catalog_grid",
                        "type": "ProductGrid",
                        "order": 1,
                        "editable": {"title": "Catalog", "text": "Browse available products."},
                        "settings": {"layout": "marketplace_grid", "columns": 4},
                    }
                ],
            },
            {
                "page_key": "contact",
                "title": "Contact",
                "slug": "/contact",
                "order": 3,
                "sections": [
                    {
                        "id": "contact",
                        "type": "Contact",
                        "order": 1,
                        "editable": {"title": "Contact us", "text": "Send a question or request."},
                        "settings": {"layout": "simple"},
                    }
                ],
            },
        ],
        "catalog_items": catalog_items,
        "global_components": {
            "logo_url": state.logoUrl or "",
            "logo_status": logo_status,
            "logo_pending_generation": logo_pending_generation,
            "logo_preference": logo_preference,
        },
        "quality_rules": {
            "intakeIsStrategyOnly": True,
            "visibleCopyPolicy": "Never paste raw intake notes verbatim.",
        },
    }


# SECURITY FIX (2026-08-10): this used to mount StaticFiles(directory=ROOT_DIR)
# on "/" (plus /assets, /css, /js, /client, /start against the same ROOT_DIR).
# ROOT_DIR is the repo root, not a public-only directory -- on Render this
# resolves to the real checkout, so that mount served the raw backend source,
# supabase/enable_rls.sql, render.yaml, KREATON-ROADMAP.md, and everything
# else in the repo directly over HTTP. Confirmed live and fixed the same day:
# curl https://luma-api.vmbusinesssystems.com/backend/app/main.py was
# returning 200 with the actual file. This is the same class of exposure as
# the 2026-07-27 incident (see scripts/stage-public-site.mjs), just on the
# API's own domain instead of the GitHub Pages one, and it was never closed
# here. The real frontend is already served correctly from
# vmbusinesssystems.com via GitHub Pages -- nothing depends on this API also
# serving static files (API_BASE_URL is only ever used for JSON endpoint
# calls, never for assets/css/js). "/" now just redirects to the real site
# instead of mounting any directory, which also preserves the original intent
# noted above /healthz: giving Supabase's OAuth "Site URL" fallback something
# real to land on instead of a 404.
from fastapi.responses import RedirectResponse


@app.get("/")
async def root_redirect() -> RedirectResponse:
    return RedirectResponse(url="https://vmbusinesssystems.com/", status_code=302)
