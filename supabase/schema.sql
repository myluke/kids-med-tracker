-- ============================================
-- Kids Med Tracker - Supabase Database Schema
-- ============================================
-- 在 Supabase SQL Editor 中执行此文件以初始化数据库
-- 执行顺序：函数 → 表 → RLS → 策略

-- ============================================
-- 1. 辅助函数（用于 RLS 策略，避免递归查询）
-- ============================================

-- 检查当前用户是否是指定家庭的成员
CREATE OR REPLACE FUNCTION public.is_family_member(check_family_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = check_family_id
      AND user_id = auth.uid()
  );
$$;

-- 检查当前用户是否是指定家庭的所有者
CREATE OR REPLACE FUNCTION public.is_family_owner(check_family_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = check_family_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- ============================================
-- 2. 表结构
-- ============================================

-- 家庭表
CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.families IS '家庭信息';

-- 家庭成员表
CREATE TABLE IF NOT EXISTS public.family_members (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);

COMMENT ON TABLE public.family_members IS '家庭成员关系';

-- 孩子表
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text,
  color text,
  gender text CHECK (gender IN ('boy', 'girl')),
  age text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.children IS '孩子信息';

-- 记录表（用药、体温、咳嗽、备注）
CREATE TABLE IF NOT EXISTS public.records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('med', 'cough', 'temp', 'note')),
  time timestamptz NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.records IS '用药/症状记录';
COMMENT ON COLUMN public.records.type IS 'med=用药, cough=咳嗽, temp=体温, note=备注';
COMMENT ON COLUMN public.records.payload_json IS '记录详情（JSON格式）';

-- 邀请链接表
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invites IS '家庭邀请链接';

-- ============================================
-- 3. 启用行级安全 (RLS)
-- ============================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS 策略
-- ============================================

-- families 表策略
CREATE POLICY "Authenticated users can create family" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Family members can view family" ON public.families
  FOR SELECT USING (is_family_member(id));

-- 创建者可以查看自己创建的家庭（解决创建时的循环依赖）
CREATE POLICY "Creator can view own family" ON public.families
  FOR SELECT USING (created_by_user_id = auth.uid());

CREATE POLICY "Owner can update family" ON public.families
  FOR UPDATE USING (is_family_owner(id));

-- family_members 表策略
CREATE POLICY "Family creator can self-join as owner" ON public.family_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_members.family_id
        AND families.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can view members" ON public.family_members
  FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Owner can remove members" ON public.family_members
  FOR DELETE USING (is_family_owner(family_id));

-- children 表策略
CREATE POLICY "Family members can view children" ON public.children
  FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Owner can add children" ON public.children
  FOR INSERT WITH CHECK (is_family_owner(family_id));

CREATE POLICY "Owner can update children" ON public.children
  FOR UPDATE USING (is_family_owner(family_id));

CREATE POLICY "Owner can delete children" ON public.children
  FOR DELETE USING (is_family_owner(family_id));

-- records 表策略
CREATE POLICY "Family members can view records" ON public.records
  FOR SELECT USING (deleted_at IS NULL AND is_family_member(family_id));

CREATE POLICY "Family members can add records" ON public.records
  FOR INSERT WITH CHECK (is_family_member(family_id) AND created_by_user_id = auth.uid());

CREATE POLICY "Users can update own records or owner can update all" ON public.records
  FOR UPDATE USING (
    deleted_at IS NULL
    AND is_family_member(family_id)
    AND (created_by_user_id = auth.uid() OR is_family_owner(family_id))
  );

-- invites 表策略
CREATE POLICY "Owner can view invites" ON public.invites
  FOR SELECT USING (is_family_owner(family_id));

CREATE POLICY "Owner can create invite" ON public.invites
  FOR INSERT WITH CHECK (is_family_owner(family_id));
