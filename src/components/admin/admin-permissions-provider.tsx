"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  permissionKey,
  resourcePermissionModule,
  type PermissionAction,
} from "@/config/admin-permissions";

type AdminPermissionsState = {
  loading: boolean;
  enforcePermissions: boolean;
  permissions: Set<string> | null;
};

type AdminPermissionsContextValue = AdminPermissionsState & {
  can: (moduleKey: string, action: PermissionAction) => boolean;
  canResource: (resourceId: string, action: PermissionAction) => boolean;
};

const AdminPermissionsContext = createContext<AdminPermissionsContextValue | null>(null);

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminPermissionsState>({
    loading: true,
    enforcePermissions: false,
    permissions: null,
  });

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setState({ loading: false, enforcePermissions: false, permissions: null });
          return;
        }
        const enforce = json.enforcePermissions === true;
        const permissions =
          enforce && Array.isArray(json.permissions)
            ? new Set(json.permissions as string[])
            : null;
        setState({ loading: false, enforcePermissions: enforce, permissions });
      })
      .catch(() => {
        setState({ loading: false, enforcePermissions: false, permissions: null });
      });
  }, []);

  const can = useCallback(
    (moduleKey: string, action: PermissionAction) => {
      if (!state.enforcePermissions || state.permissions === null) return true;
      return state.permissions.has(permissionKey(moduleKey, action));
    },
    [state.enforcePermissions, state.permissions]
  );

  const canResource = useCallback(
    (resourceId: string, action: PermissionAction) => {
      const moduleKey = resourcePermissionModule(resourceId);
      if (!moduleKey) return true;
      return can(moduleKey, action);
    },
    [can]
  );

  const value = useMemo(
    () => ({ ...state, can, canResource }),
    [state, can, canResource]
  );

  return (
    <AdminPermissionsContext.Provider value={value}>{children}</AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  const ctx = useContext(AdminPermissionsContext);
  if (!ctx) {
    return {
      loading: false,
      enforcePermissions: false,
      permissions: null as Set<string> | null,
      can: () => true,
      canResource: () => true,
    };
  }
  return ctx;
}

/** Hide children when the current staff role lacks module.action permission. */
export function AdminCan({
  module,
  action,
  children,
}: {
  module: string;
  action: PermissionAction;
  children: ReactNode;
}) {
  const { can, loading } = useAdminPermissions();
  if (loading) return null;
  if (!can(module, action)) return null;
  return <>{children}</>;
}

/** Hide children when the current staff role lacks resource action permission. */
export function AdminCanResource({
  resource,
  action,
  children,
}: {
  resource: string;
  action: PermissionAction;
  children: ReactNode;
}) {
  const { canResource, loading } = useAdminPermissions();
  if (loading) return null;
  if (!canResource(resource, action)) return null;
  return <>{children}</>;
}
