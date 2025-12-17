# routers/user.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
from app.models import User, UserCreate
from app.database import get_session

# 配置
SECRET_KEY = "your-secret-key-change-this-in-production"  # 在生产环境中应该从环境变量读取
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 修改router前缀为/api/auth
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger(__name__)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(session: Session, username: str, password: str):
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
def register_user(user: UserCreate, session: Session = Depends(get_session)):  # 修改参数类型为UserCreate
    print("接收到用户注册请求")
    logger.info(f"注册请求: {user.username}")
    # 检查用户名是否已存在
    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # 创建新用户
    db_user = User(username=user.username)
    db_user.set_password(user.password)  # 现在可以正确访问password字段
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return {"message": "User created successfully"}


@router.post("/login")
def login_user(user_data: UserCreate, session: Session = Depends(get_session)):  # 也改为使用UserCreate
    user = authenticate_user(session, user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout_user():
    # JWT是无状态的，不需要服务器端清理
    return {"message": "Logged out successfully"}
