-- ============================================
-- Kids Med Tracker - Illness Episodes Migration
-- ============================================
-- 病程管理功能数据库迁移
-- 执行顺序：1. 新表 → 2. 修改现有表 → 3. RLS → 4. 数据迁移

-- ============================================
-- 1. 新增 illness_episodes 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.illness_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,  -- NULL = 进行中
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'recovered')),
  summary_json jsonb DEFAULT '{}'::jsonb,  -- 痊愈时缓存统计数据
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.illness_episodes IS '病程记录';
COMMENT ON COLUMN public.illness_episodes.status IS 'active=进行中, recovered=已痊愈';
COMMENT ON COLUMN public.illness_episodes.summary_json IS '统计摘要: {durationDays, medCount, maxTemp, avgCoughPerDay, ...}';

-- 索引
CREATE INDEX IF NOT EXISTS idx_episodes_child_status ON public.illness_episodes(child_id, status);
CREATE INDEX IF NOT EXISTS idx_episodes_child_started ON public.illness_episodes(child_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_family ON public.illness_episodes(family_id);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS illness_episodes_updated_at ON public.illness_episodes;
CREATE TRIGGER illness_episodes_updated_at
  BEFORE UPDATE ON public.illness_episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. 修改 records 表，添加 episode_id 字段
-- ============================================

-- 添加 episode_id 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'records'
      AND column_name = 'episode_id'
  ) THEN
    ALTER TABLE public.records
    ADD COLUMN episode_id uuid REFERENCES public.illness_episodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 为 episode_id 创建索引
CREATE INDEX IF NOT EXISTS idx_records_episode ON public.records(episode_id);

-- ============================================
-- 3. RLS 策略
-- ============================================

ALTER TABLE public.illness_episodes ENABLE ROW LEVEL SECURITY;

-- 家庭成员可以查看病程
DROP POLICY IF EXISTS "Family members can view episodes" ON public.illness_episodes;
CREATE POLICY "Family members can view episodes" ON public.illness_episodes
  FOR SELECT USING (is_family_member(family_id));

-- 家庭成员可以创建病程
DROP POLICY IF EXISTS "Family members can create episodes" ON public.illness_episodes;
CREATE POLICY "Family members can create episodes" ON public.illness_episodes
  FOR INSERT WITH CHECK (is_family_member(family_id) AND created_by_user_id = auth.uid());

-- 家庭成员可以更新病程（标记痊愈等）
DROP POLICY IF EXISTS "Family members can update episodes" ON public.illness_episodes;
CREATE POLICY "Family members can update episodes" ON public.illness_episodes
  FOR UPDATE USING (is_family_member(family_id));

-- ============================================
-- 4. 历史数据迁移
-- ============================================
-- 为每个孩子的现有记录创建一个"历史病程"（状态为 active）
-- 这样用户可以自行决定是否标记为痊愈

INSERT INTO public.illness_episodes (family_id, child_id, started_at, status, created_by_user_id)
SELECT DISTINCT
  r.family_id,
  r.child_id,
  COALESCE(MIN(r.time), now()) as started_at,
  'active' as status,
  (SELECT fm.user_id FROM family_members fm WHERE fm.family_id = r.family_id AND fm.role = 'owner' LIMIT 1) as created_by_user_id
FROM records r
WHERE r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM illness_episodes e
    WHERE e.child_id = r.child_id AND e.family_id = r.family_id
  )
GROUP BY r.family_id, r.child_id
HAVING COUNT(*) > 0;

-- 将现有记录关联到对应病程
UPDATE records r
SET episode_id = (
  SELECT e.id FROM illness_episodes e
  WHERE e.child_id = r.child_id AND e.family_id = r.family_id
  ORDER BY e.created_at DESC
  LIMIT 1
)
WHERE r.episode_id IS NULL AND r.deleted_at IS NULL;
