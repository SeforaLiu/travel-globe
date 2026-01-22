# backend/tests/test_diary.py

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models import Entry, Photo, Location

class TestDiaryCRUD:
  # 定义一些测试用的数据
  diary_data_1 = {
    "title": "东京初体验",
    "content": "今天去了涩谷，人山人海！",
    "location_name": "日本, 东京",
    "date_start": "2024-01-01",
    "date_end": "2024-01-05",
    "entry_type": "visited",
    "coordinates": {"lat": 35.6895, "lng": 139.6917},
    "transportation": "飞机",
    "photos": [
      {"public_id": "tokyo_1", "url": "http://example.com/tokyo1.jpg", "width": 800, "height": 600, "format": "jpg"}
    ]
  }
  diary_data_2 = {
    "title": "京都红叶狩",
    "content": "清水寺的红叶太美了。",
    "location_name": "日本, 京都",
    "date_start": "2024-11-20",
    "entry_type": "visited",
    "coordinates": {"lat": 35.0116, "lng": 135.7681},
    "transportation": "新干线",
    "photos": []
  }
  wishlist_data = {
    "title": "想去北海道滑雪",
    "content": "听说二世谷的雪质最好。",
    "location_name": "日本, 北海道",
    "entry_type": "wishlist",
    "coordinates": {"lat": 43.0618, "lng": 141.3545},
  }

  def test_create_diary(self, auth_client: TestClient, session: Session):
    """测试创建一篇带照片的日记"""
    res = auth_client.post("/api/entries", json=self.diary_data_1)

    assert res.status_code == 201, f"创建日记失败: {res.text}"
    data = res.json()

    # 验证响应数据
    assert data["title"] == self.diary_data_1["title"]
    assert data["content"] == self.diary_data_1["content"]
    assert len(data["photos"]) == 1
    assert data["photos"][0]["public_id"] == "tokyo_1"

    # 验证数据库
    entry_in_db = session.get(Entry, data["id"])
    assert entry_in_db is not None
    assert len(entry_in_db.photos) == 1

    # 验证是否创建了 Location
    location_in_db = session.exec(select(Location).where(Location.name == "日本, 东京")).first()
    assert location_in_db is not None
    assert entry_in_db.location_id == location_in_db.id

  def test_get_diary_detail(self, auth_client: TestClient, session: Session):
    """测试获取单篇日记详情"""
    # 先创建一篇日记
    create_res = auth_client.post("/api/entries", json=self.diary_data_1)
    assert create_res.status_code == 201
    entry_id = create_res.json()["id"]

    # 再获取它
    get_res = auth_client.get(f"/api/entries/{entry_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == entry_id
    assert data["title"] == self.diary_data_1["title"]
    assert len(data["photos"]) == 1

  def test_get_non_existent_diary(self, auth_client: TestClient):
    """测试获取不存在的日记"""
    res = auth_client.get("/api/entries/99999")
    assert res.status_code == 404

  def test_get_diaries_list(self, auth_client: TestClient, session: Session):
    """测试获取日记列表，包括分页和统计"""
    # 创建几篇日记
    auth_client.post("/api/entries", json=self.diary_data_1)
    auth_client.post("/api/entries", json=self.diary_data_2)
    auth_client.post("/api/entries", json=self.wishlist_data)

    # 1. 测试默认获取
    res = auth_client.get("/api/entries")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3 # 默认 get_all=False, page_size=10
    assert data["diary_total"] == 2 # visited
    assert data["guide_total"] == 1 # wishlist
    assert data["place_total"] == 2 # 东京, 京都 (不重复的 visited 地点)

    # 2. 测试分页
    res_page2 = auth_client.get("/api/entries?page=2&page_size=2")
    assert res_page2.status_code == 200
    data_page2 = res_page2.json()
    assert data_page2["total"] == 3
    assert len(data_page2["items"]) == 1

    # 3. 测试按类型筛选
    res_wishlist = auth_client.get("/api/entries?entry_type=wishlist")
    assert res_wishlist.status_code == 200
    data_wishlist = res_wishlist.json()
    assert data_wishlist["total"] == 1
    assert data_wishlist["items"][0]["title"] == self.wishlist_data["title"]

    # 4. 测试关键词搜索
    res_search = auth_client.get("/api/entries?keyword=红叶")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert data_search["items"][0]["title"] == self.diary_data_2["title"]
    # 搜索时，统计数据也应该被过滤
    assert data_search["diary_total"] == 1
    assert data_search["guide_total"] == 0

  def test_update_diary(self, auth_client: TestClient, session: Session):
    """测试更新日记，包括内容和照片"""
    # 先创建
    create_res = auth_client.post("/api/entries", json=self.diary_data_1)
    entry_id = create_res.json()["id"]

    update_data = {
      "title": "更新后的东京之旅",
      "content": "更新了内容，涩谷还是那么棒！",
      "photos": [
        {"public_id": "new_photo", "url": "http://example.com/new.jpg", "width": 1024, "height": 768, "format": "jpg"}
      ]
    }

    # 再更新
    update_res = auth_client.put(f"/api/entries/{entry_id}", json=update_data)
    assert update_res.status_code == 200
    data = update_res.json()

    # 验证响应
    assert data["title"] == "更新后的东京之旅"
    assert len(data["photos"]) == 1
    assert data["photos"][0]["public_id"] == "new_photo"

    # 验证数据库
    session.expire_all() # 清除 session 缓存，从数据库重新加载
    entry_in_db = session.get(Entry, entry_id)
    assert entry_in_db.title == "更新后的东京之旅"
    assert len(entry_in_db.photos) == 1
    assert entry_in_db.photos[0].public_id == "new_photo"

  def test_delete_diary(self, auth_client: TestClient, session: Session):
    """测试删除日记"""
    # 先创建
    create_res = auth_client.post("/api/entries", json=self.diary_data_1)
    entry_id = create_res.json()["id"]

    # 确认日记和照片都存在
    assert session.get(Entry, entry_id) is not None
    assert session.exec(select(Photo).where(Photo.entry_id == entry_id)).first() is not None

    # 再删除
    delete_res = auth_client.delete(f"/api/entries/{entry_id}")
    assert delete_res.status_code == 204

    # 验证数据库中是否已删除
    assert session.get(Entry, entry_id) is None
    # 验证级联删除是否生效
    assert session.exec(select(Photo).where(Photo.entry_id == entry_id)).first() is None
