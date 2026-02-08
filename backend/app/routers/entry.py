# backend/app/routers/entry.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func, or_, desc, col
from datetime import date, datetime, timedelta
from typing import List, Optional
import logging
from app.models import (
  Entry, EntryCreate, EntryUpdate, Photo, PhotoCreate, Location,
  DiaryListResponse, DiaryListItem, EntryDetailResponse
)
from app.database import get_session
from app.routers.user import get_current_user
from app.services.geocoder import Geocoder
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/entries", tags=["Entries"])

# ==================== 缓存配置 ====================
# 地理编码缓存 - 内存缓存，重启服务会丢失
location_cache = {}

# 统计信息缓存（可考虑使用 Redis 在生产环境）
# 结构: {"user_stats_{user_id}": (stats_data, cache_time)}
stats_cache = {}
STATS_CACHE_TTL_MINUTES = 5  # 统计信息缓存5分钟


def clear_expired_cache():
  """清理过期的缓存项"""
  current_time = datetime.now()
  expired_keys = []

  for key, (_, cache_time) in stats_cache.items():
    if current_time - cache_time > timedelta(minutes=STATS_CACHE_TTL_MINUTES):
      expired_keys.append(key)

  for key in expired_keys:
    del stats_cache[key]
    logger.debug(f"清理过期缓存: {key}")


def get_user_stats(user_id: int, session: Session, force_refresh: bool = False):
  """
  获取用户统计信息（带缓存）

  Args:
      user_id: 用户ID
      session: 数据库会话
      force_refresh: 是否强制刷新缓存

  Returns:
      dict: 包含统计信息的字典
  """
  cache_key = f"user_stats_{user_id}"
  current_time = datetime.now()

  # 定期清理过期缓存
  if len(stats_cache) > 1000:  # 防止缓存过大
    clear_expired_cache()

  # 检查缓存（除非强制刷新）
  if not force_refresh and cache_key in stats_cache:
    cached_data, cached_time = stats_cache[cache_key]
    if current_time - cached_time < timedelta(minutes=STATS_CACHE_TTL_MINUTES):
      logger.debug(f"使用缓存的统计信息: user_id={user_id}")
      return cached_data
    else:
      logger.debug(f"缓存已过期: user_id={user_id}")
      del stats_cache[cache_key]

  # 重新计算统计信息
  logger.debug(f"计算用户统计信息: user_id={user_id}")
  start_time = datetime.now()

  try:
    # 1. 计算 diary_total (visited 日记总数)
    diary_total = session.exec(
      select(func.count(Entry.id))
      .where(Entry.user_id == user_id)
      .where(Entry.entry_type == "visited")
    ).one() or 0

    # 2. 计算 guide_total (wishlist 日记总数)
    guide_total = session.exec(
      select(func.count(Entry.id))
      .where(Entry.user_id == user_id)
      .where(Entry.entry_type == "wishlist")
    ).one() or 0

    # 3. 计算 place_total (不重复的 visited 地点总数)
    place_total = session.exec(
      select(func.count(func.distinct(Entry.location_name)))
      .where(Entry.user_id == user_id)
      .where(Entry.entry_type == "visited")
    ).one() or 0

    # 4. 计算总日记数（包括所有类型）
    total_entries = session.exec(
      select(func.count(Entry.id))
      .where(Entry.user_id == user_id)
    ).one() or 0

    stats = {
      "diary_total": diary_total,
      "guide_total": guide_total,
      "place_total": place_total,
      "total_entries": total_entries
    }

    # 更新缓存
    stats_cache[cache_key] = (stats, current_time)

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"用户统计计算完成: user_id={user_id}, "
                f"耗时: {elapsed:.3f}秒, "
                f"结果: diary_total={diary_total}, "
                f"guide_total={guide_total}, "
                f"place_total={place_total}")

    return stats

  except Exception as e:
    logger.error(f"计算用户统计信息失败: user_id={user_id}, 错误: {str(e)}", exc_info=True)
    # 返回默认值
    return {
      "diary_total": 0,
      "guide_total": 0,
      "place_total": 0,
      "total_entries": 0
    }


def invalidate_user_stats_cache(user_id: int):
  """使指定用户的统计缓存失效"""
  cache_key = f"user_stats_{user_id}"
  if cache_key in stats_cache:
    del stats_cache[cache_key]
    logger.debug(f"已使缓存失效: {cache_key}")


# ==================== 统计响应模型 ====================
class UserStatsResponse(BaseModel):
  """用户统计信息响应模型"""
  diary_total: int
  guide_total: int
  place_total: int
  total_entries: int

  model_config = {"from_attributes": True}


class CacheInfoResponse(BaseModel):
  """缓存信息响应模型"""
  stats_cache_size: int
  location_cache_size: int
  stats_cache_ttl_minutes: int
  user_stats: dict


# ==================== 位置管理函数 ====================
async def get_or_create_location(coords: dict, location_name: str, session: Session) -> Optional[Location]:
  """
  获取或创建位置信息 - 优化版本
  Args:
      coords: 坐标字典，包含 lat 和 lng 键
      location_name: 位置名称
      session: 数据库会话
  Returns:
      Location 对象或 None
  """
  try:
    # 确保坐标有正确的键
    if not coords or "lat" not in coords or "lng" not in coords:
      logger.warning(f"无效的坐标: {coords}")
      return None

    # 生成缓存键（保留6位小数）
    lat = float(coords["lat"])
    lng = float(coords["lng"])
    cache_key = f"{lat:.6f}_{lng:.6f}"

    # 检查缓存
    if cache_key in location_cache:
      logger.debug(f"使用缓存的位置ID: {cache_key}")
      cached_location_id = location_cache[cache_key]
      cached_location = session.get(Location, cached_location_id)
      if cached_location:
        return cached_location

    # 临时方案：查询所有位置（建议修改模型添加独立字段）
    all_locations = session.exec(select(Location)).all()

    for location in all_locations:
      location_coords = location.coordinates
      if isinstance(location_coords, dict) and "lat" in location_coords and "lng" in location_coords:
        db_lat = float(location_coords["lat"])
        db_lng = float(location_coords["lng"])

        # 使用容差值（约11米精度）
        if (abs(db_lat - lat) < 0.0001 and
            abs(db_lng - lng) < 0.0001):
          logger.debug(f"在数据库中找到现有位置: {location.name}")
          location_cache[cache_key] = location.id
          return location

    # 创建新位置
    location = await Geocoder.reverse_geocode(coords, location_name)
    if location:
      # 检查是否有同名位置
      existing_by_name = session.exec(
        select(Location).where(Location.name == location_name)
      ).first()

      if existing_by_name:
        location_cache[cache_key] = existing_by_name.id
        return existing_by_name

      session.add(location)
      session.commit()
      session.refresh(location)
      location_cache[cache_key] = location.id
      logger.info(f"创建新位置: {location.name}, ID: {location.id}")
      return location

  except Exception as e:
    logger.error(f"获取或创建位置失败: {str(e)}", exc_info=True)

  return None


#  需求 1: 新增日记接口
@router.post("", response_model=EntryDetailResponse, status_code=status.HTTP_201_CREATED) #  使用新的响应模型，并返回 201 Created
async def create_entry(
    entry_data: EntryCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  创建一篇新日记。
  - 会自动处理 `content` 和 `photos` 的存储。
  - 返回的数据结构经过裁剪，符合 `EntryDetailResponse` 模型。
  """
  user_id = current_user["user_id"]
  # [新增] 增加日志，方便调试
  logger.info(f"用户 {user_id} 正在创建日记, 标题: '{entry_data.title}', 照片数: {len(entry_data.photos)}")
  logger.debug(f"接收到的日记内容(前50字符): {entry_data.content[:50] if entry_data.content else '无'}")
  try:
    location_obj = await get_or_create_location(entry_data.coordinates, entry_data.location_name, session)

    # 使用 exclude 剔除前端传来但我们不需要直接存入 Entry 的字段
    entry_dict = entry_data.model_dump(exclude={"photos"})
    entry_dict.update({
      "user_id": user_id,
      "location_id": location_obj.id if location_obj else None
    })
    db_entry = Entry.model_validate(entry_dict) # 使用 model_validate 更安全
    session.add(db_entry)
    session.flush()  # flush() 以便获取 db_entry.id
    # 处理照片
    if entry_data.photos:
      for photo_data in entry_data.photos:
        # model_dump() 会自动处理 size -> bytes 的映射
        photo_dict = photo_data.model_dump(exclude_unset=True)
        # 确保关键字段存在
        if 'public_id' in photo_dict and 'url' in photo_dict:
          db_photo = Photo(**photo_dict, entry_id=db_entry.id)
          session.add(db_photo)
          logger.debug(f"照片 {photo_dict['public_id']} 已关联到日记 {db_entry.id}")
        else:
          logger.warning(f"跳过一张无效的照片数据: {photo_dict}")
    session.commit()
    session.refresh(db_entry)
    invalidate_user_stats_cache(user_id)
    logger.info(f"日记创建成功, ID: {db_entry.id}, 标题: '{db_entry.title}'")

    # 返回新创建的日记，FastAPI 会自动根据 response_model (EntryDetailResponse) 序列化
    return db_entry
  except Exception as e:
    logger.error(f"创建日记时发生意外错误: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="创建日记失败，服务器内部错误"
    )
  
# 需求 2: 获取日记列表接口
@router.get("", response_model=DiaryListResponse)
def get_diaries(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    get_all: bool = Query(False),
    force_refresh_stats: bool = Query(False),
    sort_by: str = Query("created_time", enum=["created_time", "date_start"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    # 筛选参数
    keyword: Optional[str] = Query(None, description="搜索关键词(标题或内容)"),
    entry_type: Optional[str] = Query(None, enum=["visited", "wishlist"], description="日记类型筛选"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取当前用户的日记列表。
  支持分页、排序、类型筛选和关键词搜索。
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 请求日记列表: page={page}, keyword={keyword}, type={entry_type}")
  # 1. 获取基础统计信息 (默认使用全局缓存)
  # 这里包含了全局的 place_total，根据需求，这个值即使在搜索时也不变
  stats = get_user_stats(user_id, session, force_refresh=force_refresh_stats)
  # [新增逻辑] 如果有 keyword，重新计算 diary_total 和 guide_total
  if keyword:
    logger.debug(f"检测到搜索关键词 '{keyword}'，正在重新计算筛选后的统计信息...")
    search_term = f"%{keyword}%"
    search_condition = or_(
      col(Entry.title).ilike(search_term),
      col(Entry.content).ilike(search_term)
    )
    # 1.1 计算与 keyword 相关的 visited 总数 (diary_total)
    filtered_diary_total = session.exec(
      select(func.count(Entry.id))
      .where(Entry.user_id == user_id)
      .where(Entry.entry_type == "visited")
      .where(search_condition)
    ).one() or 0
    # 1.2 计算与 keyword 相关的 wishlist 总数 (guide_total)
    filtered_guide_total = session.exec(
      select(func.count(Entry.id))
      .where(Entry.user_id == user_id)
      .where(Entry.entry_type == "wishlist")
      .where(search_condition)
    ).one() or 0
    # 覆盖 stats 字典中的值
    # 注意：place_total 保持原样 (stats["place_total"])
    stats = {
      "diary_total": filtered_diary_total,
      "guide_total": filtered_guide_total,
      "place_total": stats["place_total"], # 保持不变
      "total_entries": stats["total_entries"]
    }
  # 2. 构建基础查询 (用于获取列表数据)
  base_query = select(Entry).where(Entry.user_id == user_id)
  # 3. 应用类型筛选
  if entry_type:
    base_query = base_query.where(Entry.entry_type == entry_type)
  # 4. 应用关键词搜索
  if keyword:
    search_term = f"%{keyword}%"
    base_query = base_query.where(
      or_(
        col(Entry.title).ilike(search_term),
        col(Entry.content).ilike(search_term)
      )
    )
  # 5. 计算筛选后的列表总条数 (用于分页)
  if keyword or entry_type:
    count_query = select(func.count()).select_from(base_query.subquery())
    total_entries = session.exec(count_query).one()
  else:
    total_entries = stats["total_entries"]
  # 6. 应用排序
  if keyword:
    # 相关度排序：标题匹配优先
    search_term = f"%{keyword}%"
    base_query = base_query.order_by(
      desc(col(Entry.title).ilike(search_term)),
      Entry.created_time.desc()
    )
  else:
    # 常规排序
    sort_column = Entry.date_start if sort_by == "date_start" else Entry.created_time
    order_by = sort_column.asc() if sort_order.lower() == "asc" else sort_column.desc()
    base_query = base_query.order_by(order_by)
  # 7. 应用分页
  if get_all:
    entries = session.exec(base_query).all()
    page_size = total_entries if total_entries > 0 else 1
    total_pages = 1
  else:
    offset = (page - 1) * page_size
    entries = session.exec(base_query.offset(offset).limit(page_size)).all()
    total_pages = (total_entries + page_size - 1) // page_size if page_size > 0 else 1
  items = [DiaryListItem.model_validate(entry) for entry in entries]
  # 返回响应
  return DiaryListResponse(
    items=items,
    total=total_entries,
    page=page,
    page_size=page_size,
    total_pages=total_pages,
    # 使用处理后的 stats 数据
    diary_total=stats["diary_total"],
    guide_total=stats["guide_total"],
    place_total=stats["place_total"],
    keyword=keyword,
    entry_type=entry_type
  )

#  需求 3: 获取日记详情接口
@router.get("/{entry_id}", response_model=EntryDetailResponse) #  使用新的响应模型
def get_diary_detail(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取单篇日记详情。
  - 返回的数据包含 `content` 和 `photos`。
  - 不会返回 `cost`, `description`, `mood`, `travel_partner` 等字段。
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 请求日记详情, ID: {entry_id}")
  entry = session.exec(
    select(Entry).where(Entry.id == entry_id, Entry.user_id == user_id)
  ).first()
  if not entry:
    logger.warning(f"用户 {user_id} 尝试访问不存在或不属于自己的日记, ID: {entry_id}")
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="日记不存在或无权访问"
    )
  logger.info(f"成功返回日记详情, ID: {entry_id}")
  # 直接返回数据库对象 entry 即可
  # FastAPI 会自动根据 response_model (EntryDetailResponse) 来过滤和格式化数据
  return entry

# 更新日记
@router.put("/{entry_id}", response_model=EntryDetailResponse)
async def update_diary(
    entry_id: int,
    update_data: EntryUpdate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  更新一篇日记。
  - 支持部分字段更新。
  - 照片列表会进行完全同步（先删后增）。
  - 自动处理位置信息和缓存失效。
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 正在更新日记, ID: {entry_id}")
  logger.debug(f"收到的更新数据: {update_data.model_dump_json(indent=2)}")
  # 1. 获取并验证日记所有权
  db_entry = session.exec(
    select(Entry).where(Entry.id == entry_id, Entry.user_id == user_id)
  ).first()
  if not db_entry:
    logger.warning(f"用户 {user_id} 尝试更新不存在或不属于自己的日记, ID: {entry_id}")
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="日记不存在或无权访问"
    )
  logger.info(f"[BEFORE UPDATE] 日记ID {entry_id}: date_start={db_entry.date_start}, date_end={db_entry.date_end}")
  try:
    # 2. 更新基础字段 (除照片外的所有字段)
    # exclude_unset=True 确保只更新前端发送了的字段
    update_dict = update_data.model_dump(exclude_unset=True, exclude={"photos"})
    logger.debug(f"准备更新的字段: {update_dict}")

    for key, value in update_dict.items():
      # [修复] 删除 if value is not None 判断
      # 只要 key 存在于 update_dict 中，说明前端显式发送了该字段
      # 即使 value 是 None，也应该更新数据库（即清空该字段）
      setattr(db_entry, key, value)

    # 3. [重构] 单独处理位置信息更新逻辑
    # 检查前端是否意图更新位置（提供了坐标和名称）
    # 注意：这里需要判断是否为 None，因为如果前端没传，我们不想覆盖
    if update_data.coordinates is not None and update_data.location_name is not None:
      logger.info(f"日记 {entry_id} 正在更新位置: '{update_data.location_name}'")
      # 3.1 获取或创建新的 Location 对象，并更新 location_id
      location_obj = await get_or_create_location(
        update_data.coordinates, update_data.location_name, session
      )
      db_entry.location_id = location_obj.id if location_obj else db_entry.location_id
      # 3.2 同步更新 Entry 对象自身的 location_name 和 coordinates
      db_entry.location_name = update_data.location_name
      db_entry.coordinates = update_data.coordinates
    # 4. 同步照片列表 (如果提供了 photos 字段)
    if update_data.photos is not None:
      logger.info(f"日记 {entry_id} 正在同步照片列表...")
      # 4.1 先删除所有旧照片
      old_photos = session.exec(select(Photo).where(Photo.entry_id == entry_id)).all()
      if old_photos:
        logger.debug(f"找到 {len(old_photos)} 张旧照片, 准备删除...")
        for photo in old_photos:
          session.delete(photo)
      # 4.2 添加所有新照片
      if update_data.photos:
        logger.debug(f"准备添加 {len(update_data.photos)} 张新照片...")
        for photo_data in update_data.photos:
          new_photo = Photo.model_validate(photo_data, update={"entry_id": db_entry.id})
          session.add(new_photo)
    # [新增] 增加日志，记录提交前的最终数据状态
    logger.info(f"[AFTER UPDATE] 日记ID {entry_id}: date_start={db_entry.date_start}, date_end={db_entry.date_end}")

    # 5. 提交事务
    session.add(db_entry)
    session.commit()
    # 6. 刷新数据并使缓存失效
    session.refresh(db_entry)
    invalidate_user_stats_cache(user_id)
    logger.info(f"日记 {entry_id} 更新成功!")
    return db_entry
  except Exception as e:
    logger.error(f"更新日记 {entry_id} 时发生意外错误: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="更新日记失败，服务器内部错误"
    )

# 删除日记
@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diary(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  user_id = current_user["user_id"]
  entry = session.exec(select(Entry).where(Entry.id == entry_id, Entry.user_id == user_id)).first()
  if not entry:
    raise HTTPException(status_code=404, detail="日记不存在或无权访问")

  session.delete(entry)
  session.commit()
  invalidate_user_stats_cache(user_id)
  return None # 204 响应不需要 body


# ==================== 统计信息独立接口 ====================
@router.get("/stats/summary", response_model=UserStatsResponse)
def get_user_stats_summary(
    force_refresh: bool = Query(False, description="是否强制刷新统计缓存"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取用户统计信息（独立接口）

  可用于前端单独获取统计信息而不需要获取日记列表
  """
  user_id = current_user["user_id"]
  logger.debug(f"用户 {user_id} 请求统计信息: force_refresh={force_refresh}")

  stats = get_user_stats(user_id, session, force_refresh=force_refresh)

  return UserStatsResponse(
    diary_total=stats["diary_total"],
    guide_total=stats["guide_total"],
    place_total=stats["place_total"],
    total_entries=stats["total_entries"]
  )
