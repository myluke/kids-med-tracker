-- ================================================
-- Supabase RLS 策略加固补丁
-- 适用场景：你已经执行过 docs/supabase-migration.sql（旧版）
-- 执行位置：Supabase Dashboard > SQL Editor
-- ================================================

-- 目标：
-- 1) 避免客户端（anon key）可绕过邀请流程直接加入家庭
-- 2) 避免 invites 表被公开读取/更新（邀请校验/接收应走 Worker）
-- 3) 与当前业务逻辑保持一致：只有 owner 才能新增孩子

-- ============ family_members ============
-- 移除“任意用户都能插入 family_members”的策略（安全漏洞）
DROP POLICY IF EXISTS "Users can join family" ON public.family_members;

-- 仅允许创建家庭的用户，把自己加入为 owner（创建家庭后需要）
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

-- ============ invites ============
-- 禁止公开读取 invites（invite token 校验/接收由 Worker 使用 service role 处理）
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.invites;
DROP POLICY IF EXISTS "Authenticated users can accept invite" ON public.invites;
DROP POLICY IF EXISTS "Family members can view invites" ON public.invites;

-- 如未来需要在前端展示邀请列表，仅允许 owner 查询
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

-- ============ children ============
-- 与业务逻辑保持一致：只有 owner 才能新增孩子
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
