# backend/tests/test_auth.py

from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models import User

# 测试用户注册
def test_register_user(client: TestClient, session: Session):
  """
  测试用户能否成功注册。
  """
  # 1. 发送注册请求
  response = client.post("/api/auth/register", json={
    "username": "newuser",
    "password": "newpassword123",
    "avatar_url": None,
    "bio": None
  })

  # 2. 验证响应
  assert response.status_code == 200
  assert response.json() == {"message": "User created successfully"}

  # 3. 验证数据库中是否真的创建了用户
  user_in_db = session.exec(select(User).where(User.username == "newuser")).first()
  assert user_in_db is not None
  assert user_in_db.username == "newuser"

def test_register_existing_user(client: TestClient, test_user: User):
  """
  测试注册一个已存在的用户名时是否会失败。
  """
  response = client.post("/api/auth/register", json={
    "username": test_user.username, # 使用已存在的用户名
    "password": "anotherpassword"
  })
  assert response.status_code == 400
  assert "Username already registered" in response.json()["detail"]

# 测试用户登录
def test_login_success(client: TestClient, test_user: User):
  """
  测试用户能否成功登录并收到 cookie。
  """
  res = client.post("/api/auth/login", json={
    "username": test_user.username,
    "password": "password123"
  })

  # 1. 验证响应状态码和内容
  assert res.status_code == 200
  assert res.json() == {"message": "Login successful"}

  # 2. 验证是否设置了 access_token cookie
  assert "access_token" in res.cookies
  assert res.cookies["access_token"] is not None

def test_login_failure(client: TestClient):
  """
  测试使用错误的凭证登录是否会失败。
  """
  res = client.post("/api/auth/login", json={
    "username": "wronguser",
    "password": "wrongpassword"
  })
  assert res.status_code == 401
  assert "Incorrect username or password" in res.json()["detail"]

# 测试权限和当前用户信息
def test_get_current_user(auth_client: TestClient, test_user: User):
  """
  测试 /me 接口是否能正确返回已登录用户的信息。
  这里使用了 auth_client fixture，它已经处理了登录。
  """
  res = auth_client.get("/api/auth/me")
  assert res.status_code == 200
  data = res.json()
  assert data["username"] == test_user.username
  assert data["user_id"] == test_user.id

def test_unauthorized_access_to_me(client: TestClient):
  """
  测试未登录用户访问受保护的 /me 接口是否被拒绝。
  """
  res = client.get("/api/auth/me")
  assert res.status_code == 401

def test_unauthorized_access_to_diaries(client: TestClient):
  """
  测试未登录用户访问受保护的日记接口是否被拒绝。
  """
  res = client.get("/api/entries")
  assert res.status_code == 401

# 测试用户登出
def test_logout(auth_client: TestClient):
  """
  测试用户登出是否成功，并清除了 cookie。
  """
  res = auth_client.post("/api/auth/logout")
  assert res.status_code == 200
  assert res.json() == {"message": "Logged out successfully"}
  # 更健壮的 Cookie 验证
  # 检查 set-cookie 头是否存在
  assert "set-cookie" in res.headers
  cookie_header = res.headers["set-cookie"]

  # 验证关键部分：access_token 被置空，且 Max-Age 为 0 (或 Expires 是过去的时间)
  # 注意：Starlette/FastAPI 设置删除 cookie 时通常是 access_token=""
  assert 'access_token=""' in cookie_header

  # 检查 Max-Age=0 (不区分大小写)
  assert "max-age=0" in cookie_header.lower()

  # 尝试再次访问受保护的接口，应该会失败
  res_after_logout = auth_client.get("/api/auth/me")
  assert res_after_logout.status_code == 401

