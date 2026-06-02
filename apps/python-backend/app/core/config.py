from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
import sys
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    # If running as Pyinstaller bundle, .env is extracted to sys._MEIPASS
    base_dir = sys._MEIPASS
else:
    # Otherwise, it's in the python-backend root
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

env_path = os.path.join(base_dir, ".env")

# Force local .env to override system environment variables (fixes 401 override issues)
load_dotenv(dotenv_path=env_path, override=True)


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_JWT_ISSUER: str = ""
    CHROMA_DB_PATH: str = "../../data/chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"
    MAX_SCRAPE_PAGES: int = 3
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    model_config = SettingsConfigDict(env_file=env_path, extra="ignore")


settings = Settings()
