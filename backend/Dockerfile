# 后端 Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY src/ ./src/

# 暴露端口
EXPOSE 8000

# 启动命令（环境变量通过 docker-compose env_file 注入）
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
