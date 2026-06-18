import { useAuth } from "@/contexts/AuthContext";

/**
 * Custom hook for checking user permissions
 * @returns {Object} Permission checking utilities
 */
export const usePermissions = () => {
  const { role } = useAuth();

  const isLegacyRoleObject = role && typeof role === 'object';
  const isEmptyRoleObject = isLegacyRoleObject && Object.keys(role).length === 0;
  const isLegacyRoleString = typeof role === 'string' && role !== 'admin';
  const hasLegacyFullAccess = isLegacyRoleString || isEmptyRoleObject;

  /**
   * Check if user has a specific permission
   * @param {string} permission - Permission ID to check
   * @returns {boolean} True if user has permission or is admin
   */
  const hasPermission = (permission) => {
    if (!role) return false;
    if (role === "admin") return true;

    // Compatibilidade para contas legadas (role string antigo ou objeto vazio)
    // que ficariam totalmente bloqueadas após migração de permissões.
    if (hasLegacyFullAccess) {
      return true;
    }

    return role[permission] === true;
  };

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissions - Array of permission IDs
   * @returns {boolean} True if user has at least one permission or is admin
   */
  const hasAnyPermission = (permissions) => {
    if (!role) return false;
    if (role === "admin") return true;
    if (hasLegacyFullAccess) return true;
    return permissions.some(permission => role[permission] === true);
  };

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} permissions - Array of permission IDs
   * @returns {boolean} True if user has all permissions or is admin
   */
  const hasAllPermissions = (permissions) => {
    if (!role) return false;
    if (role === "admin") return true;
    if (hasLegacyFullAccess) return true;
    return permissions.every(permission => role[permission] === true);
  };

  /**
   * Check if user is admin
   * @returns {boolean} True if user is admin
   */
  const isAdmin = () => {
    return role === "admin" || hasLegacyFullAccess;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    role
  };
};
