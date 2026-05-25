from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from dotenv import load_dotenv

# Force local .env to override system environment variables (fixes 401 override issues)
load_dotenv(override=True)


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_JWT_ISSUER: str = ""
    CHROMA_DB_PATH: str = "./data/chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_CHAT_MODEL: str = "llama-3.1-8b-instant"
    MAX_SCRAPE_PAGES: int = 3
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
