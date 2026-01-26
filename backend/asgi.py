# wsgi.py
# 这个文件是 Gunicorn 等 ASGI/WSGI 服务器的入口点。
# 它的唯一职责就是导入在 app/__init__.py 中创建的 FastAPI 应用实例。
# 这样，服务器就知道要运行哪个对象了。

# 导入在 app 包的 __init__.py 文件中定义的 app 实例
from app import app

# 注意：这里不需要任何 uvicorn.run() 的调用。
# 运行服务器的任务将由 Gunicorn 命令行工具来完成。
