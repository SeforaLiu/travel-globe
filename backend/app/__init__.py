# __init__.py
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import create_db_and_tables
from app.routers import location, user, entry, ai, mood

# 定义生命周期管理器
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行：创建数据库表
    create_db_and_tables()
    yield
    # 关闭时执行（如果需要清理资源写在这里）

# 在初始化时传入 lifespan
app = FastAPI(lifespan=lifespan)

# 允许跨域请求 (CORS)
# origins: 允许访问您 API 的前端地址
# origins = ["http://localhost:5173", "http://192.168.3.12:5173"]
origins = [
    "http://localhost:5173",
    "http://192.168.3.12:5173",
    "http://127.0.0.1:5173",
    "http://0.0.0.0:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # 新增：暴露所有头信息
)

# 注册路由
from app.routers import location

# app.include_router(location.router)
# app.include_router(user.router)
# app.include_router(entry.router)

app.include_router(entry.router, prefix="/api", tags=["entries"])
app.include_router(user.router, prefix="/api", tags=["users"])
app.include_router(location.router, prefix="/api", tags=["locations"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(mood.router, prefix="/api", tags=["moods"])

@app.get("/")
def read_root():
    return {"message": "Hello, Travel Tracker Backend! 后端正常启动啦!"}

# 运行命令：
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)



