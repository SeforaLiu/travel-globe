# models.py
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import date, datetime
from passlib.context import CryptContext
from pydantic import constr

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Users: 用户管理 ---
class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 建立与 Entry 的反向关系
    entries: List["Entry"] = Relationship(back_populates="user")

    def set_password(self, raw_password: str):
        """设置密码哈希"""
        self.hashed_password = pwd_context.hash(raw_password)

    def check_password(self, password: str) -> bool:
        """检查密码是否正确"""
        return pwd_context.verify(password, self.hashed_password)

class UserCreate(SQLModel):
    username: constr(min_length=6)
    password: constr(min_length=6)

class RefreshToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    user_id: int = Field(foreign_key="user.id")
    expires_at: datetime
    is_revoked: bool = Field(default=False)

    user: User = Relationship()

# --- Locations: 地球光点数据 ---
class LocationBase(SQLModel):
    # Field 中的 index=True, nullable=False 是数据库约束
    name: str = Field(index=True)
    latitude: float
    longitude: float
    color: str  # 'orange' 或 'purple'

class Location(LocationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # 建立与 Entry 的反向关系
    entries: List["Entry"] = Relationship(back_populates="location")

# --- Entries: 旅游日记/攻略 ---
class EntryBase(SQLModel):
    title: str
    content: str
    date_start: date
    date_end: date
    location_id: int = Field(foreign_key="location.id")  # 外键关联到 Location 表
    entry_type: str  # "visited" 或 "wishlist"

# 添加 EntryCreate 类
class EntryCreate(EntryBase):
    pass

class Entry(EntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")  # 外键关联到 User 表

    # 建立与 Location 的正向关系
    location: Location = Relationship(back_populates="entries")
    # 建立与 User 的正向关系
    user: User = Relationship(back_populates="entries")
