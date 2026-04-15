/**
 * Permission Restrictions by Plan
 * 
 * Define which permissions are available for each plan.
 * Free plan users cannot assign management permissions to other users.
 */

/**
 * Permissions that require a paid plan (not available in free plan)
 */
export const PAID_PLAN_PERMISSIONS = [
  'manage_tables',
  'manage_colors',
  'manage_categories',
  'manage_service_fee',
  'manage_cover_charge',
  'manage_whatsapp_menu',
  'manage_billing',
  'manage_ifood_integration',
];

/**
 * Check if a permission requires a paid plan
 * @param {string} permissionId - Permission ID to check
 * @returns {boolean} - True if permission requires paid plan
 */
export const requiresPaidPlan = (permissionId) => {
  return PAID_PLAN_PERMISSIONS.includes(permissionId);
};

const isFreePlanRestricted = (currentPlan, hasFullTrialAccess = false) => {
  return currentPlan === 'free' && !hasFullTrialAccess;
};

/**
 * Filter permissions based on current plan
 * @param {Object} permissions - Object with category -> permissions structure
 * @param {string} currentPlan - Current plan ID (free, monthly, etc.)
 * @returns {Object} - Filtered permissions object
 */
export const filterPermissionsByPlan = (permissions, currentPlan, hasFullTrialAccess = false) => {
  // If on free plan, remove paid permissions
  if (isFreePlanRestricted(currentPlan, hasFullTrialAccess)) {
    const filtered = {};
    
    Object.entries(permissions).forEach(([category, perms]) => {
      const filteredPerms = perms.filter(perm => !requiresPaidPlan(perm.id));
      
      // Only include category if it has permissions
      if (filteredPerms.length > 0) {
        filtered[category] = filteredPerms;
      }
    });
    
    return filtered;
  }
  
  // For paid plans, return all permissions
  return permissions;
};

/**
 * Check if user can assign a specific permission based on their plan
 * @param {string} permissionId - Permission to check
 * @param {string} currentPlan - Current plan ID
 * @returns {boolean} - True if permission can be assigned
 */
export const canAssignPermission = (permissionId, currentPlan, hasFullTrialAccess = false) => {
  if (isFreePlanRestricted(currentPlan, hasFullTrialAccess) && requiresPaidPlan(permissionId)) {
    return false;
  }
  return true;
};
