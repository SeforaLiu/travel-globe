# backend/app/routers/entry.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from datetime import date
from typing import List, Optional
import logging
from app.models import (
  Entry, EntryCreate, EntryUpdate, Photo, Location,
  DiarySummary, DiaryListResponse
)
from app.database import get_session
from app.routers.user import get_current_user
from app.services.geocoder import Geocoder

logger = logging.getLogger(__name__)
# router = APIRouter(prefix="/api/entries", tags=["Entries"])
router = APIRouter(prefix="/entries", tags=["Entries"])

# 地理编码缓存 - 只缓存坐标键，不缓存对象
# 注意：这是内存缓存，重启服务会丢失。生产环境建议使用 Redis
location_cache = {}

async def get_or_create_location(coords: dict, location_name: str, session: Session) -> Optional[Location]:
  """
  获取或创建位置信息
  使用坐标作为缓存键，避免 Session 绑定问题
  """
  cache_key = f"{coords['lat']}_{coords['lng']}"

  # 检查缓存中是否已有相同坐标的 location_id
  if cache_key in location_cache:
    logger.debug(f"使用缓存的位置ID: {cache_key}")
    cached_location_id = location_cache[cache_key]
    # 从当前 session 获取 location 对象
    cached_location = session.get(Location, cached_location_id)
    if cached_location:
      return cached_location

  # 查询数据库中是否已存在相同坐标的地点
  # 注意：这里查询全表在生产环境性能很差，建议添加数据库索引优化
  all_locations = session.exec(select(Location)).all()

  # 在 Python 中精确比较坐标
  target_lat = float(coords["lat"])
  target_lng = float(coords["lng"])

  for location in all_locations:
    location_coords = location.coordinates
    if (isinstance(location_coords, dict) and
        "lat" in location_coords and "lng" in location_coords):
      db_lat = float(location_coords["lat"])
      db_lng = float(location_coords["lng"])

      # 使用小的容差值进行比较（处理浮点数精度问题）
      if (abs(db_lat - target_lat) < 1e-10 and
          abs(db_lng - target_lng) < 1e-10):
        logger.debug(f"在数据库中找到现有位置: {location.name}")
        # 缓存 location_id 而不是对象
        location_cache[cache_key] = location.id
        return location

  # 如果数据库中没有，根据前端传来的信息创建新地点
  location = await Geocoder.reverse_geocode(coords, location_name)
  if location:
    # 检查数据库中是否已存在相同名称的地点（避免重复）
    existing_by_name = session.exec(
      select(Location).where(Location.name == location_name)
    ).first()

    if existing_by_name:
      # 如果存在同名地点，使用现有的（但可能坐标略有不同）
      logger.debug(f"按名称使用现有位置: {existing_by_name.name}")
      location_cache[cache_key] = existing_by_name.id
      return existing_by_name
    else:
      # 新增地点到数据库
      logger.debug(f"添加新位置到数据库: {location.name}")
      session.add(location)
      session.commit()
      session.refresh(location)  # 确保获取到 ID
      # 缓存新创建的 location_id
      location_cache[cache_key] = location.id
      return location

  return None

@router.post("", response_model=Entry, responses={
  400: {"description": "Invalid coordinates or missing required fields"},
  422: {"description": "Validation error"}
})
async def create_entry(
    entry_data: EntryCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  logger.info(f"为用户 {current_user['username']} 创建日记 - 照片数量: {len(entry_data.photos)}")
  logger.debug(f"接收到的数据: date_start={entry_data.date_start}, date_end={entry_data.date_end}")

  try:
    # 1. 验证和处理坐标
    logger.debug(f"处理坐标: {entry_data.coordinates}")
    if not entry_data.coordinates:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="坐标是必填项"
      )

    # 2. 获取或创建位置信息
    location_obj = await get_or_create_location(entry_data.coordinates, entry_data.location_name, session)
    location_id = location_obj.id if location_obj else None
    if location_obj:
      logger.debug(f"使用位置: {location_obj.name}, ID: {location_id}")

    # 3. 处理日期
    date_start = entry_data.date_start
    date_end = entry_data.date_end
    logger.debug(f"最终日期 - 开始: {date_start}, 结束: {date_end}")

    # 4. 创建 Entry 对象
    entry_dict = entry_data.model_dump(exclude={"photos"})
    # 更新日期字段、用户ID和位置ID
    entry_dict.update({
      "date_start": date_start,
      "date_end": date_end,
      "user_id": current_user["user_id"],
      "location_id": location_id  # 设置位置ID
    })

    logger.debug(f"创建日记数据: {entry_dict}")

    db_entry = Entry(**entry_dict)
    session.add(db_entry)
    session.flush()  # 获取ID但不提交事务

    # 5. 处理照片
    if entry_data.photos:
      logger.info(f"为日记 {db_entry.id} 处理 {len(entry_data.photos)} 张照片")
      for photo_data in entry_data.photos:
        # 将 originalFilename 重命名为 original_filename 以匹配模型字段
        photo_dict = photo_data.model_dump()
        if 'originalFilename' in photo_dict:
          photo_dict['original_filename'] = photo_dict.pop('originalFilename')

        db_photo = Photo(**photo_dict, entry_id=db_entry.id)
        session.add(db_photo)
        logger.debug(f"添加照片: {db_photo.public_id} 到日记 {db_entry.id}")
    else:
      logger.info("此日记没有照片需要处理")

    session.commit()
    session.refresh(db_entry)

    logger.info(f"日记创建成功: {db_entry.id}")
    return db_entry

  except ValueError as e:
    logger.error(f"验证错误: {str(e)}")
    session.rollback()
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail=str(e)
    )
  except Exception as e:
    logger.error(f"意外错误: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="服务器内部错误"
    )

# ==================== A. 获取日记列表（带分页） ====================
@router.get("", response_model=DiaryListResponse)
def get_diaries(
    # 分页参数，使用 Query 显式声明
    page: int = Query(1, ge=1, description="页码，从1开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页最大数量"),
    get_all: bool = Query(False, description="是否获取全部数据，忽略分页"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取当前用户的日记列表
  - 默认分页返回，每页10条
  - 设置 get_all=true 时返回全部数据
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 请求日记列表: page={page}, page_size={page_size}, get_all={get_all}")

  # 构建基础查询（只选择需要的字段，提升性能）
  base_query = select(Entry).where(Entry.user_id == user_id)

  # 获取总数
  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()
  logger.debug(f"用户 {user_id} 共有 {total} 篇日记")

  # 获取数据
  if get_all:
    # 返回全部数据
    entries = session.exec(
      base_query.order_by(Entry.date_start.desc())
    ).all()
    items = [DiarySummary.model_validate(entry) for entry in entries]
    response = DiaryListResponse(
      items=items,
      total=total,
      page=1,
      page_size=total,
      total_pages=1
    )
    logger.info(f"返回用户 {user_id} 的全部 {total} 篇日记")
  else:
    # 分页返回
    offset = (page - 1) * page_size
    entries = session.exec(
      base_query.order_by(Entry.date_start.desc())
      .offset(offset).limit(page_size)
    ).all()

    items = [DiarySummary.model_validate(entry) for entry in entries]
    total_pages = (total + page_size - 1) // page_size  # 向上取整

    response = DiaryListResponse(
      items=items,
      total=total,
      page=page,
      page_size=page_size,
      total_pages=total_pages
    )
    logger.info(f"返回用户 {user_id} 的第 {page}/{total_pages} 页日记，共 {len(items)} 条")

  return response


# ==================== B. 获取日记详情 ====================
@router.get("/{entry_id}", response_model=Entry)
def get_diary_detail(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取单篇日记详情（包含照片、位置等全部信息）
  """
  user_id = current_user["user_id"]
  logger.debug(f"用户 {user_id} 请求日记详情: entry_id={entry_id}")

  # 查找日记并验证所有权
  entry = session.exec(
    select(Entry).where(Entry.id == entry_id)
    .where(Entry.user_id == user_id)
  ).first()

  if not entry:
    logger.warning(f"日记不存在或无权访问: entry_id={entry_id}, user_id={user_id}")
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="日记不存在或无权访问"
    )

  logger.info(f"成功返回日记详情: entry_id={entry_id}")
  return entry


# ==================== C. 更新日记 ====================
@router.put("/{entry_id}", response_model=Entry, responses={
  404: {"description": "日记不存在或无权访问"},
  400: {"description": "无效的坐标或数据格式"}
})
async def update_diary(
    entry_id: int,
    update_data: EntryUpdate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  更新日记信息
  - 只允许修改 EntryUpdate 中定义的字段
  - 如果修改了坐标或位置名，会重新处理位置信息
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 更新日记: entry_id={entry_id}")

  # 1. 查找日记并验证所有权
  entry = session.exec(
    select(Entry).where(Entry.id == entry_id).where(Entry.user_id == user_id)
  ).first()

  if not entry:
    logger.warning(f"更新失败：日记不存在或无权访问: entry_id={entry_id}")
    raise HTTPException(status_code=404, detail="日记不存在或无权访问")

  # 2. 处理位置信息更新（如果提供了坐标和位置名）
  location_id = entry.location_id
  if update_data.coordinates is not None and update_data.location_name is not None:
    logger.debug(f"更新位置信息: {update_data.location_name}, {update_data.coordinates}")
    location_obj = await get_or_create_location(
      update_data.coordinates,
      update_data.location_name,
      session
    )
    location_id = location_obj.id if location_obj else None

  # 3. 更新字段（只更新非None的字段）
  update_dict = update_data.model_dump(exclude_unset=True, exclude={"coordinates"})
  update_dict["location_id"] = location_id

  for field, value in update_dict.items():
    setattr(entry, field, value)

  try:
    session.add(entry)
    session.commit()
    session.refresh(entry)
    logger.info(f"日记更新成功: entry_id={entry_id}")
    return entry
  except Exception as e:
    logger.error(f"日记更新失败: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(status_code=500, detail="更新失败，请稍后重试")


# ==================== D. 删除日记 ====================
@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, responses={
  404: {"description": "日记不存在或无权访问"}
})
def delete_diary(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  删除日记
  - 会级联删除关联的照片（由数据库外键约束处理）
  - 不会删除位置信息（避免影响其他日记）
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 删除日记: entry_id={entry_id}")

  # 1. 查找日记并验证所有权
  entry = session.exec(
    select(Entry).where(Entry.id == entry_id).where(Entry.user_id == user_id)
  ).first()

  if not entry:
    logger.warning(f"删除失败：日记不存在或无权访问: entry_id={entry_id}")
    raise HTTPException(status_code=404, detail="日记不存在或无权访问")

  # 2. 删除日记
  try:
    session.delete(entry)
    session.commit()
    logger.info(f"日记删除成功: entry_id={entry_id}")
    # 204 No Content 不需要返回 body
  except Exception as e:
    logger.error(f"日记删除失败: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(status_code=500, detail="删除失败，请稍后重试")


# 保留原有的 read_entries 函数（向下兼容），但建议前端迁移到新接口
@router.get("/legacy", response_model=List[Entry], include_in_schema=False)
def read_entries_legacy(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """旧版接口，已废弃，仅用于向后兼容"""
  logger.warning("使用了已废弃的接口 /api/entries/legacy")
  entries = session.exec(
    select(Entry)
    .where(Entry.user_id == current_user["user_id"])
    .order_by(Entry.date_start.desc())
  ).all()
  return entries
