# models.py (示例：Locations 和 Entries)
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

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
    date_visited: str  # 简单起见，先用字符串表示日期
    location_id: int = Field(foreign_key="location.id")  # 外键关联到 Location 表


class Entry(EntryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # 建立与 Location 的正向关系
    location: Location = Relationship(back_populates="entries")

# ... 类似地定义 Photos 和 MoodEntry 模型 ...