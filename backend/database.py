# database.py
from sqlmodel import create_engine, Session, SQLModel

# 替换为您的实际连接 URL
DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/travel_db"

engine = create_engine(DATABASE_URL, echo=True) # echo=True 会打印 SQL 语句，方便调试

def create_db_and_tables():
    # 根据 models.py 中定义的 ORM 模型创建数据库表
    SQLModel.metadata.create_all(engine)

def get_session():
    # 依赖注入函数：每次 API 调用时创建一个新的 Session
    with Session(engine) as session:
        yield session