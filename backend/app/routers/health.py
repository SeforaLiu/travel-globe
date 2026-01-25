# backend/app/routers/health.py
from fastapi import APIRouter, status, Response
from typing import Dict, Any

# 从 database.py 导入你的健康检查函数
from ..database import test_database_connection
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/healthz", tags=["Monitoring"])
async def healthz(response: Response):
  # 只做最基础的连接测试
  is_alive = test_database_connection()
  if not is_alive:
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "unhealthy", "reason": "Database connection failed"}

  # 至于索引检查、JSON 检查，可以作为可选参数，或者放在另一个接口
  return {"status": "healthy"}

@router.get("/health")
def health():
  return {"status": "ok"}
