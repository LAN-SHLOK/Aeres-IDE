from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    CLERK_JWT_ISSUER: str = ""
    CHROMA_DB_PATH: str = "./data/chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    MAX_SCRAPE_PAGES: int = 3
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
