from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
import sys
import platformdirs
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    # If running as Pyinstaller bundle
    base_dir = sys._MEIPASS
else:
    # Otherwise, it's in the python-backend root
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# The bundled or root .env (may be empty or contain defaults)
project_env_path = os.path.join(base_dir, ".env")

# The user-specific config .env file for BYOK
user_config_dir = platformdirs.user_config_dir("AeresIDE", "Aeres")
os.makedirs(user_config_dir, exist_ok=True)
user_env_path = os.path.join(user_config_dir, "config.env")

user_data_dir = platformdirs.user_data_dir("AeresIDE", "Aeres")
os.makedirs(user_data_dir, exist_ok=True)

# Force local user .env to override project .env and system env
load_dotenv(dotenv_path=project_env_path, override=False)
load_dotenv(dotenv_path=user_env_path, override=True)


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    IDE_DIAGRAM_ENGINE: str = ""
    GOOGLE_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_JWT_ISSUER: str = ""
    CHROMA_DB_PATH: str = os.path.join(user_data_dir, "chroma_db")
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"
    MAX_SCRAPE_PAGES: int = 3
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    model_config = SettingsConfigDict(env_file=user_env_path, extra="ignore")

settings = Settings()

def update_settings_file(updates: dict):
    """Update the user_env_path with new key-value pairs."""
    import dotenv
    for key, value in updates.items():
        dotenv.set_key(user_env_path, key, value)
        # Also update running settings
        if hasattr(settings, key):
            setattr(settings, key, value)
            os.environ[key] = value
