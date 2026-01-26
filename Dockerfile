# --- Stage 1: Builder ---
# 使用一个精简的 Python 官方镜像作为构建环境
FROM python:3.11-slim as builder

# 设置工作目录
WORKDIR /app

# 设置环境变量，告诉 pip 在哪里安装包
ENV PIP_TARGET=/app/deps
# 确保 pip 不会抱怨以 root 用户身份运行
ENV PIP_ROOT_USER_ACTION=ignore

# 升级 pip
RUN pip install --upgrade pip

# 关键一步：利用 Docker 的层缓存机制
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Final Image ---
# 使用与构建器相同的精简基础镜像
FROM python:3.11-slim

# 设置工作目录。/app 是一个通用且安全的选择。
WORKDIR /app

# 从 builder 阶段复制已安装的依赖
COPY --from=builder /app/deps /usr/local/lib/python3.11/site-packages

# 复制应用代码
# --chown 确保复制过来的文件属于我们将要使用的 UID 1001。
# 我们将用户设置为 1001，组设置为 0 (root 组)。
# 这样做的好处是，许多基础镜像默认会让所有用户属于 root 组，
# 这确保了我们的非 root 用户有权限读取这些文件。
COPY --chown=1001:0 app ./app
COPY --chown=1001:0 wsgi.py .

# 切换到非 root 用户。直接使用 UID 1001。
# 即使 /etc/passwd 文件中没有这个用户，Linux 内核也允许这样做。
# 这使得镜像在强制使用随机 UID 的环境中更具兼容性。
USER 1001

# 设置环境变量，让 Python 日志直接输出到控制台
ENV PYTHONUNBUFFERED 1

# 暴露容器的 8000 端口
EXPOSE 8000

# 容器启动时执行的命令 (保持不变)
CMD ["gunicorn", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "asgi:app"]
