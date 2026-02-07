# backend/app/routers/mood.py
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session, select, desc
from sqlalchemy.orm import joinedload # [新增] 用于显式预加载
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
  try:
    user_id = current_user["user_id"]
    logger.info(f"User {user_id} creating mood with content: '{mood_data.content[:30]}...'")

    # 1. 调用 AI 分析
    ai_result = await analyze_mood_text(mood_data.content)
    logger.info(f"AI analysis completed for user {user_id}.")

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
    logger.info(f"Mood for user {user_id} committed to database.")

    # 刷新对象以获取 ID 和默认值
    session.refresh(db_mood)
    logger.info(f"Mood object refreshed from DB, new ID is: {db_mood.id}")

    # [关键步骤] 显式转换为 Pydantic 模型
    # 配合 models.py 中的 lazy="joined"，这里可以安全地读取数据
    response_data = MoodResponse.model_validate(db_mood)

    logger.info(f"Successfully created response model for mood ID {db_mood.id}. Preparing to send response.")

    return response_data

  except Exception as e:
    # 捕获所有异常，防止服务崩溃导致前端收到 Empty Response
    logger.error(f"An unexpected error occurred while creating mood: {e}", exc_info=True)
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="An internal error occurred while creating the mood."
    )

@router.get("", response_model=List[MoodResponse])
def get_moods(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  user_id = current_user["user_id"]

  # 使用 joinedload 确保关联数据被预加载，提高性能并防止 N+1 问题
  statement = (
    select(Mood)
    .where(Mood.user_id == user_id)
    .order_by(desc(Mood.created_at))
    .options(joinedload(Mood.user))
  )

  moods = session.exec(statement).all()
  return moods

@router.delete("/{mood_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood(
    mood_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 正在尝试删除心情记录, ID: {mood_id}")

  mood_to_delete = session.exec(
    select(Mood).where(Mood.id == mood_id, Mood.user_id == user_id)
  ).first()

  if not mood_to_delete:
    logger.warning(f"删除失败: 用户 {user_id} 尝试删除不存在或不属于自己的心情, ID: {mood_id}")
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Mood not found or you do not have permission to delete it"
    )

  session.delete(mood_to_delete)
  session.commit()
  logger.info(f"用户 {user_id} 成功删除心情记录, ID: {mood_id}")

  return None
