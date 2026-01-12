# backend/app/routers/ai.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import logging
from app.services.ai_service import get_travel_advice, generate_diary_draft

# 获取 logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

class Message(BaseModel):
  role: str
  content: str

class ChatRequest(BaseModel):
  messages: List[Message]

@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
  logger.info(f"收到 AI 聊天请求，消息条数: {len(request.messages)}")

  try:
    # 限制上下文长度
    if len(request.messages) > 20:
      request.messages = request.messages[-20:]

    # 调用 Service
    response_text = await get_travel_advice([m.model_dump() for m in request.messages])

    logger.info("AI 响应生成完毕")
    return {"role": "assistant", "content": response_text}

  except Exception as e:
    logger.error(f"路由层处理 AI 请求失败: {str(e)}", exc_info=True)
    raise HTTPException(status_code=500, detail="AI Service Error")


class GenerateDiaryRequest(BaseModel):
  prompt: str
@router.post("/generate-diary")
async def generate_diary(request: GenerateDiaryRequest):
  logger.info(f"收到生成日记请求: {request.prompt[:50]}...")

  try:
    data = await generate_diary_draft(request.prompt)

    if data is None:
      raise HTTPException(status_code=500, detail="Failed to generate valid JSON from AI")

    return data
  except Exception as e:
    logger.error(f"生成日记路由错误: {str(e)}", exc_info=True)
    raise HTTPException(status_code=500, detail=str(e))