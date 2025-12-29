# backend/app/routers/user.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
from app.models import User, UserCreate
from app.database import get_session
import os
from dotenv import load_dotenv

load_dotenv()

# 从环境变量读取配置
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY 环境变量未设置！在生产环境中必须设置！")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 1

# 修改router前缀为/api/auth
router = APIRouter(prefix="/auth", tags=["Authentication"])

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
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
def register_user(user: UserCreate, session: Session = Depends(get_session)):
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
    db_user.set_password(user.password)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return {"message": "User created successfully"}


@router.post("/login")
def login_user(response: Response, user_data: UserCreate, session: Session = Depends(get_session)):
    user = authenticate_user(session, user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    # 设置HTTP-only Cookie - 改进版本
    is_development = os.getenv("ENVIRONMENT", "development") == "development"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not is_development,  # 生产环境需要 HTTPS
        samesite="lax",  # 改为 lax 以支持某些跨站请求
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api",  # 明确指定路径
        domain=None
    )

    # 注意：这里不应该返回 access_token 到前端！
    return {"message": "Login successful"}


@router.post("/logout")
def logout_user(response: Response):
    # 清除Cookie
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out successfully"}

# 新增：检查用户登录状态的接口
@router.get("/me")
def get_current_user(request: Request, session: Session = Depends(get_session)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"username": user.username, "user_id": user.id}
