# backend/app/models.py
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, field_validator, ConfigDict
from sqlalchemy import Column, DateTime, JSON, Text # [修改] 导入 Text 类型
from sqlalchemy.sql import func

# ==================== 用户相关模型 ====================
class UserBase(SQLModel):
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    entries: List["Entry"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    user_id: int
    model_config = {"from_attributes": True}

# ==================== 位置相关模型 ====================
class LocationBase(SQLModel):
    name: str = Field(index=True)
    coordinates: dict = Field(sa_column=Column(JSON), description="坐标字典，包含 lat 和 lng 键")
    country: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None

class Location(LocationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entries: List["Entry"] = Relationship(back_populates="location")

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== 照片相关模型 ====================
class PhotoBase(SQLModel):
    public_id: str = Field(index=True)
    url: str
    width: int
    height: int
    format: str
    bytes: int = Field(default=0)
    original_filename: Optional[str] = None
    created_at: Optional[datetime] = None
    # [新增] 添加验证器，使模型更健壮
    # 这个验证器确保在验证数据时，如果 bytes 字段为 None，则自动替换为 0
    # 这可以防止前端在更新时未提供 bytes 字段而导致的验证失败
    @field_validator('bytes', mode='before')
    @classmethod
    def set_bytes_default(cls, v):
        if v is None:
            return 0
        return v


class Photo(PhotoBase, table=True):
    """数据库照片表模型 - 映射到数据库表"""
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="entry.id")

    # 关系：定义 Photo -> Entry 的反向关系
    entry: "Entry" = Relationship(back_populates="photos")

class PhotoCreate(SQLModel):
    public_id: Optional[str] = None
    url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None
    bytes: Optional[int] = None
    size: Optional[int] = None
    original_filename: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(extra='allow')

    @field_validator('bytes', mode='before')
    @classmethod
    def map_size_to_bytes(cls, v, info):
        if v is None and info.data.get('size') is not None:
            return info.data['size']
        elif v is None:
            return 0
        return v

# [新增] 照片详情响应模型，用于在日记详情中展示
class PhotoDetail(PhotoBase):
    id: int

# ==================== 日记相关模型 ====================
class EntryBase(SQLModel):
    title: str
    # [新增] 按照需求，添加 content 字段用于存储日记正文
    content: Optional[str] = Field(default=None, sa_column=Column(Text))
    location_name: str
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    entry_type: str = "visited"
    coordinates: dict = Field(sa_column=Column(JSON), description="坐标字典，包含 lat 和 lng 键")
    transportation: Optional[str] = None

    # 以下字段保留在基础模型中，但在API响应时按需剔除
    description: Optional[str] = None
    travel_partner: Optional[str] = None
    cost: Optional[float] = None
    mood: Optional[str] = None

class EntryCreate(EntryBase):
    """创建日记的请求模型"""
    photos: List[PhotoCreate] = []

    # 移除不需要前端传入的字段，让模型更干净
    # 如果前端依然会传这些字段，保留它们也无妨，Pydantic会处理
    model_config = ConfigDict(
        # 移除了 description, travel_partner, cost, mood
        # 但为了兼容性，暂时保留它们在 EntryBase 中
    )

    @field_validator('date_start', 'date_end', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
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
    # [修改] 完善 Entry -> Photo 的关系，并设置级联删除
    photos: List["Photo"] = Relationship(
        back_populates="entry",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan", # 级联删除：删除日记时，关联的照片也一并删除
            "lazy": "selectin" # 优化查询：获取日记时，通过一次 select in 查询加载所有照片
        }
    )
    location: Optional["Location"] = Relationship(back_populates="entries")

class EntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None # [新增] 允许更新 content
    location_name: Optional[str] = None
    description: Optional[str] = None
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    entry_type: Optional[str] = None
    coordinates: Optional[dict] = None
    transportation: Optional[str] = None
    travel_partner: Optional[str] = None
    cost: Optional[float] = None
    mood: Optional[str] = None
    location_id: Optional[int] = None
    photos: Optional[List[PhotoCreate]] = None

# --- 以下是为满足新需求定义的新模型 ---

# [新增] 需求 1 & 3: 新增和详情接口的响应模型
class EntryDetailResponse(SQLModel):
    """用于日记详情页的响应模型"""
    id: int
    title: str
    content: Optional[str] # 包含 content
    location_name: str
    date_start: Optional[date]
    date_end: Optional[date]
    entry_type: str
    coordinates: Dict[str, Any]
    transportation: Optional[str]
    created_time: datetime
    user_id: int
    location_id: Optional[int]
    photos: List[PhotoDetail] # 包含 photos 列表

    model_config = {"from_attributes": True}

# [新增] 需求 2: 日记列表接口的单项模型
class DiaryListItem(SQLModel):
    """用于日记列表的响应模型（精简字段）"""
    id: int
    title: str
    location_name: str
    transportation: Optional[str]
    date_start: Optional[date]
    date_end: Optional[date]
    entry_type: str
    created_time: datetime
    user_id: int
    location_id: Optional[int]
    coordinates: Dict[str, Any]

    model_config = {"from_attributes": True}

# [修改] 需求 2: 日记列表的整体响应模型
class DiaryListResponse(SQLModel):
    items: List[DiaryListItem] # [修改] 使用新的精简模型
    total: int
    page: int
    page_size: int
    total_pages: int
    diary_total: int
    guide_total: int
    place_total: int
    keyword: Optional[str] = None
    entry_type: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
