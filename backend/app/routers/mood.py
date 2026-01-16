# backend/app/routers/mood.py
from fastapi import APIRouter, Depends, HTTPException, status, Response # [修改] 导入 Response
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

# 删除心情的 API 接口
@router.delete("/{mood_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood(
    mood_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  删除指定ID的心情记录。
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 正在尝试删除心情记录, ID: {mood_id}")

  # 1. 查询要删除的心情记录，同时验证所有权
  # 这是非常关键的安全检查，确保用户只能删除自己的心情
  mood_to_delete = session.exec(
    select(Mood).where(Mood.id == mood_id, Mood.user_id == user_id)
  ).first()

  # 2. 如果找不到，说明记录不存在或不属于该用户
  if not mood_to_delete:
    logger.warning(f"删除失败: 用户 {user_id} 尝试删除不存在或不属于自己的心情, ID: {mood_id}")
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Mood not found or you do not have permission to delete it"
    )

  # 3. 执行删除并提交
  session.delete(mood_to_delete)
  session.commit()
  logger.info(f"用户 {user_id} 成功删除心情记录, ID: {mood_id}")

  # 4. 返回 204 No Content 响应
  # FastAPI 会自动处理，当 status_code 是 204 且函数返回 None 时
  return None
