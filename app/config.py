from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(
        default="sqlite:///./store_page_generator.db",
        alias="DATABASE_URL",
    )
    default_root_domain: str = Field(default="misas.com", alias="DEFAULT_ROOT_DOMAIN")
    openai_model: str = Field(default="gpt-5-mini", alias="OPENAI_MODEL")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_chat_timeout: float = Field(default=8.0, alias="OPENAI_CHAT_TIMEOUT")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: str | None = Field(
        default=None,
        alias="SUPABASE_SERVICE_ROLE_KEY",
    )
    allow_dev_ai_mock: bool = Field(default=False, alias="ALLOW_DEV_AI_MOCK")
    allowed_origins: str = Field(
        default="http://127.0.0.1:5177,http://localhost:5177,https://vmbusinesssystems.com,https://www.vmbusinesssystems.com",
        alias="ALLOWED_ORIGINS",
    )
    admin_api_token: str | None = Field(default=None, alias="ADMIN_API_TOKEN")
    admin_allowed_emails: str = Field(default="", alias="ADMIN_ALLOWED_EMAILS")
    public_site_base_url: str = Field(
        default="http://127.0.0.1:5177/site.html",
        alias="PUBLIC_SITE_BASE_URL",
    )
    client_portal_base_url: str = Field(
        default="https://vmbusinesssystems.com/client/portal/",
        alias="CLIENT_PORTAL_BASE_URL",
    )
    public_root_domain: str = Field(
        default="vmbusinesssystems.com",
        alias="PUBLIC_ROOT_DOMAIN",
    )
    domain_provider: str = Field(default="suggestions", alias="DOMAIN_PROVIDER")
    cloudflare_account_id: str | None = Field(default=None, alias="CLOUDFLARE_ACCOUNT_ID")
    cloudflare_api_token: str | None = Field(default=None, alias="CLOUDFLARE_API_TOKEN")
    domain_included_max_usd: float = Field(default=20.0, alias="DOMAIN_INCLUDED_MAX_USD")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
