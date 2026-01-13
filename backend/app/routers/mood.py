# backend/app/routers/mood.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, desc
from typing import List
from app.database import get_session
from app.models import Mood, MoodCreate, MoodResponse
from app.routers.user import get_current_user
from app.services.ai_service import analyze_mood_text
import logging

router = APIRouter(prefix="/moods", tags=["Moods"])
logger = logging.getLogger(__name__)

@router.post("", response_model=MoodResponse, status_code=status.HTTP_201_CREATED)
async def create_mood(
    mood_data: MoodCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  user_id = current_user["user_id"]

  # 1. 调用 AI 分析
  ai_result = await analyze_mood_text(mood_data.content)

  # 2. 创建数据库对象
  db_mood = Mood(
    user_id=user_id,
    content=mood_data.content,
    photo_url=mood_data.photo_url,
    photo_public_id=mood_data.photo_public_id,
    mood_vector=ai_result.get("mood_vector", 0.5),
    mood_reason=ai_result.get("mood_reason", "")
  )

  session.add(db_mood)
  session.commit()
  session.refresh(db_mood)

  return db_mood

@router.get("", response_model=List[MoodResponse])
def get_moods(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  user_id = current_user["user_id"]
  # 按时间倒序获取，最新的在前面 (前端渲染球体时可能需要反转或按此顺序连接)
  moods = session.exec(
    select(Mood)
    .where(Mood.user_id == user_id)
    .order_by(desc(Mood.created_at))
  ).all()
  return moods
