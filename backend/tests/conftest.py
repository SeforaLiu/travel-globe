# backend/tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool  # <--- [新增] 必须导入这个
from app.database import get_session
from app import app
from app.models import User
from app.routers.user import get_password_hash

# ==================== 核心：测试数据库设置 ====================

# 使用内存数据库
TEST_DATABASE_URL = "sqlite:///:memory:"

# 配置 Engine
# 1. connect_args={"check_same_thread": False}: 允许不同线程访问同一个连接（FastAPI 需要）
# 2. poolclass=StaticPool: 保持内存数据库在整个测试会话中存在，不会因为连接断开而清空表结构
engine = create_engine(
  TEST_DATABASE_URL,
  connect_args={"check_same_thread": False},
  poolclass=StaticPool,
)

@pytest.fixture(name="session")
def session_fixture():
  """
  为每个测试创建一个独立的数据库会话。
  """
  # 在创建 session 之前，确保表已经存在
  # 这里使用了 StaticPool，所以表结构会保留
  SQLModel.metadata.create_all(engine)

  with Session(engine) as session:
    yield session

  # 测试结束后，清理数据（Drop all tables）
  # 这样每个测试用例都是干净的
  SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
  """
  创建一个 TestClient，并用测试会话覆盖真实的 get_session 依赖。
  """
  def get_session_override():
    return session

  app.dependency_overrides[get_session] = get_session_override

  # 使用 with 语句上下文管理器，确保生命周期正确处理
  with TestClient(app) as client:
    yield client

  app.dependency_overrides.clear()


# ==================== 辅助 Fixtures ====================

@pytest.fixture(name="test_user")
def test_user_fixture(session: Session) -> User:
  """
  在数据库中创建一个固定的测试用户。
  """
  username = "testuser"
  password = "password123"
  hashed_password = get_password_hash(password)

  user = User(username=username, hashed_password=hashed_password)
  session.add(user)
  session.commit()
  session.refresh(user)
  return user


@pytest.fixture(name="auth_client")
def auth_client_fixture(client: TestClient, test_user: User):
  """
  创建一个已经登录的客户端。
  """
  res = client.post("/api/auth/login", json={
    "username": test_user.username,
    "password": "password123"
  })
  assert res.status_code == 200, f"登录失败: {res.text}"
  return client
