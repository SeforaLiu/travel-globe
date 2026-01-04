# backend/app/models.py
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, field_validator, ConfigDict
from sqlalchemy import Column, DateTime, JSON
from sqlalchemy.sql import func

# ==================== 用户相关模型 ====================
class UserBase(SQLModel):
    username: str
    # email 字段已移除，注册和登录只需要用户名和密码
    # email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str

    # 关系
    entries: List["Entry"] = Relationship(back_populates="user")


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    user_id: int  # 兼容前端，实际是 id

    model_config = {"from_attributes": True}


# ==================== 位置相关模型 ====================
class LocationBase(SQLModel):
    name: str = Field(index=True)
    # FIXED: 使用 JSON 列存储字典数据
    coordinates: dict = Field(
        sa_column=Column(JSON),
        description="坐标字典，包含 lat 和 lng 键"
    )
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None


class Location(LocationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # 关系
    entries: List["Entry"] = Relationship(back_populates="location")


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: int

    model_config = {"from_attributes": True}


# ==================== 照片相关模型 ====================
class PhotoBase(SQLModel):
    """照片模型基类 - 包含所有照片字段定义"""
    public_id: str = Field(index=True)
    url: str
    width: int
    height: int
    format: str
    bytes: int = Field(default=0)  # 提供默认值
    original_filename: Optional[str] = None
    created_at: Optional[datetime] = None

# ADD: 缺失的 Photo 表模型
class Photo(PhotoBase, table=True):
    """数据库照片表模型 - 映射到数据库表"""
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="entry.id")

    # 关系
    entry: "Entry" = Relationship(back_populates="photos")

class PhotoCreate(SQLModel):
    """创建照片的请求模型 - 所有字段可选，灵活接收前端数据"""
    public_id: Optional[str] = None
    url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None
    bytes: Optional[int] = None
    size: Optional[int] = None  # 接受前端的 size 字段
    original_filename: Optional[str] = None
    created_at: Optional[datetime] = None

    # 允许接收前端额外字段（如 folder, originalFilename 等）
    model_config = ConfigDict(extra='allow')

    @field_validator('bytes', mode='before')
    @classmethod
    def map_size_to_bytes(cls, v, info):
        """如果 bytes 为空但 size 存在，自动映射"""
        if v is None and info.data.get('size') is not None:
            return info.data['size']
        elif v is None:
            return 0  # 提供默认值
        return v


# ==================== 日记相关模型 ====================
class EntryBase(SQLModel):
    title: str
    location_name: str
    description: Optional[str] = None
    date_start: Optional[date] = None  # ✅ 改为可选
    date_end: Optional[date] = None    # ✅ 改为可选
    entry_type: str = "visited"
    coordinates: dict = Field(
        sa_column=Column(JSON),
        description="坐标字典，包含 lat 和 lng 键"
    )
    travel_partner: Optional[str] = None
    cost: Optional[float] = None
    mood: Optional[str] = None

# FIX: 移除重复的 EntryCreate 定义，保留带验证器的版本
class EntryCreate(EntryBase):
    """创建日记的请求模型"""
    photos: List[PhotoCreate] = []

    @field_validator('date_start', 'date_end', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        """将空字符串转换为 None，避免验证错误"""
        if v == "":
            return None
        return v

class Entry(EntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_time: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
        default_factory=datetime.now
    )
    user_id: int = Field(foreign_key="user.id")
    location_id: Optional[int] = Field(default=None, foreign_key="location.id")
    # 关系
    user: "User" = Relationship(back_populates="entries")
    photos: List["Photo"] = Relationship(
        back_populates="entry",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin"
        }
    )
    location: Optional["Location"] = Relationship(back_populates="entries")


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    location_name: Optional[str] = None
    description: Optional[str] = None
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    entry_type: Optional[str] = None
    coordinates: Optional[dict] = None
    travel_partner: Optional[str] = None
    cost: Optional[float] = None
    mood: Optional[str] = None
    location_id: Optional[int] = None


# FIX: 将 date_start 和 date_end 改为 Optional，与 EntryBase 保持一致
class DiarySummary(SQLModel):
    id: int
    title: str
    location_name: str
    description: Optional[str] = None
    date_start: Optional[date] = None  # FIX: 允许为 None
    date_end: Optional[date] = None    # FIX: 允许为 None
    entry_type: str
    coordinates: dict
    travel_partner: Optional[str] = None
    cost: Optional[float] = None
    mood: Optional[str] = None
    created_time: datetime

    # 关联信息
    location_id: Optional[int] = None
    user_id: int
    photo_count: Optional[int] = None

    model_config = {"from_attributes": True}


class DiaryListResponse(SQLModel):
    items: List[DiarySummary]
    total: int
    page: int
    page_size: int
    total_pages: int
    diary_total: int
    guide_total: int
    place_total: int


# ==================== Token 相关模型 ====================
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
