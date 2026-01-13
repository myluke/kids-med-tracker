-- ================================================
-- Supabase 数据库迁移脚本
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ================================================

-- ============ 1. 用户扩展表 ============
-- 关联 Supabase Auth 的 auth.users 表
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ 2. 家庭表 ============
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ 3. 家庭成员表 ============
CREATE TABLE IF NOT EXISTS public.family_members (
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id)
);

-- ============ 4. 邀请表 ============
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ 5. 孩子表 ============
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ 6. 记录表 ============
CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('med', 'cough', 'temp', 'note')),
  time TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============ 7. 索引 ============
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_children_family_id ON public.children(family_id);
CREATE INDEX IF NOT EXISTS idx_records_family_child_time ON public.records(family_id, child_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_records_family_deleted ON public.records(family_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_invites_family_id ON public.invites(family_id);
CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON public.invites(token_hash);

-- ============ 8. 触发器：自动更新 updated_at ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS records_updated_at ON public.records;
CREATE TRIGGER records_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ 9. 触发器：新用户注册时自动创建 profile ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- RLS (Row Level Security) 策略
-- ================================================

-- 启用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- ============ user_profiles RLS ============
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============ families RLS ============
DROP POLICY IF EXISTS "Family members can view family" ON public.families;
CREATE POLICY "Family members can view family"
  ON public.families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create family" ON public.families;
CREATE POLICY "Authenticated users can create family"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "Owner can update family" ON public.families;
CREATE POLICY "Owner can update family"
  ON public.families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
  );

-- ============ family_members RLS ============
DROP POLICY IF EXISTS "Family members can view members" ON public.family_members;
CREATE POLICY "Family members can view members"
  ON public.family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members AS my_membership
      WHERE my_membership.family_id = family_members.family_id
        AND my_membership.user_id = auth.uid()
    )
  );

-- 创建家庭后：仅允许创建者把自己加入为 owner（防止任意加入他人家庭）
DROP POLICY IF EXISTS "Users can join family" ON public.family_members;
DROP POLICY IF EXISTS "Family creator can self-join as owner" ON public.family_members;
CREATE POLICY "Family creator can self-join as owner"
  ON public.family_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.families
      WHERE families.id = family_members.family_id
        AND families.created_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can remove members" ON public.family_members;
CREATE POLICY "Owner can remove members"
  ON public.family_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members AS owner_check
      WHERE owner_check.family_id = family_members.family_id
        AND owner_check.user_id = auth.uid()
        AND owner_check.role = 'owner'
    )
  );

-- ============ invites RLS ============
DROP POLICY IF EXISTS "Family members can view invites" ON public.invites;
DROP POLICY IF EXISTS "Owner can view invites" ON public.invites;
CREATE POLICY "Owner can view invites"
  ON public.invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = invites.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owner can create invite" ON public.invites;
CREATE POLICY "Owner can create invite"
  ON public.invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = invites.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
  );

-- 邀请校验/接收建议走服务端（Worker）接口（避免将 invites 暴露给客户端）
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.invites;
DROP POLICY IF EXISTS "Authenticated users can accept invite" ON public.invites;

-- ============ children RLS ============
DROP POLICY IF EXISTS "Family members can view children" ON public.children;
CREATE POLICY "Family members can view children"
  ON public.children FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = children.family_id
        AND family_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Family members can add children" ON public.children;
DROP POLICY IF EXISTS "Owner can add children" ON public.children;
CREATE POLICY "Owner can add children"
  ON public.children FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = children.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owner can update children" ON public.children;
CREATE POLICY "Owner can update children"
  ON public.children FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = children.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owner can delete children" ON public.children;
CREATE POLICY "Owner can delete children"
  ON public.children FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = children.family_id
        AND family_members.user_id = auth.uid()
        AND family_members.role = 'owner'
    )
  );

-- ============ records RLS ============
DROP POLICY IF EXISTS "Family members can view records" ON public.records;
CREATE POLICY "Family members can view records"
  ON public.records FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = records.family_id
        AND family_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Family members can add records" ON public.records;
CREATE POLICY "Family members can add records"
  ON public.records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = records.family_id
        AND family_members.user_id = auth.uid()
    )
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own records or owner can update all" ON public.records;
CREATE POLICY "Users can update own records or owner can update all"
  ON public.records FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = records.family_id
        AND family_members.user_id = auth.uid()
        AND (
          records.created_by_user_id = auth.uid()
          OR family_members.role = 'owner'
        )
    )
  );

-- ================================================
-- 完成提示
-- ================================================
-- 迁移脚本执行完成！
--
-- 接下来请在 Supabase Dashboard 中配置：
-- 1. Authentication > Providers > Email
--    - 启用 Email 登录
--    - 启用 Magic Link（可选：禁用密码登录）
-- 2. Authentication > URL Configuration
--    - Site URL: https://kids.kanheze.com
--    - Redirect URLs: https://kids.kanheze.com/auth/callback
-- 3. Authentication > Email Templates
--    - 自定义 Magic Link 邮件模板（可选）
