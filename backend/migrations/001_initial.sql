-- ============================================================
-- 001_initial.sql — 初始建表脚本
-- 世界观（Tellme）后端数据库初始化
-- 依赖：Supabase Auth（auth.users 表由 Supabase 自动创建）
-- ============================================================

-- ------------------------------------------------------------
-- 1. 用户资料表（扩展 Supabase auth.users）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,  -- 与 auth.users.id 一一对应
  username TEXT,                                                 -- 用户名
  avatar TEXT DEFAULT '👤',                                      -- 头像（emoji）
  created_at TIMESTAMPTZ DEFAULT NOW()                           -- 创建时间
);

-- 新用户注册时自动创建 profile 的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    '👤'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注册触发器（若已存在则先删除再创建，保证幂等）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 2. 寓言记录表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                -- 寓言 ID
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,-- 所属用户
  world_id TEXT NOT NULL,                                       -- 世界 ID（如 kitchen、codebase）
  world_name TEXT,                                              -- 世界名称（冗余存储，方便展示）
  concept TEXT NOT NULL,                                        -- 用户输入的概念
  concept_name TEXT,                                            -- LLM 解析出的概念名
  concept_definition TEXT,                                      -- 概念定义
  content TEXT NOT NULL,                                        -- 寓言正文
  mappings JSONB DEFAULT '[]',                                  -- 故事元素→概念部分的映射
  quiz JSONB DEFAULT '{}',                                      -- 检验问题（understanding + transfer）
  memory_entry JSONB,                                           -- 世界记忆条目（原始 JSON）
  is_shared BOOLEAN DEFAULT FALSE,                              -- 是否公开分享
  share_token TEXT UNIQUE,                                      -- 分享令牌
  created_at TIMESTAMPTZ DEFAULT NOW()                          -- 创建时间
);

-- 按用户和创建时间建索引，加速列表查询
CREATE INDEX IF NOT EXISTS idx_fables_user_id ON public.fables(user_id);
CREATE INDEX IF NOT EXISTS idx_fables_user_created ON public.fables(user_id, created_at DESC);
-- 按分享令牌建索引，加速公开分享页查询
CREATE INDEX IF NOT EXISTS idx_fables_share_token ON public.fables(share_token) WHERE share_token IS NOT NULL;

-- ------------------------------------------------------------
-- 3. 世界记忆表（Agent 记忆机制）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                -- 记忆 ID
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,-- 所属用户
  world_id TEXT NOT NULL,                                       -- 世界 ID
  fable_id UUID REFERENCES public.fables ON DELETE SET NULL,    -- 关联的寓言 ID
  concept TEXT,                                                 -- 概念
  concept_name TEXT,                                            -- 概念名
  story_summary TEXT,                                           -- 故事摘要
  characters_involved TEXT[] DEFAULT '{}',                      -- 涉及的角色列表
  world_changes TEXT,                                           -- 世界变化描述
  created_at TIMESTAMPTZ DEFAULT NOW()                          -- 创建时间
);

-- 按用户和世界建索引，加速记忆查询
CREATE INDEX IF NOT EXISTS idx_world_memories_user_world ON public.world_memories(user_id, world_id, created_at);

-- ------------------------------------------------------------
-- 4. 测验作答表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                -- 作答 ID
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,-- 所属用户
  fable_id UUID REFERENCES public.fables ON DELETE CASCADE NOT NULL, -- 关联的寓言 ID
  question_key TEXT NOT NULL,                                   -- 问题标识（understanding / transfer）
  answer TEXT,                                                  -- 学生的回答
  feedback TEXT,                                                -- AI 评判反馈
  created_at TIMESTAMPTZ DEFAULT NOW(),                         -- 创建时间
  UNIQUE(user_id, fable_id, question_key)                       -- 同一用户同一寓言同一问题只能有一条记录
);

-- 按用户和寓言建索引
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user_fable ON public.quiz_answers(user_id, fable_id);

-- ------------------------------------------------------------
-- 5. 用户 LLM 配置表（加密存储 API Key）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_llm_configs (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY, -- 用户 ID（主键，一对一）
  base_url TEXT,                                                    -- LLM API 基础地址
  api_key_encrypted TEXT,                                           -- 加密后的 API Key（Fernet 对称加密）
  model TEXT,                                                       -- 模型名称
  use_platform_llm BOOLEAN DEFAULT TRUE,                            -- 是否使用平台提供的 LLM（true=平台默认，false=BYOK）
  updated_at TIMESTAMPTZ DEFAULT NOW()                              -- 更新时间
);

-- ------------------------------------------------------------
-- 6. 用户启用的世界表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_worlds (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,-- 用户 ID
  world_id TEXT NOT NULL,                                       -- 世界 ID
  enabled BOOLEAN DEFAULT TRUE,                                 -- 是否启用
  PRIMARY KEY (user_id, world_id)                               -- 联合主键
);
