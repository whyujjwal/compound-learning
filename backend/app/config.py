from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://ujjwalraj@localhost:5432/compound"
    cors_origins: str = "http://localhost:3000"
    log_level: str = "INFO"

    ai_provider: str = "gemini"
    ai_model: str = "gemini-2.5-flash"
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    ai_max_tokens: int = 2048

    # When set, all API routes (except /health and /auth/login) require Authorization: Bearer <token>
    app_password: str | None = None

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
