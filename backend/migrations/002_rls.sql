-- ============================================================
-- 002_rls.sql — Row Level Security 行级安全策略
-- 所有业务表启用 RLS，确保用户只能 CRUD 自己的数据
-- 说明：后端使用 service_role_key（绕过 RLS），RLS 主要
--       保护直接通过 Supabase 客户端（anon key）访问的场景
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles 表
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的资料
CREATE POLICY "用户查看自己的资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的资料
CREATE POLICY "用户更新自己的资料" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 用户只能插入自己的资料（触发器自动创建的场景已由 SECURITY DEFINER 覆盖）
CREATE POLICY "用户插入自己的资料" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 用户只能删除自己的资料
CREATE POLICY "用户删除自己的资料" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ------------------------------------------------------------
-- 2. fables 表
-- ------------------------------------------------------------
ALTER TABLE public.fables ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的寓言（公开分享的也可查看）
CREATE POLICY "用户查看自己的寓言" ON public.fables
  FOR SELECT USING (auth.uid() = user_id OR is_shared = TRUE);

-- 用户只能插入自己的寓言
CREATE POLICY "用户插入自己的寓言" ON public.fables
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的寓言
CREATE POLICY "用户更新自己的寓言" ON public.fables
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的寓言
CREATE POLICY "用户删除自己的寓言" ON public.fables
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. world_memories 表
-- ------------------------------------------------------------
ALTER TABLE public.world_memories ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的世界记忆
CREATE POLICY "用户查看自己的世界记忆" ON public.world_memories
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的世界记忆
CREATE POLICY "用户插入自己的世界记忆" ON public.world_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的世界记忆
CREATE POLICY "用户更新自己的世界记忆" ON public.world_memories
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的世界记忆
CREATE POLICY "用户删除自己的世界记忆" ON public.world_memories
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. quiz_answers 表
-- ------------------------------------------------------------
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的测验作答
CREATE POLICY "用户查看自己的作答" ON public.quiz_answers
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的作答
CREATE POLICY "用户插入自己的作答" ON public.quiz_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的作答
CREATE POLICY "用户更新自己的作答" ON public.quiz_answers
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的作答
CREATE POLICY "用户删除自己的作答" ON public.quiz_answers
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. user_llm_configs 表
-- ------------------------------------------------------------
ALTER TABLE public.user_llm_configs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的 LLM 配置
CREATE POLICY "用户查看自己的LLM配置" ON public.user_llm_configs
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的 LLM 配置
CREATE POLICY "用户插入自己的LLM配置" ON public.user_llm_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的 LLM 配置
CREATE POLICY "用户更新自己的LLM配置" ON public.user_llm_configs
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的 LLM 配置
CREATE POLICY "用户删除自己的LLM配置" ON public.user_llm_configs
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. user_worlds 表
-- ------------------------------------------------------------
ALTER TABLE public.user_worlds ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己启用的世界
CREATE POLICY "用户查看自己启用的世界" ON public.user_worlds
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己启用的世界
CREATE POLICY "用户插入自己启用的世界" ON public.user_worlds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己启用的世界
CREATE POLICY "用户更新自己启用的世界" ON public.user_worlds
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己启用的世界
CREATE POLICY "用户删除自己启用的世界" ON public.user_worlds
  FOR DELETE USING (auth.uid() = user_id);
