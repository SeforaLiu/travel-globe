# backend/app/routers/entry.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from datetime import date, datetime, timedelta
from typing import List, Optional
import logging
from app.models import (
  Entry, EntryCreate, EntryUpdate, Photo, PhotoCreate, Location,
  DiarySummary, DiaryListResponse
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


# ==================== API 端点 ====================
@router.post("", response_model=Entry, responses={
  400: {"description": "Invalid coordinates or missing required fields"},
  422: {"description": "Validation error"}
})
async def create_entry(
    entry_data: EntryCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """创建日记"""
  user_id = current_user["user_id"]
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

        # 确保 bytes 字段有值
        if 'bytes' not in photo_dict or photo_dict['bytes'] is None:
          photo_dict['bytes'] = 0

        db_photo = Photo(**photo_dict, entry_id=db_entry.id)
        session.add(db_photo)
        logger.debug(f"添加照片: {db_photo.public_id} 到日记 {db_entry.id}")
    else:
      logger.info("此日记没有照片需要处理")

    session.commit()
    session.refresh(db_entry)

    # 使当前用户的统计缓存失效
    invalidate_user_stats_cache(user_id)

    logger.info(f"日记创建成功: {db_entry.id}, 创建时间: {db_entry.created_time}")
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


    session.commit()
    session.refresh(db_entry)

    # 使当前用户的统计缓存失效
    invalidate_user_stats_cache(user_id)

    logger.info(f"日记创建成功: {db_entry.id}, 创建时间: {db_entry.created_time}")
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


# ==================== 获取日记列表（带统计信息） ====================
@router.get("", response_model=DiaryListResponse)
def get_diaries(
    page: int = Query(1, ge=1, description="页码，从1开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页最大数量"),
    get_all: bool = Query(False, description="是否获取全部数据，忽略分页"),
    force_refresh_stats: bool = Query(False, description="是否强制刷新统计缓存"),
    sort_by: str = Query("created_time", description="排序字段: created_time, date_start"),
    sort_order: str = Query("desc", description="排序顺序: asc, desc"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取当前用户的日记列表（包含统计信息）

  - 默认分页返回，每页10条
  - 设置 get_all=true 时返回全部数据
  - 新增：返回日记总数、愿望清单总数、不重复地点总数
  - sort_by: 排序字段 (created_time 或 date_start)
  - sort_order: 排序顺序 (asc 或 desc)
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 请求日记列表: "
              f"page={page}, page_size={page_size}, "
              f"get_all={get_all}, sort_by={sort_by}, sort_order={sort_order}")

  # ===== 1. 获取统计信息（带缓存） =====
  start_time = datetime.now()
  stats = get_user_stats(user_id, session, force_refresh=force_refresh_stats)

  diary_total = stats["diary_total"]
  guide_total = stats["guide_total"]
  place_total = stats["place_total"]
  total_entries = stats["total_entries"]

  stats_time = (datetime.now() - start_time).total_seconds()
  logger.debug(f"统计信息获取耗时: {stats_time:.3f}秒")

  # ===== 2. 获取日记列表 =====
  # 构建基础查询
  base_query = select(Entry).where(Entry.user_id == user_id)

  # 设置排序
  sort_column = None
  if sort_by == "date_start":
    sort_column = Entry.date_start
  else:  # 默认按创建时间排序
    sort_column = Entry.created_time

  # 设置排序顺序
  if sort_order.lower() == "asc":
    order_by = sort_column.asc()
  else:
    order_by = sort_column.desc()

  logger.debug(f"排序设置: {sort_by} {sort_order}")

  # 获取数据
  if get_all:
    # 返回全部数据
    entries = session.exec(
      base_query.order_by(order_by)
    ).all()
    items = [DiarySummary.model_validate(entry) for entry in entries]
    response = DiaryListResponse(
      items=items,
      total=total_entries,
      page=1,
      page_size=total_entries,
      total_pages=1,
      diary_total=diary_total,
      guide_total=guide_total,
      place_total=place_total
    )
    logger.info(f"返回用户 {user_id} 的全部 {total_entries} 篇日记，包含统计信息")
  else:
    # 分页返回
    offset = (page - 1) * page_size
    entries = session.exec(
      base_query.order_by(order_by)
      .offset(offset).limit(page_size)
    ).all()

    items = [DiarySummary.model_validate(entry) for entry in entries]
    total_pages = (total_entries + page_size - 1) // page_size if page_size > 0 else 1

    response = DiaryListResponse(
      items=items,
      total=total_entries,
      page=page,
      page_size=page_size,
      total_pages=total_pages,
      diary_total=diary_total,
      guide_total=guide_total,
      place_total=place_total
    )
    logger.info(f"返回用户 {user_id} 的第 {page}/{total_pages} 页日记，"
                f"共 {len(items)} 条，创建时间范围: "
                f"{items[0].created_time if items else '无'} 到 "
                f"{items[-1].created_time if items else '无'}")

  total_time = (datetime.now() - start_time).total_seconds()
  logger.debug(f"日记列表接口总耗时: {total_time:.3f}秒")

  return response


# ==================== 获取日记详情 ====================
@router.get("/{entry_id}", response_model=Entry)
def get_diary_detail(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """获取单篇日记详情（包含照片、位置等全部信息）"""
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

  logger.info(f"成功返回日记详情: entry_id={entry_id}, 创建时间: {entry.created_time}")
  return entry


# ==================== 更新日记 ====================
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
  """更新日记信息"""
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

    # 使当前用户的统计缓存失效
    invalidate_user_stats_cache(user_id)

    logger.info(f"日记更新成功: entry_id={entry_id}, 原始创建时间: {entry.created_time}")
    return entry
  except Exception as e:
    logger.error(f"日记更新失败: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(status_code=500, detail="更新失败，请稍后重试")


# ==================== 删除日记 ====================
@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, responses={
  404: {"description": "日记不存在或无权访问"}
})
def delete_diary(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """删除日记"""
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
    # 记录删除前的信息（用于审计）
    deleted_info = {
      "entry_id": entry.id,
      "title": entry.title,
      "location_name": entry.location_name,
      "created_time": entry.created_time,
      "deleted_time": datetime.now()
    }
    logger.info(f"删除日记信息: {deleted_info}")

    session.delete(entry)
    session.commit()

    # 使当前用户的统计缓存失效
    invalidate_user_stats_cache(user_id)

    logger.info(f"日记删除成功: entry_id={entry_id}")
    # 204 No Content 不需要返回 body
  except Exception as e:
    logger.error(f"日记删除失败: {str(e)}", exc_info=True)
    session.rollback()
    raise HTTPException(status_code=500, detail="删除失败，请稍后重试")


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


# ==================== 缓存管理接口（仅用于调试） ====================
@router.get("/debug/cache-info", response_model=CacheInfoResponse, include_in_schema=False)
def get_cache_info():
  """获取缓存信息（仅用于调试）"""
  # 统计缓存中的用户信息
  user_stats = {}
  current_time = datetime.now()

  for key in stats_cache:
    if key.startswith("user_stats_"):
      user_id = key.replace("user_stats_", "")
      stats_data, cache_time = stats_cache[key]
      user_stats[user_id] = {
        "cached_at": cache_time.isoformat(),
        "age_minutes": (current_time - cache_time).total_seconds() / 60,
        "stats": stats_data
      }

  cache_info = {
    "stats_cache_size": len(stats_cache),
    "location_cache_size": len(location_cache),
    "stats_cache_ttl_minutes": STATS_CACHE_TTL_MINUTES,
    "user_stats": user_stats
  }

  return cache_info


@router.post("/debug/clear-cache", include_in_schema=False)
def clear_cache(
    cache_type: str = Query("all", description="缓存类型: all, stats, location"),
    user_id: Optional[int] = Query(None, description="要清除缓存的用户ID")
):
  """清除缓存（仅用于调试）"""
  cleared = []

  if cache_type in ["all", "stats"]:
    if user_id:
      cache_key = f"user_stats_{user_id}"
      if cache_key in stats_cache:
        del stats_cache[cache_key]
        cleared.append(cache_key)
    else:
      stats_cache.clear()
      cleared.append("stats_cache")

  if cache_type in ["all", "location"]:
    location_cache.clear()
    cleared.append("location_cache")

  logger.debug(f"缓存清理完成: {cleared}")
  return {"message": f"缓存已清理: {cleared}"}


# ==================== 向后兼容接口 ====================
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
    .order_by(Entry.created_time.desc())  # 改为按创建时间排序
  ).all()
  return entries


# ==================== 获取最近创建的日记 ====================
# ✅ FIXED: 移除路径参数 {limit}，改为纯查询参数
@router.get("/recent", response_model=List[DiarySummary])
def get_recent_diaries(
    limit: int = Query(5, ge=1, le=20, description="获取最近N篇日记"),
    entry_type: Optional[str] = Query(None, description="日记类型: visited, wishlist"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  """
  获取用户最近创建的日记

  - 可以指定日记类型筛选
  - 默认返回最近5篇 visited 日记
  """
  user_id = current_user["user_id"]
  logger.info(f"用户 {user_id} 获取最近日记: limit={limit}, entry_type={entry_type}")

  # 构建查询
  query = select(Entry).where(Entry.user_id == user_id)

  if entry_type:
    query = query.where(Entry.entry_type == entry_type)

  # 按创建时间倒序，获取最近创建的
  entries = session.exec(
    query.order_by(Entry.created_time.desc()).limit(limit)
  ).all()

  items = [DiarySummary.model_validate(entry) for entry in entries]

  logger.info(f"返回用户 {user_id} 的最近 {len(items)} 篇日记")
  return items
