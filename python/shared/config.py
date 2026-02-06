import os
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict

load_dotenv()


def is_enabled(value: str) -> bool:
    return value.lower() in ["1", "t", "true", "y", "yes"]



class KaggleConfig(BaseModel):
    api_token: str


class Config(BaseModel):
    environment: str
    log_level: str
    kaggle: KaggleConfig


config = Config(
    environment=os.getenv("ENVIRONMENT", "development"),
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    kaggle=KaggleConfig(
        api_token=os.getenv("KAGGLE_API_TOKEN", ""),
    ),
)
