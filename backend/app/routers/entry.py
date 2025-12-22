# backend/app/routers/entry.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import date
from app.models import Entry, EntryCreate
from app.database import get_session

router = APIRouter(prefix="/entries", tags=["Entries"])

@router.post("/", response_model=Entry)
def create_entry(entry: EntryCreate, session: Session = Depends(get_session)):
  # 确保日期格式正确
  if isinstance(entry.date_start, str):
    try:
      entry.date_start = date.fromisoformat(entry.date_start)
    except ValueError:
      raise HTTPException(
        status_code=400,
        detail="Invalid date format for date_start. Use YYYY-MM-DD"
      )

  if isinstance(entry.date_end, str):
    try:
      entry.date_end = date.fromisoformat(entry.date_end)
    except ValueError:
      raise HTTPException(
        status_code=400,
        detail="Invalid date format for date_end. Use YYYY-MM-DD"
      )

  db_entry = Entry.model_validate(entry)
  session.add(db_entry)
  session.commit()
  session.refresh(db_entry)
  return db_entry

@router.get("/", response_model=list[Entry])
def read_entries(session: Session = Depends(get_session)):
  entries = session.exec(select(Entry)).all()
  return entries
