# database.py
import logging
from sqlmodel import create_engine, Session, SQLModel

# 替换为您的实际连接 URL
DATABASE_URL = "postgresql://postgres:post123@localhost:5432/travel_db"

engine = create_engine(DATABASE_URL, echo=True) # echo=True 会打印 SQL 语句，方便调试

# 设置日志级别为 INFO
logging.basicConfig(level=logging.INFO)

def create_db_and_tables():
    # 根据 models.py 中定义的 ORM 模型创建数据库表
    logging.info("数据库正在创建 --- Creating database and tables...")
    SQLModel.metadata.create_all(engine)

def get_session():
    # 依赖注入函数：每次 API 调用时创建一个新的 Session
    with Session(engine) as session:
        yield session