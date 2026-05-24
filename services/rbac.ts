/**
 * RBAC Service Layer (PUN-289)
 * 
 * TypeScript service for PunPond Credit Union Role-Based Access Control.
 * Wraps Supabase RPC calls and provides synchronous permission checks
 * for server-side middleware and route handlers.
 * 
 * Requires: @supabase/supabase-js with proper SUPABASE_URL + anon key
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Permission types and constants
// ============================================================

export const PERMISSION_SLAUGHS = [
  'members.create',
  'members.read',
  'members.update',
  'members.approve',
  'members.suspend',
  'shares.create',
  'shares.read',
  'shares.update',
  'shares.approve',
  'loans.create',
  'loans.read',
  'loans.update',
  'loans.approve',
  'loans.repay',
  'transactions.cashier',
  'transactions.read',
  'transactions.approve',
  'audit.view',
  'audit.export',
  'reports.read',
  'reports.export',
  'reports.regulatory',
  'compliance.view',
  'compliance.regulatory_report',
  'system.roles_manage',
  'system.config',
] as const;

export type PermissionSlug = typeof PERMISSION_SLAUGHS[number];

// Static role-permission matrix (no DB call needed)
// Used for compile-time checks and server-side middleware fallbacks
const ROLE_PERMISSION_MATRIX: Record<string, readonly string[]> = {
  system_admin: [
    'members.create', 'members.read', 'members.update', 'members.approve', 'members.suspend',
    'shares.create', 'shares.read', 'shares.update', 'shares.approve',
    'loans.create', 'loans.read', 'loans.update', 'loans.approve', 'loans.repay',
    'transactions.cashier', 'transactions.read', 'transactions.approve',
    'audit.view', 'audit.export',
    'reports.read', 'reports.export', 'reports.regulatory',
    'compliance.view', 'compliance.regulatory_report',
    'system.roles_manage', 'system.config',
  ] as const,

  compliance_officer: [
    'members.read', 'shares.read', 'loans.read', 'transactions.read',
    'audit.view', 'audit.export',
    'reports.read', 'reports.export', 'reports.regulatory',
    'compliance.view', 'compliance.regulatory_report',
  ] as const,

  branch_manager: [
    'members.create', 'members.read', 'members.update', 'members.approve',
    'shares.read', 'shares.approve',
    'loans.read', 'loans.approve',
    'transactions.read', 'transactions.approve',
    'reports.read', 'reports.export',
  ] as const,

  senior_loan_officer: [
    'members.create', 'members.read',
    'loans.create', 'loans.read', 'loans.update', 'loans.approve',
  ] as const,

  loan_officer: [
    'loans.create', 'loans.read', 'loans.update',
    'members.read',
    'shares.read',
  ] as const,

  cashier: [
    'transactions.cashier', 'transactions.read',
  ] as const,

  member_service: [
    'members.create', 'members.read', 'members.update',
    'shares.read', 'loans.read',
  ] as const,

  member: [] as const, // read own data only — enforced by RLS policies, not this matrix
};

// ============================================================
// Supabase client factory
// ============================================================

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('RBAC: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  }
  
  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

// ============================================================
// Async RPC wrappers (for browser/client-side checks)
// ============================================================

/**
 * Check if the current authenticated user has a specific permission.
 * Uses Supabase RPC function `current_user_has_permission`.
 */
export async function currentUserHasPermission(permission: PermissionSlug): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.rpc('current_user_has_permission', {
      params: { p_permission_slug: permission },
    });
    
    if (error) {
      console.warn(`RBAC: RPC call failed for ${permission}:`, error.message);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('RBAC currentUserHasPermission error:', err);
    return false;
  }
}

/**
 * Get all permission slugs for the current authenticated user.
 */
export async function getCurrentUserPermissions(): Promise<string[]> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.rpc('current_user_permissions');
    
    if (error || !Array.isArray(data)) {
      console.warn('RBAC: Failed to get current user permissions:', error?.message);
      return [];
    }
    
    return data as string[];
  } catch (err) {
    console.error('RBAC getCurrentUserPermissions error:', err);
    return [];
  }
}

/**
 * Get the maximum hierarchy level for the current user.
 * Higher values = more privileged roles.
 */
export async function getCurrentUserHierarchyLevel(): Promise<number> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.rpc('current_user_hierarchy_level');
    
    if (error) {
      console.warn('RBAC: Failed to get hierarchy level:', error.message);
      return 0;
    }
    
    return typeof data === 'number' ? data : 0;
  } catch (err) {
    console.error('RBAC getCurrentUserHierarchyLevel error:', err);
    return 0;
  }
}

/**
 * Check if the current user is an active credit union member.
 */
export async function isCurrentMember(): Promise<boolean> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.rpc('is_current_member');
    
    if (error) {
      console.warn('RBAC: Failed to check member status:', error.message);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('RBAC isCurrentMember error:', err);
    return false;
  }
}

/**
 * Check if the current user has ANY of the given permissions.
 */
export async function checkAnyPermission(permissions: PermissionSlug[]): Promise<boolean> {
  const perms = await getCurrentUserPermissions();
  return permissions.some((p) => perms.includes(p));
}

/**
 * Check if the current user has ALL of the given permissions.
 */
export async function checkAllPermissions(permissions: PermissionSlug[]): Promise<boolean> {
  const perms = await getCurrentUserPermissions();
  return permissions.every((p) => perms.includes(p));
}

// ============================================================
// Synchronous checks (for server-side / middleware use)
// These use the static matrix — no DB call needed.
// For full correctness, verify against DB via RPC in async context.
// ============================================================

/**
 * Check if a role has a specific permission using the static matrix.
 * Fast path for server-side route handlers that already know the user's roles.
 */
export function roleHasPermission(roleSlug: string, permission: PermissionSlug): boolean {
  const perms = ROLE_PERMISSION_MATRIX[roleSlug];
  return Array.isArray(perms) && perms.includes(permission);
}

/**
 * Check if any of the given roles have a specific permission.
 */
export function anyRoleHasPermission(roleSlugs: string[], permission: PermissionSlug): boolean {
  return roleSlugs.some((slug) => roleHasPermission(slug, permission));
}

/**
 * Get all permissions for a given role from the static matrix.
 */
export function getPermissionsForRole(roleSlug: string): readonly string[] {
  return ROLE_PERMISSION_MATRIX[roleSlug] ?? [];
}

/**
 * Check if a user would have a permission based on their roles (sync fallback).
 * Uses the static matrix — returns true only if ALL required permissions are satisfied.
 */
export function syncCheckPermission(roleSlugs: string[], permission: PermissionSlug): boolean {
  return anyRoleHasPermission(roleSlugs, permission);
}

// ============================================================
// Route guard helpers for Next.js App Router
// ============================================================

/**
 * Middleware-compatible permission check.
 * Throws if the user lacks the required permission.
 */
export async function requirePermission(permission: PermissionSlug): Promise<void> {
  const hasPerm = await currentUserHasPermission(permission);
  if (!hasPerm) {
    const err = new Error(`Forbidden: requires ${permission}`);
    (err as any).statusCode = 403;
    throw err;
  }
}

/**
 * Middleware-compatible check for ANY of the given permissions.
 */
export async function requireAnyPermission(permissions: PermissionSlug[]): Promise<void> {
  const hasPerm = await checkAnyPermission(permissions);
  if (!hasPerm) {
    const err = new Error(`Forbidden: requires any of ${permissions.join(' or ')}`);
    (err as any).statusCode = 403;
    throw err;
  }
}

/**
 * Get the current user's roles and permissions for use in middleware.
 */
export async function getCurrentUserAccess(): Promise<{
  permissions: string[];
  hierarchyLevel: number;
  isMember: boolean;
}> {
  const [permissions, hierarchyLevel, isMember] = await Promise.all([
    getCurrentUserPermissions(),
    getCurrentUserHierarchyLevel(),
    isCurrentMember(),
  ]);
  
  return { permissions, hierarchyLevel, isMember };
}
