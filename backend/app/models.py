# backend/app/models.py
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, field_validator, ConfigDict
from sqlalchemy import Column, DateTime, JSON, Text
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
    # 添加与 Mood 的反向关系
    moods: List["Mood"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    # user_id: int # 重复了，id 就是 user_id，保留一个即可
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

    @field_validator('bytes', mode='before')
    @classmethod
    def set_bytes_default(cls, v):
        if v is None:
            return 0
        return v

class Photo(PhotoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="entry.id")
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

class PhotoDetail(PhotoBase):
    id: int

# ==================== 日记相关模型 ====================
class EntryBase(SQLModel):
    title: str
    content: Optional[str] = Field(default=None, sa_column=Column(Text))
    location_name: str
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    entry_type: str = "visited"
    coordinates: dict = Field(sa_column=Column(JSON), description="坐标字典，包含 lat 和 lng 键")
    transportation: Optional[str] = None
    description: Optional[str] = None
    travel_partner: Optional[str] = None
    cost: Optional[float] = None
    mood: Optional[str] = None

class EntryCreate(EntryBase):
    photos: List[PhotoCreate] = []
    model_config = ConfigDict()

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
    content: Optional[str] = None
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

class EntryDetailResponse(SQLModel):
    id: int
    title: str
    content: Optional[str]
    location_name: str
    date_start: Optional[date]
    date_end: Optional[date]
    entry_type: str
    coordinates: Dict[str, Any]
    transportation: Optional[str]
    created_time: datetime
    user_id: int
    location_id: Optional[int]
    photos: List[PhotoDetail]
    model_config = {"from_attributes": True}

class DiaryListItem(SQLModel):
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

class DiaryListResponse(SQLModel):
    items: List[DiaryListItem]
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

# ==================== 心情 (Mood) 相关模型 ====================
class MoodBase(SQLModel):
    content: str = Field(max_length=120)
    photo_url: Optional[str] = None
    photo_public_id: Optional[str] = None

class Mood(MoodBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.now)

    # AI 分析结果
    mood_vector: float = Field(default=0.5, description="0.0(消极) - 1.0(积极)")
    mood_reason: Optional[str] = None

    user: "User" = Relationship(
        back_populates="moods",
        sa_relationship_kwargs={"lazy": "joined"}
    )

class MoodCreate(MoodBase):
    pass

class MoodResponse(MoodBase):
    id: int
    user_id: int
    created_at: datetime
    mood_vector: float
    mood_reason: Optional[str]

    model_config = {"from_attributes": True}
