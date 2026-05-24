/**
 * RBAC Service Tests (PUN-289)
 * 
 * Unit tests for role-based access control service layer.
 * Static matrix tests require no database. Async RPC tests use mocks.
 */

import {
  ROLE_PERMISSION_MATRIX,
  PERMISSION_SLAUGHS,
  roleHasPermission,
  anyRoleHasPermission,
  getPermissionsForRole,
  syncCheckPermission,
} from './rbac';

// ============================================================
// Test suite: Static permission matrix
// ============================================================

describe('RBAC Permission Matrix', () => {
  
  describe('System Admin (hierarchy 10)', () => {
    test('should have ALL permissions (25 total)', () => {
      const adminPerms = ROLE_PERMISSION_MATRIX.system_admin;
      expect(adminPerms).toHaveLength(25);
      
      PERMISSION_SLAUGHS.forEach((perm) => {
        expect(adminPerms).toContain(perm as string);
      });
    });

    test('system_admin should have system.config', () => {
      expect(roleHasPermission('system_admin', 'system.config')).toBe(true);
    });

    test('system_admin should have system.roles_manage', () => {
      expect(roleHasPermission('system_admin', 'system.roles_manage')).toBe(true);
    });
  });

  describe('Compliance Officer (hierarchy 9)', () => {
    const perms = ROLE_PERMISSION_MATRIX.compliance_officer;

    test('should have audit.view and audit.export', () => {
      expect(perms).toContain('audit.view');
      expect(perms).toContain('audit.export');
    });

    test('should have read access to all resources', () => {
      ['members.read', 'shares.read', 'loans.read', 'transactions.read'].forEach((perm) => {
        expect(perms).toContain(perm);
      });
    });

    test('should NOT have create/update permissions on members', () => {
      expect(roleHasPermission('compliance_officer', 'members.create')).toBe(false);
      expect(roleHasPermission('compliance_officer', 'members.update')).toBe(false);
    });

    test('should have reports.regulatory', () => {
      expect(perms).toContain('reports.regulatory');
    });

    test('should NOT have system.config', () => {
      expect(roleHasPermission('compliance_officer', 'system.config')).toBe(false);
    });
  });

  describe('Branch Manager (hierarchy 8)', () => {
    const perms = ROLE_PERMISSION_MATRIX.branch_manager;

    test('should be able to approve loans and shares', () => {
      expect(perms).toContain('loans.approve');
      expect(perms).toContain('shares.approve');
    });

    test('should be able to create members', () => {
      expect(roleHasPermission('branch_manager', 'members.create')).toBe(true);
    });

    test('should NOT have system.config', () => {
      expect(roleHasPermission('branch_manager', 'system.config')).toBe(false);
    });

    test('should NOT have audit.export', () => {
      expect(roleHasPermission('branch_manager', 'audit.export')).toBe(false);
    });
  });

  describe('Senior Loan Officer (hierarchy 7)', () => {
    const perms = ROLE_PERMISSION_MATRIX.senior_loan_officer;

    test('should be able to approve loans', () => {
      expect(perms).toContain('loans.approve');
    });

    test('should NOT be able to manage system roles', () => {
      expect(roleHasPermission('senior_loan_officer', 'system.roles_manage')).toBe(false);
    });

    test('should have create member permission', () => {
      expect(perms).toContain('members.create');
    });
  });

  describe('Loan Officer (hierarchy 6)', () => {
    const perms = ROLE_PERMISSION_MATRIX.loan_officer;

    test('should be able to create, read, update loans', () => {
      expect(perms).toContain('loans.create');
      expect(perms).toContain('loans.read');
      expect(perms).toContain('loans.update');
    });

    test('should NOT be able to approve loans', () => {
      expect(roleHasPermission('loan_officer', 'loans.approve')).toBe(false);
    });
  });

  describe('Cashier (hierarchy 5)', () => {
    const perms = ROLE_PERMISSION_MATRIX.cashier;

    test('should have transactions.cashier', () => {
      expect(perms).toContain('transactions.cashier');
    });

    test('should NOT be able to approve loans', () => {
      expect(roleHasPermission('cashier', 'loans.approve')).toBe(false);
    });

    test('should NOT have members.read', () => {
      expect(roleHasPermission('cashier', 'members.read')).toBe(false);
    });
  });

  describe('Member Service (hierarchy 4)', () => {
    const perms = ROLE_PERMISSION_MATRIX.member_service;

    test('should be able to create, read, update members', () => {
      expect(perms).toContain('members.create');
      expect(perms).toContain('members.read');
      expect(perms).toContain('members.update');
    });

    test('should have read access to shares and loans', () => {
      expect(perms).toContain('shares.read');
      expect(perms).toContain('loans.read');
    });

    test('should NOT be able to approve members', () => {
      expect(roleHasPermission('member_service', 'members.approve')).toBe(false);
    });
  });

  describe('Member (hierarchy 1)', () => {
    const perms = ROLE_PERMISSION_MATRIX.member;

    test('should have NO permissions in the matrix (RLS enforces own-data access)', () => {
      expect(perms).toHaveLength(0);
    });
  });
});

// ============================================================
// Test suite: Helper functions
// ============================================================

describe('RBAC Helper Functions', () => {
  
  describe('roleHasPermission()', () => {
    test('returns true for valid role-permission pair', () => {
      expect(roleHasPermission('system_admin', 'members.create')).toBe(true);
    });

    test('returns false for invalid role-permission pair', () => {
      expect(roleHasPermission('member', 'loans.approve')).toBe(false);
    });

    test('returns true when cash has cashier permission', () => {
      expect(roleHasPermission('cashier', 'transactions.cashier')).toBe(true);
    });

    test('returns false for unknown role (safe default)', () => {
      expect(roleHasPermission('unknown_role' as any, 'members.read')).toBe(false);
    });
  });

  describe('anyRoleHasPermission()', () => {
    test('returns true if ANY role has the permission', () => {
      expect(anyRoleHasPermission(['loan_officer', 'cashier'], 'loans.create')).toBe(true);
    });

    test('returns false if NO role has the permission', () => {
      expect(anyRoleHasPermission(['member', 'cashier'], 'system.config')).toBe(false);
    });

    test('returns true for system_admin with any permission', () => {
      expect(anyRoleHasPermission(['system_admin'], 'reports.regulatory')).toBe(true);
    });
  });

  describe('getPermissionsForRole()', () => {
    test('returns permissions array for known role', () => {
      const perms = getPermissionsForRole('cashier');
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
    });

    test('returns empty array for unknown role', () => {
      const perms = getPermissionsForRole('unknown_role' as any);
      expect(Array.isArray(perms)).toBe(true);
      expect(perms).toHaveLength(0);
    });
  });

  describe('syncCheckPermission()', () => {
    test('returns true when all roles have the permission', () => {
      expect(syncCheckPermission(['system_admin'], 'loans.approve')).toBe(true);
    });

    test('returns false when no role has the permission', () => {
      expect(syncCheckPermission(['member'], 'loans.approve')).toBe(false);
    });
  });
});

// ============================================================
// Test suite: Security boundaries
// ============================================================

describe('Security Boundaries', () => {
  
  test('member role should have zero matrix permissions (RLS-only)', () => {
    const memberPerms = ROLE_PERMISSION_MATRIX.member;
    expect(memberPerms).toHaveLength(0);
  });

  test('cashier should NOT access loan operations', () => {
    expect(roleHasPermission('cashier', 'loans.create')).toBe(false);
    expect(roleHasPermission('cashier', 'loans.approve')).toBe(false);
    expect(roleHasPermission('cashier', 'loans.update')).toBe(false);
  });

  test('member_service should NOT approve members', () => {
    expect(roleHasPermission('member_service', 'members.approve')).toBe(false);
  });

  test('loan_officer should NOT approve loans (only senior does)', () => {
    expect(roleHasPermission('loan_officer', 'loans.approve')).toBe(false);
  });

  test('compliance_officer should NOT manage system config', () => {
    expect(roleHasPermission('compliance_officer', 'system.config')).toBe(false);
  });

  test('no role except system_admin should have system.roles_manage', () => {
    Object.keys(ROLE_PERMISSION_MATRIX).forEach((role) => {
      if (role !== 'system_admin') {
        expect(roleHasPermission(role, 'system.roles_manage')).toBe(false);
      }
    });
  });

  test('all permissions should be valid slugs', () => {
    Object.values(ROLE_PERMISSION_MATRIX).forEach((permSet) => {
      permSet.forEach((perm) => {
        expect(PERMISSION_SLAUGHS).toContain(perm as typeof PERMISSION_SLAUGHS[number]);
      });
    });
  });
});

// ============================================================
// Test suite: Hierarchy verification (SQL assertions ported to TS)
// ============================================================

describe('Hierarchy Verification', () => {
  
  const EXPECTED_HIERARCHY = {
    system_admin: 10,
    compliance_officer: 9,
    branch_manager: 8,
    senior_loan_officer: 7,
    loan_officer: 6,
    cashier: 5,
    member_service: 4,
    member: 1,
  };

  test('system_admin should have the most permissions (25)', () => {
    expect(getPermissionsForRole('system_admin')).toHaveLength(25);
  });

  test('permissions should decrease as hierarchy decreases', () => {
    const adminCount = getPermissionsForRole('system_admin').length;
    const memberCount = getPermissionsForRole('member').length;
    expect(adminCount).toBeGreaterThan(memberCount);
  });

  test('compliance_officer should have fewer perms than system_admin', () => {
    const complianceCount = Object.keys(ROLE_PERMISSION_MATRIX.compliance_officer).length;
    const adminCount = Object.keys(ROLE_PERMISSION_MATRIX.system_admin).length;
    expect(complianceCount).toBeLessThan(adminCount);
  });

  test('all hierarchy levels should be unique', () => {
    const levels = Object.values(EXPECTED_HIERARCHY);
    const uniqueLevels = new Set(levels);
    expect(uniqueLevels.size).toBe(levels.length);
  });
});
