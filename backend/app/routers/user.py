# backend/app/routers/user.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
from app.models import User, UserCreate, UserLogin  # 添加 UserLogin 导入
from app.database import get_session
from app.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_DAYS = settings.ACCESS_TOKEN_EXPIRE_DAYS

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
    db_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password)  # 修复：直接设置哈希密码
    )
    # db_user.set_password(user.password)  # 移除：User模型没有set_password方法
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return {"message": "User created successfully"}


@router.post("/login")
def login_user(response: Response, user_data: UserLogin, session: Session = Depends(get_session)):
    logger.info(f"Attempting login for user: {user_data.username}") # 新增: 记录登录尝试
    user = authenticate_user(session, user_data.username, user_data.password)
    if not user:
        logger.warning(f"Login failed for user: {user_data.username}") # 新增: 记录登录失败
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    is_production = settings.ENVIRONMENT == "production"

    # 修正: secure 标志的逻辑
    # 在生产环境 (HTTPS) 中, secure 应为 True
    # 在开发环境 (HTTP) 中, secure 必须为 False
    cookie_secure_flag = is_production
    logger.info(f"Setting cookie. Environment: {settings.ENVIRONMENT}, is_production: {is_production}, secure_flag: {cookie_secure_flag}") # 新增: 记录cookie设置参数
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=cookie_secure_flag, # 修正: 使用正确的 secure 标志
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/", # 修正: 将 path 设置为根路径'/'，以确保对所有 /api/* 路径都生效，避免潜在的路径问题
        domain=None
    )
    logger.info(f"Login successful for user: {user.username}") # 新增: 记录登录成功
    return {"message": "Login successful"}


@router.post("/logout")
def logout_user(response: Response):
    # 清除Cookie
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out successfully"}

# 新增：检查用户登录状态的接口
@router.get("/me")
def get_current_user(request: Request, session: Session = Depends(get_session)):
    # 新增: 增加日志来调试 cookie 是否被接收到
    logger.info(f"Received request for /me. Cookies: {request.cookies}")

    token = request.cookies.get("access_token")
    if not token:
        logger.warning("/me request failed: No access_token cookie found.") # 新增: 记录失败原因
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.warning(f"/me request failed: Invalid token payload (sub is missing). Payload: {payload}") # 新增
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError as e:
        logger.error(f"/me request failed: JWT decoding error. Error: {e}") # 新增
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        logger.warning(f"/me request failed: User '{username}' from token not found in DB.") # 新增
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Successfully authenticated user '{username}' for /me request.") # 新增
    return {"username": user.username, "user_id": user.id}