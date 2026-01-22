from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
  # --- 核心配置 ---
  ENVIRONMENT: str = "development"
  SECRET_KEY: str
  ALGORITHM: str = "HS256"
  ACCESS_TOKEN_EXPIRE_DAYS: int = 1

  # --- 数据库配置 ---
  DATABASE_URL: str

  # --- CORS 跨域配置 ---
  # ⚠️ 注意：不再使用下划线开头
  cors_origins_str: str = Field(default="", alias="CORS_ORIGINS")

  @property
  def CORS_ORIGINS(self) -> List[str]:
    """
    将逗号分隔的 cors_origins_str 解析为 List[str]
    """
    if not self.cors_origins_str:
      return []
    return [
      origin.strip()
      for origin in self.cors_origins_str.split(",")
      if origin.strip()
    ]

  # --- 第三方服务 ---
  GOOGLE_API_KEY: str

  class Config:
    env_file = Path(__file__).parent.parent / ".env"
    env_file_encoding = "utf-8"
    populate_by_name = True


settings = Settings()

print("DEBUG GOOGLE_API_KEY =", settings.GOOGLE_API_KEY)

