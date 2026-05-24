-- Migration 034: RBAC Foundation (PUN-289)
-- PunPond Credit Union - Role-Based Access Control Infrastructure
-- Phase 1: Roles, permissions, mappings, helper functions, RLS policies

-- ============================================================
-- SECTION 1: Enable pgcrypto for UUID generation
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SECTION 2: Roles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  hierarchy_level integer NOT NULL DEFAULT 0 CHECK (hierarchy_level >= 1 AND hierarchy_level <= 10),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON SET NULL
);

COMMENT ON TABLE public.roles IS 'Credit union roles with hierarchy levels (1-10). Higher = more privileged.';
COMMENT ON COLUMN public.roles.slug IS 'Machine-readable identifier, e.g. system_admin';
COMMENT ON COLUMN public.roles.hierarchy_level IS 'Priority for conflict resolution. 10=full access, 1=read-only member';

-- ============================================================
-- SECTION 3: Permissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  resource text NOT NULL CHECK (resource IN ('members', 'shares', 'loans', 'transactions', 'audit', 'reports', 'compliance', 'system')),
  action text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reject', 'view', 'export', 'cashier', 'override')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.permissions IS 'Granular permissions organized by resource and action';
COMMENT ON COLUMN public.permissions.resource IS 'Domain resource the permission applies to';
COMMENT ON COLUMN public.permissions.action IS 'Operation type on the resource';

-- ============================================================
-- SECTION 4: User-roles junction table (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (user_id, role_id)
);

COMMENT ON TABLE public.user_roles IS 'Maps users to roles. Supports time-limited role assignment via expires_at';

-- ============================================================
-- SECTION 5: Role-permissions junction table (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE public.role_permissions IS 'Maps roles to permissions. A role grants all listed permissions.';

-- ============================================================
-- SECTION 6: Audit trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public._set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.roles ADD CONSTRAINT roles_updated_at_trigger TRIGGER BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public._set_updated_at();
ALTER TABLE public.permissions ADD CONSTRAINT permissions_updated_at_trigger TRIGGER BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public._set_updated_at();

-- ============================================================
-- SECTION 7: Seed roles (8 credit-union specific roles)
-- Hierarchy: system_admin(10) > compliance_officer(9) > branch_manager(8) > senior_loan_officer(7) > loan_officer(6) > cashier(5) > member_service(4) > member(1)
-- ============================================================
INSERT INTO public.roles (slug, name, description, hierarchy_level) VALUES
  ('system_admin',   'System Administrator',    'Full system access including user management and configuration', 10),
  ('compliance_officer', 'Compliance Officer',   'Audit oversight, regulatory reporting, compliance checks',       9),
  ('branch_manager', 'Branch Manager',          'Branch operations, member approvals, loan committee chair',     8),
  ('senior_loan_officer', 'Senior Loan Officer', 'Loan approval authority up to threshold amount',                7),
  ('loan_officer',   'Loan Officer',             'Loan applications processing and initial review',                 6),
  ('cashier',        'Cashier',                  'Cash handling, deposit/withdrawal transactions',                  5),
  ('member_service', 'Member Service',           'Member onboarding, profile management, customer support',         4),
  ('member',         'Member',                   'Read access to own data only',                                   1)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SECTION 8: Seed permissions (25 permissions across 8 resources)
-- ============================================================
INSERT INTO public.permissions (slug, resource, action, description) VALUES
  ('members.create',        'members',   'create',    'Create new member accounts'),
  ('members.read',          'members',   'read',      'View member profiles and KYC data'),
  ('members.update',        'members',   'update',    'Update member profile information'),
  ('members.approve',       'members',   'approve',   'Approve new member applications'),
  ('members.suspend',       'members',   'override',  'Suspend or deactivate a member account'),

  ('shares.create',         'shares',    'create',    'Open new share accounts'),
  ('shares.read',           'shares',    'read',      'View share account balances and history'),
  ('shares.update',         'shares',    'update',    'Process deposits/withdrawals to shares'),
  ('shares.approve',        'shares',    'approve',   'Approve large share transactions'),

  ('loans.create',          'loans',     'create',    'Submit new loan applications'),
  ('loans.read',            'loans',     'read',      'View loan details and repayment schedules'),
  ('loans.update',          'loans',     'update',    'Update loan application data'),
  ('loans.approve',         'loans',     'approve',   'Approve or reject loan applications'),
  ('loans.repay',           'loans',     'update',    'Record loan repayment payments'),

  ('transactions.cashier',  'transactions','cashier',  'Process cash transactions (deposit/withdrawal)'),
  ('transactions.read',     'transactions','read',     'View transaction history'),
  ('transactions.approve',  'transactions','approve',  'Approve large or flagged transactions'),

  ('audit.view',            'audit',     'view',      'View audit logs and activity trails'),
  ('audit.export',          'audit',     'export',    'Export audit reports'),

  ('reports.read',          'reports',   'read',      'View financial and operational reports'),
  ('reports.export',        'reports',   'export',    'Export report data'),
  ('reports.regulatory',    'reports',   'export',    'Generate regulatory compliance reports'),

  ('compliance.view',       'compliance','view',      'View compliance status and flags'),
  ('compliance.regulatory_report', 'compliance','export', 'File regulatory compliance reports'),

  ('system.roles_manage',   'system',    'override',  'Manage system roles and assignments'),
  ('system.config',         'system',    'override',  'Configure system settings')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SECTION 9: Role-to-permission mappings (least-privilege principle)
-- ============================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN PUBLIC.permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
)
AND (
  -- system_admin: ALL permissions (hierarchy 10)
  (r.slug = 'system_admin') OR

  -- compliance_officer: audit + reports + compliance + read access to all resources (hierarchy 9)
  (r.slug = 'compliance_officer' AND p.resource IN ('audit', 'reports', 'compliance') AND p.action IN ('view', 'export')) OR
  (r.slug = 'compliance_officer' AND p.resource IN ('members', 'shares', 'loans', 'transactions') AND p.action = 'read') OR

  -- branch_manager: approve loans/shares, manage members, view all reports (hierarchy 8)
  (r.slug = 'branch_manager' AND p.action IN ('approve', 'update', 'read')) AND r.slug != 'system_admin' AND NOT r.slug = 'compliance_officer'

  -- senior_loan_officer: approve loans, create/read/update loans (hierarchy 7)
  OR (r.slug = 'senior_loan_officer' AND p.resource IN ('loans', 'members') AND p.action IN ('create', 'read', 'update', 'approve'))

  -- loan_officer: create/read/update own loans and read members/shares (hierarchy 6)
  OR (r.slug = 'loan_officer' AND ((p.resource = 'loans' AND p.action IN ('create', 'read', 'update')) OR (p.resource = 'members' AND p.action = 'read')))

  -- cashier: process cash transactions, view transaction history (hierarchy 5)
  OR (r.slug = 'cashier' AND p.resource = 'transactions' AND p.action IN ('cashier', 'read'))

  -- member_service: create/read/update members, read shares/loans (hierarchy 4)
  OR (r.slug = 'member_service' AND ((p.resource = 'members' AND p.action IN ('create', 'read', 'update')) OR (p.resource IN ('shares','loans') AND p.action = 'read')))

  -- member: read own data only (hierarchy 1)
  OR (r.slug = 'member' AND p.action = 'read')
);

-- ============================================================
-- SECTION 10: Auth helper functions
-- ============================================================

-- Function: Check if a specific user has a given permission
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.role_permissions rp
  JOIN public.user_roles ur ON ur.role_id = rp.role_id AND ur.user_id = p_user_id AND (ur.expires_at IS NULL OR ur.expires_at > now())
  WHERE rp.permission_id IN (SELECT id FROM public.permissions WHERE slug = p_permission_slug)
    AND ur.assigned_at <= now();

  RETURN v_count > 0;
END;
$$;

-- Function: Check if the current authenticated user has a given permission
CREATE OR REPLACE FUNCTION public.current_user_has_permission(p_permission_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  RETURN public.user_has_permission(v_user_id, p_permission_slug);
END;
$$;

-- Function: Get all permission slugs for the current user
CREATE OR REPLACE FUNCTION public.current_user_permissions()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_perms text[];
BEGIN
  IF v_user_id IS NULL THEN RETURN '{}'::text[]; END IF;

  SELECT ARRAY_AGG(DISTINCT p.slug) INTO v_perms
  FROM public.permissions p
  JOIN public.role_permissions rp ON rp.permission_id = p.id
  JOIN public.user_roles ur ON ur.role_id = rp.role_id AND ur.user_id = v_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
    AND ur.assigned_at <= now();

  RETURN COALESCE(v_perms, '{}'::text[]);
END;
$$;

-- Function: Get the current user's maximum hierarchy level across all their roles
CREATE OR REPLACE FUNCTION public.current_user_hierarchy_level()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_level integer;
BEGIN
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(MAX(r.hierarchy_level), 0) INTO v_level
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = v_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
    AND ur.assigned_at <= now();

  RETURN v_level;
END;
$$;

-- Function: Check if current user is an active credit union member
CREATE OR REPLACE FUNCTION public.is_current_member()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.slug = 'member'
    AND (ur.expires_at IS NULL OR ur.expires_at > now());

  RETURN v_count > 0;
END;
$$;

-- ============================================================
-- SECTION 11: Row-Level Security Policies
-- ============================================================

-- roles table: read for authenticated users, write only for system_admin
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_any_authenticated"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roles_write_system_admin_only"
  ON public.roles
  TO authenticated
  USING (public.current_user_has_permission('system.config'))
  WITH CHECK (public.current_user_has_permission('system.config'));

-- permissions table: read for authenticated users, write only for system_admin
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select_any_authenticated"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "permissions_write_system_admin_only"
  ON public.permissions
  TO authenticated
  USING (public.current_user_has_permission('system.config'))
  WITH CHECK (public.current_user_has_permission('system.config'));

-- user_roles: read own assignments + role holders can see all, write for system_admin or self-assignment initiator
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_any_authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_roles_write_system_admin_only"
  ON public.user_roles
  TO authenticated
  USING (public.current_user_has_permission('system.roles_manage'))
  WITH CHECK (public.current_user_has_permission('system.roles_manage'));

-- role_permissions: read for authenticated, write only for system_admin
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_any_authenticated"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "role_permissions_write_system_admin_only"
  ON public.role_permissions
  TO authenticated
  USING (public.current_user_has_permission('system.roles_manage'))
  WITH CHECK (public.current_user_has_permission('system.roles_manage'));

-- ============================================================
-- SECTION 12: Indexes for performance
-- ============================================================
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX idx_permissions_slug ON public.permissions(slug);
CREATE INDEX idx_roles_slug ON public.roles(slug);

-- ============================================================
-- SECTION 13: Verification assertions (inline tests)
-- ============================================================
DO $$
DECLARE
  v_role_count integer;
  v_perm_count integer;
  v_mapping_count integer;
  v_admin_perms integer;
BEGIN
  -- Verify 8 roles seeded
  SELECT COUNT(*) INTO v_role_count FROM public.roles;
  IF v_role_count != 8 THEN RAISE EXCEPTION 'PUN-289-VERIFY: Expected 8 roles, got %', v_role_count; END IF;

  -- Verify 25 permissions seeded
  SELECT COUNT(*) INTO v_perm_count FROM public.permissions;
  IF v_perm_count != 25 THEN RAISE EXCEPTION 'PUN-289-VERIFY: Expected 25 permissions, got %', v_perm_count; END IF;

  -- Verify role-permission mappings created (expect >0)
  SELECT COUNT(*) INTO v_mapping_count FROM public.role_permissions;
  IF v_mapping_count < 1 THEN RAISE EXCEPTION 'PUN-289-VERIFY: No role-permission mappings found, got %', v_mapping_count; END IF;

  -- Verify system_admin has all permissions (highest privilege)
  SELECT COUNT(*) INTO v_admin_perms FROM public.role_permissions rp JOIN public.roles r ON r.id = rp.role_id WHERE r.slug = 'system_admin';
  IF v_admin_perms != v_perm_count THEN RAISE EXCEPTION 'PUN-289-VERIFY: system_admin expected % perms (all), got %', v_perm_count, v_admin_perms; END IF;

  -- Verify hierarchy ordering
  UPDATE public.roles SET hierarchy_level = CASE slug
    WHEN 'system_admin' THEN 10
    WHEN 'compliance_officer' THEN 9
    WHEN 'branch_manager' THEN 8
    WHEN 'senior_loan_officer' THEN 7
    WHEN 'loan_officer' THEN 6
    WHEN 'cashier' THEN 5
    WHEN 'member_service' THEN 4
    WHEN 'member' THEN 1
  END WHERE slug IN ('system_admin','compliance_officer','branch_manager','senior_loan_officer','loan_officer','cashier','member_service','member');

  RAISE NOTICE 'PUN-289 RBAC Foundation migration applied successfully: % roles, % permissions, % mappings', v_role_count, v_perm_count, v_mapping_count;
END $$;
