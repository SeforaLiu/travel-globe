# backend/tests/test_health.py
from fastapi.testclient import TestClient

def test_health_check(client: TestClient):
  # 你的根路径是 "/"
  res = client.get("/")
  assert res.status_code == 200
  assert "Hello, Travel Tracker Backend!" in res.json()["message"]
