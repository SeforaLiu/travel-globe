from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import date
from typing import List, Optional
import logging
from app.models import Entry, EntryCreate, Photo, Location, Coordinates
from app.database import get_session
from app.routers.user import get_current_user
from app.services.geocoder import Geocoder

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/entries", tags=["Entries"])

# 地理编码缓存 - 只缓存坐标键，不缓存对象
location_cache = {}

async def get_or_create_location(coords: dict, location_name: str, session: Session) -> Optional[Location]:
  """
  获取或创建位置信息
  使用坐标作为缓存键，避免 Session 绑定问题
  """
  cache_key = f"{coords['lat']}_{coords['lng']}"

  # 检查缓存中是否已有相同坐标的 location_id
  if cache_key in location_cache:
    logger.debug(f"Using cached location ID for {cache_key}")
    cached_location_id = location_cache[cache_key]
    # 从当前 session 获取 location 对象
    cached_location = session.get(Location, cached_location_id)
    if cached_location:
      return cached_location

  # 查询数据库中是否已存在相同坐标的地点
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
        logger.debug(f"Found existing location in database: {location.name}")
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
      logger.debug(f"Using existing location by name: {existing_by_name.name}")
      location_cache[cache_key] = existing_by_name.id
      return existing_by_name
    else:
      # 新增地点到数据库
      logger.debug(f"Adding new location to database: {location.name}")
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
  logger.info(f"Creating entry for user {current_user['username']} - Photos count: {len(entry_data.photos)}")

  try:
    # 1. 验证和处理坐标
    logger.debug(f"Processing coordinates: {entry_data.coordinates}")
    if not entry_data.coordinates:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Coordinates are required"
      )

    # 2. 获取或创建位置信息
    location_obj = await get_or_create_location(entry_data.coordinates, entry_data.location_name, session)
    location_id = location_obj.id if location_obj else None
    if location_obj:
      logger.debug(f"Using location: {location_obj.name}, ID: {location_id}")

    # 3. 处理日期 (如果为 None 则使用默认值)
    date_start = entry_data.date_start if entry_data.date_start else date.today()
    date_end = entry_data.date_end if entry_data.date_end else date.today()

    # 4. 创建 Entry 对象
    entry_dict = entry_data.dict(exclude={"photos"})
    # 更新日期字段、用户ID和位置ID
    entry_dict.update({
      "date_start": date_start,
      "date_end": date_end,
      "user_id": current_user["user_id"],
      "location_id": location_id  # 设置位置ID
    })

    db_entry = Entry(**entry_dict)
    session.add(db_entry)
    session.flush()  # 获取ID但不提交事务

    # 5. 处理照片 - 只有当 photos 不为空时才处理
    if entry_data.photos:
      logger.info(f"Processing {len(entry_data.photos)} photos for entry {db_entry.id}")
      for photo_data in entry_data.photos:
        # 将 originalFilename 重命名为 original_filename 以匹配模型字段
        photo_dict = photo_data.dict()
        if 'originalFilename' in photo_dict:
          photo_dict['original_filename'] = photo_dict.pop('originalFilename')

        db_photo = Photo(**photo_dict, entry_id=db_entry.id)
        session.add(db_photo)
        logger.debug(f"Added photo: {db_photo.public_id} to entry {db_entry.id}")
    else:
      logger.info("No photos to process for this entry")

    session.commit()
    session.refresh(db_entry)

    logger.info(f"Entry created successfully: {db_entry.id}")
    return db_entry

  except ValueError as e:
    logger.error(f"Validation error: {str(e)}")
    session.rollback()  # 添加回滚
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail=str(e)
    )
  except Exception as e:
    logger.error(f"Unexpected error: {str(e)}", exc_info=True)
    session.rollback()  # 添加回滚
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Internal server error"
    )

@router.get("/", response_model=List[Entry])
def read_entries(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  logger.debug(f"Fetching entries for user {current_user['username']}")
  entries = session.exec(
    select(Entry)
    .where(Entry.user_id == current_user["user_id"])
    .order_by(Entry.date_start.desc())
  ).all()
  return entries

# 新增：获取单个日记详情接口，包含照片信息
@router.get("/{entry_id}", response_model=Entry)
def read_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
  logger.debug(f"Fetching entry {entry_id} for user {current_user['username']}")

  entry = session.exec(
    select(Entry)
    .where(Entry.id == entry_id)
    .where(Entry.user_id == current_user["user_id"])
  ).first()

  if not entry:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Entry not found"
    )

  return entry
