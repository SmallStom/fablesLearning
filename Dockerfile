# 前端 Dockerfile
FROM node:20 AS builder

WORKDIR /app

# 构建参数：API 基础路径。生产环境用 "/"，前端请求路径本身已带 "/api" 前缀
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

# 使用 bash 支持 pipefail
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# 安装依赖（使用国内 npm 镜像源加速）
COPY package.json package-lock.json ./
RUN npm ci --registry=https://registry.npmmirror.com

# 复制源码并构建
COPY . .
RUN npm run build 2>&1 | tee /tmp/build.log

# 生产环境用 Nginx 托管
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
