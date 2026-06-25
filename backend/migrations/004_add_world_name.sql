-- ============================================================
-- 004_add_world_name.sql — 为 fables 表增加 world_name 字段
-- 用于已按 001_initial.sql 创建数据库的后续升级
-- ============================================================

-- 增加世界名称字段（允许为空，兼容旧数据）
ALTER TABLE public.fables
  ADD COLUMN IF NOT EXISTS world_name TEXT;

-- 注释
COMMENT ON COLUMN public.fables.world_name IS '世界名称（冗余存储，用于历史记录和分享卡片展示）';
