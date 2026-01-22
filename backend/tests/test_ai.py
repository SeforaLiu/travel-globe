# backend/tests/test_ai.py

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

def test_ai_chat(auth_client: TestClient, mocker):
  """
  测试 AI 聊天接口。
  """
  # 1. 准备模拟数据
  mock_response = "你好，我是小蜜蜂，你的AI旅游助手。"

  # 2. [关键修改] Patch 路由模块中的引用，而不是服务模块中的定义
  # 路由文件是 app/routers/ai.py，所以路径是 app.routers.ai
  mocker.patch(
    "app.routers.ai.get_travel_advice",  # <--- 修改这里
    new_callable=AsyncMock,
    return_value=mock_response
  )

  # 3. 调用 API
  chat_request = {
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }
  res = auth_client.post("/api/ai/chat", json=chat_request)

  # 4. 验证结果
  assert res.status_code == 200
  data = res.json()
  assert data["role"] == "assistant"
  assert data["content"] == mock_response

def test_generate_diary_draft(auth_client: TestClient, mocker):
  """
  测试 AI 生成日记草稿的接口。
  """
  # 1. 准备模拟数据
  mock_diary_data = {
    "title": "AI 生成的标题",
    "content": "AI 生成的内容...",
    "location": "AI 生成的地点",
    "coordinates": {"lat": 1.0, "lng": 1.0},
    "dateStart": "2024-05-20",
    "dateEnd": "2024-05-20",
    "transportation": "AI"
  }

  # 2. Patch 路由模块中的引用
  mocker.patch(
    "app.routers.ai.generate_diary_draft", # <--- 修改这里
    new_callable=AsyncMock,
    return_value=mock_diary_data
  )

  # 3. 调用 API
  res = auth_client.post("/api/ai/generate-diary", json={"prompt": "昨天去了北京"})

  # 4. 验证结果
  # 只要 Mock 生效，就不会去调用真实的 Google API，也就不会报 Event loop closed 错误
  assert res.status_code == 200
  assert res.json() == mock_diary_data
