/**
 * Plan Permission Utilities
 * 
 * Helper functions for checking plan-based permissions and feature access.
 */

import { 
  FEATURE_FLAGS, 
  PLAN_FEATURE_MAP, 
  PLAN_HIERARCHY, 
  PLAN_LIMITS,
  REPORT_TYPES 
} from '@/constants/planFeatures';

/**
 * Check if a plan has access to a specific feature
 * @param {string} currentPlan - User's current plan (free, monthly, etc.)
 * @param {string} featureFlag - Feature flag to check (from FEATURE_FLAGS)
 * @returns {boolean} - Whether the plan has access to the feature
 */
export const hasFeature = (currentPlan, featureFlag) => {
  if (!currentPlan) return false;
  
  const planFeatures = PLAN_FEATURE_MAP[currentPlan] || [];
  return planFeatures.includes(featureFlag);
};

/**
 * Get the minimum required plan for a specific feature
 * @param {string} featureFlag - Feature flag to check
 * @returns {string|null} - Plan name or null if feature doesn't exist
 */
export const getRequiredPlanForFeature = (featureFlag) => {
  const plans = ['free', 'monthly', 'bimonthly', 'quarterly', 'semiannual'];
  
  for (const plan of plans) {
    if (PLAN_FEATURE_MAP[plan]?.includes(featureFlag)) {
      return plan;
    }
  }
  
  return null;
};

/**
 * Check if current plan can exceed a specific limit
 * @param {string} currentPlan - User's current plan
 * @param {string} limitType - Type of limit (maxProducts, maxTables, maxEmployees)
 * @returns {boolean} - Whether the plan has unlimited access
 */
export const canExceedLimit = (currentPlan, limitType) => {
  if (!currentPlan || !PLAN_LIMITS[currentPlan]) return false;
  
  return PLAN_LIMITS[currentPlan][limitType] === 'unlimited';
};

/**
 * Get the limit value for a specific resource type
 * @param {string} currentPlan - User's current plan
 * @param {string} limitType - Type of limit (maxProducts, maxTables, maxEmployees)
 * @returns {number|string} - Limit value or 'unlimited'
 */
export const getLimit = (currentPlan, limitType) => {
  if (!currentPlan || !PLAN_LIMITS[currentPlan]) {
    return PLAN_LIMITS.free[limitType] || 0;
  }
  
  return PLAN_LIMITS[currentPlan][limitType];
};

/**
 * Check if current usage is within plan limits
 * @param {string} currentPlan - User's current plan
 * @param {string} limitType - Type of limit to check
 * @param {number} currentCount - Current usage count
 * @returns {boolean} - Whether user can add more of this resource
 */
export const canAddMore = (currentPlan, limitType, currentCount) => {
  const limit = getLimit(currentPlan, limitType);
  
  if (limit === 'unlimited') return true;
  
  return currentCount < limit;
};

/**
 * Get usage percentage for display (0-100)
 * @param {string} currentPlan - User's current plan
 * @param {string} limitType - Type of limit
 * @param {number} currentCount - Current usage count
 * @returns {number} - Percentage (0-100) or -1 for unlimited
 */
export const getUsagePercentage = (currentPlan, limitType, currentCount) => {
  const limit = getLimit(currentPlan, limitType);
  
  if (limit === 'unlimited') return -1;
  
  return Math.min(100, Math.round((currentCount / limit) * 100));
};

/**
 * Compare two plans to determine upgrade/downgrade
 * @param {string} currentPlan - Current plan
 * @param {string} targetPlan - Plan to compare against
 * @returns {number} - Positive if upgrade, negative if downgrade, 0 if same
 */
export const comparePlans = (currentPlan, targetPlan) => {
  const currentLevel = PLAN_HIERARCHY[currentPlan] || 0;
  const targetLevel = PLAN_HIERARCHY[targetPlan] || 0;
  
  return targetLevel - currentLevel;
};

/**
 * Check if a plan is an upgrade from current plan
 * @param {string} currentPlan - Current plan
 * @param {string} targetPlan - Plan to check
 * @returns {boolean} - Whether target is an upgrade
 */
export const isUpgrade = (currentPlan, targetPlan) => {
  return comparePlans(currentPlan, targetPlan) > 0;
};

/**
 * Get list of features that would be gained by upgrading
 * @param {string} currentPlan - Current plan
 * @param {string} targetPlan - Target plan
 * @returns {string[]} - Array of feature flags that would be gained
 */
export const getFeatureDifference = (currentPlan, targetPlan) => {
  const currentFeatures = PLAN_FEATURE_MAP[currentPlan] || [];
  const targetFeatures = PLAN_FEATURE_MAP[targetPlan] || [];
  
  return targetFeatures.filter(feature => !currentFeatures.includes(feature));
};

/**
 * Check if user can generate a specific report type
 * @param {string} currentPlan - User's current plan
 * @param {string} reportType - Report type (daily, weekly, monthly, etc.)
 * @returns {boolean} - Whether user can generate this report
 */
export const canGenerateReport = (currentPlan, reportType) => {
  const report = REPORT_TYPES.find(r => r.value === reportType);
  
  if (!report) return false;
  
  const requiredPlanLevel = PLAN_HIERARCHY[report.requiredPlan] || 0;
  const currentPlanLevel = PLAN_HIERARCHY[currentPlan] || 0;
  
  return currentPlanLevel >= requiredPlanLevel;
};

/**
 * Get available report types for current plan
 * @param {string} currentPlan - User's current plan
 * @returns {Array} - Array of available report type objects
 */
export const getAvailableReports = (currentPlan) => {
  return REPORT_TYPES.filter(report => canGenerateReport(currentPlan, report.value));
};

/**
 * Get upgrade recommendation based on usage patterns
 * @param {Object} usage - Current usage stats { productCount, tableCount, employeeCount }
 * @param {string} currentPlan - Current plan
 * @returns {string|null} - Recommended plan or null if no upgrade needed
 */
export const getUpgradeRecommendation = (usage, currentPlan) => {
  const { productCount = 0, tableCount = 0, employeeCount = 1 } = usage;
  
  // If already on highest plan
  if (currentPlan === 'semiannual') return null;
  
  // Check if hitting limits
  const currentLimits = PLAN_LIMITS[currentPlan];
  
  if (currentLimits.maxProducts !== 'unlimited' && productCount >= currentLimits.maxProducts * 0.8) {
    return 'monthly'; // Need unlimited products
  }
  
  if (currentLimits.maxTables !== 'unlimited' && tableCount >= currentLimits.maxTables * 0.8) {
    return 'monthly'; // Need unlimited tables
  }
  
  // Recommend based on feature needs
  if (currentPlan === 'free') {
    return 'monthly'; // Basic features
  }
  
  if (currentPlan === 'monthly' && employeeCount > 1) {
    return 'quarterly'; // Need more employees
  }
  
  return null;
};

/**
 * Format limit for display
 * @param {number|string} limit - Limit value
 * @returns {string} - Formatted string
 */
export const formatLimit = (limit) => {
  if (limit === 'unlimited') return 'Ilimitado';
  return String(limit);
};

/**
 * Get user-friendly feature name
 * @param {string} featureFlag - Feature flag constant
 * @returns {string} - Display name
 */
export const getFeatureName = (featureFlag) => {
  const featureNames = {
    [FEATURE_FLAGS.BASIC_DASHBOARD]: 'Dashboard Básico',
    [FEATURE_FLAGS.FULL_DASHBOARD]: 'Dashboard Completo',
    [FEATURE_FLAGS.ADVANCED_ANALYTICS]: 'Análises Avançadas',
    [FEATURE_FLAGS.BASIC_ORDERS]: 'Pedidos Básicos',
    [FEATURE_FLAGS.ADVANCED_ORDERS]: 'Pedidos Avançados',
    [FEATURE_FLAGS.ORDER_HISTORY]: 'Histórico de Pedidos',
    [FEATURE_FLAGS.UNLIMITED_PRODUCTS]: 'Produtos Ilimitados',
    [FEATURE_FLAGS.UNLIMITED_TABLES]: 'Mesas Ilimitadas',
    [FEATURE_FLAGS.DAILY_REPORTS]: 'Relatórios Diários',
    [FEATURE_FLAGS.WEEKLY_REPORTS]: 'Relatórios Semanais',
    [FEATURE_FLAGS.MONTHLY_REPORTS]: 'Relatórios Mensais',
    [FEATURE_FLAGS.BIMONTHLY_REPORTS]: 'Relatórios Bimestrais',
    [FEATURE_FLAGS.QUARTERLY_REPORTS]: 'Relatórios Trimestrais',
    [FEATURE_FLAGS.SEMIANNUAL_REPORTS]: 'Relatórios Semestrais',
    [FEATURE_FLAGS.INVENTORY_CONTROL]: 'Controle de Estoque',
    [FEATURE_FLAGS.CUSTOM_LAYOUT]: 'Personalização de Layout',
    [FEATURE_FLAGS.PROMOTIONS_ADS]: 'Promoções e Anúncios',
    [FEATURE_FLAGS.EMPLOYEE_MANAGEMENT]: 'Gestão de Funcionários',
    [FEATURE_FLAGS.PRIORITY_SUPPORT]: 'Suporte Prioritário',
    [FEATURE_FLAGS.PREMIUM_SUPPORT]: 'Suporte Premium',
    [FEATURE_FLAGS.AUTO_BACKUP]: 'Backup Automático'
  };
  
  return featureNames[featureFlag] || featureFlag;
};
