from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://ujjwalraj@localhost:5432/compound"
    cors_origins: str = "http://localhost:3000"
    log_level: str = "INFO"

    ai_provider: str = "gemini"
    ai_model: str = "gemini-3.1-flash-lite"
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    ai_max_tokens: int = 2048

    # Legacy shared password gate (optional). JWT auth is preferred when configured.
    app_password: str | None = None
    jwt_secret: str = "compound-dev-secret-change-in-production"
    jwt_expire_hours: int = 168

    # Google OAuth (Sign in with Google)
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None
    frontend_url: str = "http://localhost:3000"

    @property
    def ai_enabled(self) -> bool:
        if self.ai_provider == "anthropic":
            return bool(self.anthropic_api_key)
        if self.ai_provider == "openai":
            return bool(self.openai_api_key)
        if self.ai_provider == "gemini":
            return bool(self.gemini_api_key)
        return False


settings = Settings()
