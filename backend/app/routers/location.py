# routers/location.py
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from models import Location, LocationBase
from database import get_session

router = APIRouter(prefix="/locations", tags=["Locations"])

# 接口 a: GET /locations (地球光点数据)
@router.get("/", response_model=List[Location])
def get_locations(session: Session = Depends(get_session)):
    # 使用 select 语句从数据库中查询所有 Location
    locations = session.exec(select(Location)).all()
    return locations

# 接口 b: POST /locations (添加光点 - 调试用)
@router.post("/", response_model=Location)
def create_location(location: LocationBase, session: Session = Depends(get_session)):
    db_location = Location.model_validate(location)
    session.add(db_location) # 添加到 Session
    session.commit()         # 提交到数据库
    session.refresh(db_location) # 刷新对象以获取数据库自动生成的 ID
    return db_location