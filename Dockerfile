# 前端 Dockerfile
FROM node:20 AS builder

WORKDIR /app

# 安装依赖（使用国内 npm 镜像源加速）
COPY package.json package-lock.json ./
RUN npm ci --registry=https://registry.npmmirror.com

# 复制源码并构建
COPY . .
RUN npm run build 2>&1 | tee /tmp/build.log; exit ${PIPESTATUS[0]}

# 生产环境用 Nginx 托管
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
