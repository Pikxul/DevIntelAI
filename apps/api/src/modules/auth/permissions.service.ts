import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from '../../entities';

/**
 * The canonical permission map derived from the user story (Chapters 4 & 9).
 * Each role maps to an array of granular permission strings.
 */
const ROLE_PERMISSION_SEED: Record<string, string[]> = {
  owner: [
    // Full access — org management
    'org:create', 'org:delete', 'org:settings',
    'user:invite', 'user:remove', 'user:assign_role',
    'sso:configure',
    'billing:manage',
    // Full access — operational
    'repo:connect', 'repo:manage',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage',
    'deployment:view', 'deployment:rollback',
    'ai_review:view',
    'incident:view', 'incident:manage',
    'rca:view',
    'alert:view', 'alert:manage',
    'monitoring:view',
    'dora:view',
    'policy:read', 'policy:write',
    'governance:view',
    'compliance:view',
    'audit_log:view',
    'dashboard:view',
    'analytics:view',
    'report:view',
    'approval:review',
  ],

  admin: [
    // User management (except billing and org deletion)
    'user:invite', 'user:remove', 'user:assign_role',
    // Repositories & pipelines
    'repo:connect', 'repo:manage',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage',
    'deployment:view', 'deployment:rollback',
    'ai_review:view',
    // Incidents & monitoring
    'incident:view', 'incident:manage',
    'rca:view',
    'alert:view', 'alert:manage',
    'monitoring:view',
    'dora:view',
    // Policies
    'policy:read', 'policy:write',
    'governance:view',
    'compliance:view',
    'audit_log:view',
    // Dashboards
    'dashboard:view',
    'analytics:view',
    'report:view',
    'approval:review',
  ],

  devops_engineer: [
    'repo:connect', 'repo:manage',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage',
    'deployment:view', 'deployment:rollback',
    'ai_review:view',
    'incident:view',
    'monitoring:view',
    'dora:view',
    'dashboard:view',
    'analytics:view',
  ],

  sre_engineer: [
    'incident:view', 'incident:manage',
    'rca:view',
    'alert:view', 'alert:manage',
    'monitoring:view',
    'dora:view',
    'deployment:view',
    'pipeline:view',
    'dashboard:view',
    'analytics:view',
  ],

  security_engineer: [
    'policy:read', 'policy:write',
    'governance:view',
    'compliance:view',
    'audit_log:view',
    'ai_review:view',
    'incident:view',
    'dashboard:view',
    'analytics:view',
  ],

  developer: [
    'repo:view',
    'pipeline:view',
    'deployment:view',
    'ai_review:view',
    'dashboard:view',
  ],

  viewer: [
    'dashboard:view',
    'analytics:view',
    'dora:view',
    'report:view',
  ],
};

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);

  /** In-memory cache: roleName → Set<permissionName> */
  private cache = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rpRepo: Repository<RolePermissionEntity>,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                         */
  /* ------------------------------------------------------------------ */

  async onModuleInit() {
    await this.seed();
    await this.loadCache();
    this.logger.log(`Permission cache loaded – ${this.cache.size} roles cached`);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Returns true when the given role possesses the requested permission.
   * Falls through to the `owner` role as an implicit super-admin.
   */
  hasPermission(role: string, permission: string): boolean {
    const normalised = role.toLowerCase();
    const perms = this.cache.get(normalised);
    if (!perms) {
      // Unknown role → fail-closed
      return false;
    }
    return perms.has(permission);
  }

  /**
   * Returns true when the given role possesses ALL of the requested permissions.
   */
  hasAllPermissions(role: string, permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(role, p));
  }

  /**
   * Returns the full set of permission strings for a role (useful for the frontend).
   */
  getPermissionsForRole(role: string): string[] {
    const perms = this.cache.get(role.toLowerCase());
    return perms ? Array.from(perms) : [];
  }

  /* ------------------------------------------------------------------ */
  /*  Seed & Cache                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Idempotent seed: only inserts roles/permissions that don't already exist.
   */
  private async seed() {
    // ---- Roles ----
    const existingRoles = await this.roleRepo.find();
    const existingRoleNames = new Set(existingRoles.map((r) => r.name));

    for (const roleName of Object.keys(ROLE_PERMISSION_SEED)) {
      if (!existingRoleNames.has(roleName)) {
        await this.roleRepo.save(
          this.roleRepo.create({ name: roleName, description: `${roleName} role` }),
        );
        this.logger.log(`Seeded role: ${roleName}`);
      }
    }

    // ---- Permissions ----
    const allPermNames = new Set<string>();
    for (const perms of Object.values(ROLE_PERMISSION_SEED)) {
      perms.forEach((p) => allPermNames.add(p));
    }

    const existingPerms = await this.permRepo.find();
    const existingPermNames = new Set(existingPerms.map((p) => p.name));

    for (const permName of allPermNames) {
      if (!existingPermNames.has(permName)) {
        await this.permRepo.save(
          this.permRepo.create({ name: permName, description: permName }),
        );
        this.logger.log(`Seeded permission: ${permName}`);
      }
    }

    // ---- Role ↔ Permission mappings ----
    const freshRoles = await this.roleRepo.find();
    const freshPerms = await this.permRepo.find();
    const roleMap = new Map(freshRoles.map((r) => [r.name, r.id]));
    const permMap = new Map(freshPerms.map((p) => [p.name, p.id]));

    const existingMappings = await this.rpRepo.find();
    const existingPairs = new Set(
      existingMappings.map((m) => `${m.roleId}::${m.permissionId}`),
    );

    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSION_SEED)) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      for (const permName of permissions) {
        const permId = permMap.get(permName);
        if (!permId) continue;

        const pairKey = `${roleId}::${permId}`;
        if (!existingPairs.has(pairKey)) {
          await this.rpRepo.save(this.rpRepo.create({ roleId, permissionId: permId }));
        }
      }
    }

    this.logger.log('Permission seed complete');
  }

  /**
   * Loads roles → permissions into the in-memory cache from the database.
   */
  private async loadCache() {
    this.cache.clear();

    const roles = await this.roleRepo.find();
    const perms = await this.permRepo.find();
    const mappings = await this.rpRepo.find();

    const permById = new Map(perms.map((p) => [p.id, p.name]));

    for (const role of roles) {
      const rolePerms = mappings
        .filter((m) => m.roleId === role.id)
        .map((m) => permById.get(m.permissionId))
        .filter(Boolean) as string[];

      this.cache.set(role.name.toLowerCase(), new Set(rolePerms));
    }
  }
}
