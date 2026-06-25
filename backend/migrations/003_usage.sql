-- ============================================================
-- 003_usage.sql — LLM 用量记录表
-- 记录每次 LLM 调用的 token 消耗，为后续计费/分析打基础
-- ============================================================

CREATE TABLE IF NOT EXISTS public.llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                -- 用量记录 ID
  user_id UUID REFERENCES auth.users NOT NULL,                  -- 用户 ID
  provider TEXT,                                                -- LLM 提供商（openai/deepseek/byok 等）
  model TEXT,                                                   -- 模型名称
  tokens_input INT,                                             -- 输入 token 数
  tokens_output INT,                                            -- 输出 token 数
  fable_id UUID,                                                -- 关联的寓言 ID（可选）
  created_at TIMESTAMPTZ DEFAULT NOW()                          -- 创建时间
);

-- 按用户和创建时间建索引，加速用量统计查询
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id ON public.llm_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_created ON public.llm_usage(user_id, created_at DESC);

-- 启用行级安全（RLS）：用户只能查看自己的用量记录
ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户查看自己的用量记录" ON public.llm_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户插入自己的用量记录" ON public.llm_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
