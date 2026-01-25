# backend/app/__init__.py
import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import create_db_and_tables
from app.routers import location, user, entry, ai, mood, health
from app.config import settings

# 定义生命周期管理器
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行：创建数据库表
    print("Application startup: creating database and tables if they don't exist...")
    create_db_and_tables()
    yield
    # 关闭时执行（如果需要清理资源写在这里）
    print("Application shutdown.")

# 在初始化时传入 lifespan
app = FastAPI(lifespan=lifespan)

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# 允许跨域请求 (CORS)
# origins: 从配置中动态读取，不再硬编码
# 这样做的好处是，你可以在不同环境中设置不同的允许源
# 例如，本地开发用 localhost，生产环境用你的 Vercel 前端域名
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS, # <--- 2. 使用 settings.CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 注册路由
app.include_router(entry.router, prefix="/api", tags=["entries"])
app.include_router(user.router, prefix="/api", tags=["users"])
app.include_router(location.router, prefix="/api", tags=["locations"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(mood.router, prefix="/api", tags=["moods"])
app.include_router(health.router, prefix="/api", tags=["health"])

@app.get("/")
def read_root():
    return {"message": f"Hello, Travel Tracker Backend! Environment: {settings.ENVIRONMENT}"}

# --- 本地开发启动入口 ---
# 这个代码块仅用于本地开发时的便捷启动，例如在 VS Code 中直接按 F5 运行。
# 在生产环境中，这个块不会被执行。Render/Gunicorn 会直接通过 uvicorn worker 导入上面的 `app` 对象。
if __name__ == "__main__":
    print("--- Starting Uvicorn server for local development ---")
    print(f"Starting Uvicorn server on {HOST}:{PORT}")
    # 在实际项目中，端口等配置也应该从 settings 中读取，这里为了简单起见暂时硬编码
    # uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
    uvicorn.run("app:app", host=HOST, port=PORT, reload=False)