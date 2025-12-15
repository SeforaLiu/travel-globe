# app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()


# 允许跨域请求 (CORS)
# origins: 允许访问您 API 的前端地址 (例如：http://localhost:3000)
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from app.routers import location

app.include_router(location.router)

@app.get("/")
def read_root():
    return {"message": "Hello, Travel Tracker Backend!"}

# 运行命令：
# uvicorn main:app --reload


