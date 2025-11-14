/**
 * Authorization and Role-Based Access Control
 */

import type { User } from "./auth";

export type Permission =
  | "deals:create"
  | "deals:read"
  | "deals:update"
  | "deals:delete"
  | "analyses:create"
  | "analyses:read"
  | "analyses:update"
  | "analyses:delete"
  | "analyses:export"
  | "analyses:share"
  | "notes:create"
  | "notes:read"
  | "notes:update"
  | "notes:delete"
  | "team:view"
  | "team:manage"
  | "settings:view"
  | "settings:edit";

export type ResourceType = "deal" | "analysis" | "note";

interface ResourcePermission {
  userId?: string;
  role?: "owner" | "editor" | "viewer";
}

/**
 * Role-based permissions
 */
const ROLE_PERMISSIONS: Record<User["role"], Permission[]> = {
  admin: [
    "deals:create",
    "deals:read",
    "deals:update",
    "deals:delete",
    "analyses:create",
    "analyses:read",
    "analyses:update",
    "analyses:delete",
    "analyses:export",
    "analyses:share",
    "notes:create",
    "notes:read",
    "notes:update",
    "notes:delete",
    "team:view",
    "team:manage",
    "settings:view",
    "settings:edit",
  ],
  user: [
    "deals:create",
    "deals:read",
    "deals:update",
    "analyses:create",
    "analyses:read",
    "analyses:update",
    "analyses:export",
    "analyses:share",
    "notes:create",
    "notes:read",
    "notes:update",
    "team:view",
    "settings:view",
  ],
  viewer: [
    "deals:read",
    "analyses:read",
    "notes:read",
    "team:view",
  ],
};

/**
 * Check if user has permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(
  user: User | null,
  action: Permission,
  resource?: {
    type: ResourceType;
    permissions?: ResourcePermission;
    ownerId?: string;
  }
): boolean {
  if (!user) return false;

  const basePermission = hasPermission(user, action);
  if (!basePermission) return false;

  // If resource has specific permissions, check them
  if (resource?.permissions) {
    const { userId, role } = resource.permissions;
    
    // Owner can do everything
    if (userId === user.id || role === "owner") {
      return true;
    }

    // Editor can update/read
    if (
      role === "editor" &&
      (action.includes(":read") || action.includes(":update"))
    ) {
      return true;
    }

    // Viewer can only read
    if (role === "viewer" && action.includes(":read")) {
      return true;
    }
  }

  // Check ownership
  if (resource?.ownerId && resource.ownerId === user.id) {
    return true;
  }

  return basePermission;
}

/**
 * Get resource permissions for user
 */
export function getResourcePermissions(
  user: User | null,
  resource: {
    type: ResourceType;
    permissions?: ResourcePermission;
    ownerId?: string;
  }
): Permission[] {
  if (!user) return [];

  const allPermissions = ROLE_PERMISSIONS[user.role] || [];
  
  // Filter based on resource permissions
  return allPermissions.filter((permission) =>
    canPerformAction(user, permission, resource)
  );
}

