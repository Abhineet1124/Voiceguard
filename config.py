from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "postgresql://voiceguard:voiceguard@localhost/voiceguard"
    max_upload_size: int = 50 * 1024 * 1024  # 50MB
    allowed_formats: list = ["wav", "mp3", "m4a", "ogg"]
    supported_sample_rates: list = [8000, 16000, 22050, 44100, 48000]
    
    class Config:
        env_file = ".env"

settings = Settings()
