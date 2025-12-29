from typing import Optional, List, Dict, Union
from sqlmodel import SQLModel, Field, Relationship, JSON
from datetime import date, datetime
from pydantic import validator, BaseModel, ConfigDict, field_validator
import logging
from passlib.context import CryptContext

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Coordinates 模型 ---
class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="纬度，范围-90到90")
    lng: float = Field(..., ge=-180, le=180, description="经度，范围-180到180")

    def to_dict(self):
        return {"lat": self.lat, "lng": self.lng}

# --- Users ---
class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    entries: List["Entry"] = Relationship(back_populates="user")

    def set_password(self, raw_password: str):
        self.hashed_password = pwd_context.hash(raw_password)

# --- Photo 模型 ---
class PhotoBase(SQLModel):
    # 原有字段
    public_id: str
    url: str
    width: int
    height: int
    created_at: Optional[datetime] = Field(default=None)
    folder: Optional[str] = Field(default=None)
    format: Optional[str] = Field(default=None)
    original_filename: Optional[str] = Field(default=None)
    size: Optional[int] = Field(default=None)

class Photo(PhotoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="entry.id")
    entry: "Entry" = Relationship(back_populates="photos")

# --- Location 模型 ---
class LocationBase(SQLModel):
    name: str = Field(index=True)
    coordinates: Dict[str, float] = Field(sa_type=JSON)

class Location(LocationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entries: List["Entry"] = Relationship(back_populates="location")

# --- Entry 模型 ---
class EntryBase(SQLModel):
    title: str = Field(..., min_length=1)
    content: Optional[str] = Field(None)
    date_start: Optional[date] = Field(None)
    date_end: Optional[date] = Field(None)
    location_name: str = Field(..., min_length=1)
    coordinates: Dict[str, float] = Field(..., sa_type=JSON, description="必须包含 lat 和 lng")
    transportation: Optional[str] = Field(None)
    entry_type: str = Field(..., regex="^(visited|wishlist)$")

    @validator('coordinates')
    def validate_coordinates(cls, v):
        if not isinstance(v, dict):
            raise ValueError("Coordinates must be a dictionary")
        if not {'lat', 'lng'}.issubset(v.keys()):
            raise ValueError("Coordinates must contain 'lat' and 'lng'")
        if not all(isinstance(val, (int, float)) for val in v.values()):
            raise ValueError("Coordinates values must be numbers")
        return v

class EntryCreate(EntryBase):
    photos: List[PhotoBase] = []

    # 添加自定义验证器来处理空字符串转换为None
    @field_validator('date_start', 'date_end', mode='before')
    @classmethod
    def validate_date_fields(cls, v):
        """处理日期字段，将空字符串转换为None"""
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            if v.strip() == "":
                return None
            # 尝试解析日期字符串
            try:
                # 支持 "YYYY-MM-DD" 格式
                return date.fromisoformat(v)
            except ValueError:
                # 如果解析失败，抛出有意义的错误
                raise ValueError(f"Invalid date format: {v}. Expected format: YYYY-MM-DD")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "My Trip",
                "coordinates": {"lat": 35.6895, "lng": 139.6917},
                "entry_type": "visited",
                "location_name": "Tokyo",
                "photos": [
                    {
                        "created_at": "2024-01-01T10:00:00Z",
                        "folder": "travel_photos",
                        "format": "jpg",
                        "original_filename": "sunset_tokyo.jpg",
                        "public_id": "travel/sunset_tokyo_123",
                        "size": 1024000,
                        "width": 1920,
                        "height": 1080,
                        "url": "https://res.cloudinary.com/demo/image/upload/v123/travel/sunset_tokyo_123.jpg"
                    }
                ]
            }
        }
    )

class Entry(EntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    location_id: Optional[int] = Field(None, foreign_key="location.id")
    photos: List[Photo] = Relationship(back_populates="entry")
    user: User = Relationship(back_populates="entries")
    location: Optional[Location] = Relationship(back_populates="entries")

# --- 日记列表摘要模型 ---
class DiarySummary(BaseModel):
    """日记列表项，只包含必要字段"""
    id: int
    entry_type: str
    title: str
    location_name: str
    coordinates: Dict[str, float]
    date_start: Optional[date]
    date_end: Optional[date]
    transportation: Optional[str]

    model_config = ConfigDict(from_attributes=True)  # 允许从 ORM 对象转换


class DiaryListResponse(BaseModel):
    """分页响应格式"""
    items: List[DiarySummary]  # 当前页数据
    total: int  # 总条数
    page: int  # 当前页码
    page_size: int  # 每页大小
    total_pages: int  # 总页数

    model_config = ConfigDict(from_attributes=True)


class EntryUpdate(SQLModel):
    """更新日记的请求体（只允许修改这些字段）"""
    title: Optional[str] = Field(None, min_length=1)
    content: Optional[str] = None
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    location_name: Optional[str] = Field(None, min_length=1)
    coordinates: Optional[Dict[str, float]] = Field(None, sa_type=JSON)
    transportation: Optional[str] = None
    entry_type: Optional[str] = Field(None, regex="^(visited|wishlist)$")

    @field_validator('coordinates', mode='before')
    @classmethod
    def validate_coordinates(cls, v):
        """验证坐标格式"""
        if v is None:
            return None
        if not isinstance(v, dict):
            raise ValueError("坐标必须是字典格式")
        if not {'lat', 'lng'}.issubset(v.keys()):
            raise ValueError("坐标必须包含 'lat' 和 'lng'")
        if not all(isinstance(val, (int, float)) for val in v.values()):
            raise ValueError("坐标值必须是数字")
        return v
