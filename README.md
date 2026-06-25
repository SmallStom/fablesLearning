# 说一寓言 (TellMe)

一个用故事帮你理解抽象概念的学习应用。输入一个看不懂的名词，它会在一个具体的世界里生成一则寓言，把概念「裹」进角色和情节里。

## 功能

- **世界观叙事**：每个概念都放进固定世界观（如校园、电竞、职场）中生成
- **概念解析**：自动输出概念定义、学科归属、故事映射
- **理解检验**：生成理解题 + 迁移题，帮助巩固
- **世界记忆**：连续生成时，故事会引用前事、角色会成长
- **分享卡片**：把寓言生成可分享的图片/链接
- **多 LLM 支持**：平台默认 LLM 或用户自带 Key（BYOK）

## 技术栈

- 前端：React + TypeScript + Tailwind CSS + Vite
- 后端：FastAPI + Python
- 数据库：Supabase (PostgreSQL + Auth)
- LLM：OpenAI 兼容 API（支持 GPT、DeepSeek、通义千问、vLLM 本地部署等）

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd tellme

# 前端依赖
npm install

# 后端依赖
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

后端：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填写：

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Supabase JWT Secret |
| `ENCRYPTION_KEY` | Fernet 密钥，用于加密用户 BYOK API Key |
| `PLATFORM_LLM_BASE_URL` | 平台默认 LLM 的 base URL |
| `PLATFORM_LLM_API_KEY` | 平台默认 LLM 的 API Key |
| `PLATFORM_LLM_MODEL` | 平台默认模型名 |

生成 `ENCRYPTION_KEY`：

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

前端：

```bash
cp .env.example .env
```

默认 `VITE_API_URL=http://localhost:8000` 即可，埋点和 Sentry 配置可选。

### 3. 初始化数据库

在 Supabase Dashboard → SQL Editor 中，依次执行：

```
backend/migrations/001_initial.sql
backend/migrations/002_rls.sql
backend/migrations/003_usage.sql
backend/migrations/004_add_world_name.sql
```

### 4. 启动开发服务

后端：

```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

前端：

```bash
npm run dev
```

访问 `http://localhost:5173`。

## Docker 部署

### 生产环境（前端 + 后端）

```bash
# 确保 backend/.env 已配置
# 默认使用 80 和 8000 端口，如需修改可创建 .env.deploy
cp .env.deploy.example .env.deploy
# 编辑 .env.deploy 修改 BACKEND_PORT 和 FRONTEND_PORT

docker-compose -f docker-compose.prod.yml --env-file .env.deploy up -d --build
```

访问 `http://localhost`（或你配置的 FRONTEND_PORT）。

### 开发环境（只启动后端）

```bash
# 默认后端端口 8000，如需修改可创建 .env.deploy
cp .env.deploy.example .env.deploy

docker-compose -f docker-compose.dev.yml --env-file .env.deploy up -d --build
```

然后前端继续用 `npm run dev`。

### 单独构建镜像

```bash
# 后端
docker build -t tellme-backend ./backend

# 前端
docker build -t tellme-frontend .
```

## 测试

```bash
# 前端单元测试
npm run test

# E2E 测试（需要后端运行）
npx playwright install chromium
npm run test:e2e
```

## 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

## 本地 LLM 部署（vLLM）

如果使用 vLLM 本地部署 Qwen3 系列模型，需要关闭思考模式：

```bash
# vLLM 启动参数示例
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen3-32B \
  --chat-template ... \
  --enable-reasoning False
```

后端默认在请求中携带 `chat_template_kwargs.enable_thinking=false`。

## 项目结构

```
tellme/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── pages/              # 页面
│   ├── services/           # API 服务
│   ├── store/              # 状态管理
│   └── utils/              # 工具函数
├── backend/src/            # 后端源码
│   ├── routes/             # API 路由
│   ├── lib/                # 核心库
│   └── middleware/         # 中间件
├── worlds/                 # 世界观定义
│   └── <world-id>/
│       ├── world.json
│       └── system-prompt.md
├── e2e/                    # Playwright E2E 测试
└── backend/migrations/     # 数据库迁移
```

## 贡献

欢迎提交 Issue 和 PR。
