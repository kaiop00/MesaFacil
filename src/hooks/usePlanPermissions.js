/**
 * usePlanPermissions Hook
 * 
 * Custom hook for checking plan-based permissions and feature access.
 * Integrates with usePlanManagement and provides additional utility functions.
 */

import { useMemo } from 'react';
import { usePlanManagement } from './usePlanManagement';
import {
  hasFeature,
  getRequiredPlanForFeature,
  canExceedLimit,
  getLimit,
  canAddMore,
  getUsagePercentage,
  comparePlans,
  isUpgrade,
  getFeatureDifference,
  canGenerateReport as canGenerateReportUtil,
  getAvailableReports,
  getUpgradeRecommendation,
  formatLimit,
  getFeatureName
} from '@/utils/planPermissions';
import { PLAN_NAMES, PLAN_COLORS } from '@/constants/planFeatures';
import { STRIPE_TEMPORARILY_DISABLED } from '@/services/stripeService';

/**
 * Hook that provides plan permission checking utilities
 * @returns {Object} Plan permissions and utilities
 */
export const usePlanPermissions = () => {
  const {
    currentPlan,
    planLoading,
    hasActivePlan,
    setUserPlan,
    checkUserPlan,
    canAccessFeature: legacyCanAccessFeature,
    canAddProduct: legacyCanAddProduct,
    canAddTable: legacyCanAddTable,
    canGenerateReport: legacyCanGenerateReport,
    getAccessLevel,
    getDaysRemaining
  } = usePlanManagement();

  // Extract plan ID from current plan object
  const planId = useMemo(() => {
    return currentPlan?.planId || 'free';
  }, [currentPlan]);

  const shouldBypassPlanGates = useMemo(() => {
    return STRIPE_TEMPORARILY_DISABLED;
  }, []);

  // During active free trial (or when Stripe is disabled), grant complete access as premium.
  const hasFullTrialAccess = useMemo(() => {
    if (shouldBypassPlanGates) return true;
    return Boolean(currentPlan) && planId === 'free' && !currentPlan?.isTrialExpired;
  }, [shouldBypassPlanGates, planId, currentPlan]);

  const effectivePlanId = useMemo(() => {
    return hasFullTrialAccess ? 'semiannual' : planId;
  }, [hasFullTrialAccess, planId]);

  // Check if user has access to a specific feature flag
  const hasFeatureAccess = useMemo(() => {
    return (featureFlag) => {
      if (shouldBypassPlanGates) return true;
      return hasFeature(effectivePlanId, featureFlag);
    };
  }, [effectivePlanId, shouldBypassPlanGates]);

  // Get required plan for a feature
  const getRequiredPlan = useMemo(() => {
    return (featureFlag) => getRequiredPlanForFeature(featureFlag);
  }, []);

  // Check if can add more of a resource type
  const checkCanAddMore = useMemo(() => {
    return (limitType, currentCount) => canAddMore(effectivePlanId, limitType, currentCount);
  }, [effectivePlanId]);

  // Get usage statistics for a resource
  const getUsageStats = useMemo(() => {
    return (limitType, currentCount) => {
      const limit = getLimit(effectivePlanId, limitType);
      const percentage = getUsagePercentage(effectivePlanId, limitType, currentCount);
      const canAdd = canAddMore(effectivePlanId, limitType, currentCount);
      const isUnlimited = canExceedLimit(effectivePlanId, limitType);

      return {
        current: currentCount,
        limit,
        percentage,
        canAdd,
        isUnlimited,
        formattedLimit: formatLimit(limit)
      };
    };
  }, [effectivePlanId]);

  // Get plan display information
  const planInfo = useMemo(() => {
    const displayPlanId = planId;
    return {
      id: displayPlanId,
      name: PLAN_NAMES[displayPlanId] || 'Desconhecido',
      color: PLAN_COLORS[displayPlanId] || 'gray',
      daysRemaining: getDaysRemaining(),
      expiresAt: currentPlan?.expiresAt,
      activatedAt: currentPlan?.activatedAt
    };
  }, [planId, currentPlan, getDaysRemaining]);

  // Check if target plan is an upgrade
  const checkIsUpgrade = useMemo(() => {
    return (targetPlan) => isUpgrade(planId, targetPlan);
  }, [planId]);

  // Get features that would be gained by upgrading
  const getFeaturesGained = useMemo(() => {
    return (targetPlan) => {
      const features = getFeatureDifference(planId, targetPlan);
      return features.map(feature => ({
        flag: feature,
        name: getFeatureName(feature)
      }));
    };
  }, [planId]);

  // Get available report types for current plan
  const availableReports = useMemo(() => {
    return getAvailableReports(effectivePlanId);
  }, [effectivePlanId]);

  // Check if can generate specific report
  const checkCanGenerateReport = useMemo(() => {
    return (reportType) => canGenerateReportUtil(effectivePlanId, reportType);
  }, [effectivePlanId]);

  // Get upgrade recommendation based on usage
  const getRecommendation = useMemo(() => {
    return (usage) => {
      const recommendation = getUpgradeRecommendation(usage, planId);
      
      if (!recommendation) return null;
      
      return {
        planId: recommendation,
        planName: PLAN_NAMES[recommendation],
        features: getFeaturesGained(recommendation)
      };
    };
  }, [planId, getFeaturesGained]);

  // Check if plan is expiring soon (within 7 days)
  const isExpiringSoon = useMemo(() => {
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  }, [getDaysRemaining]);

  // Check if plan has expired
  const isExpired = useMemo(() => {
    if (shouldBypassPlanGates) {
      return false;
    }
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining <= 0;
  }, [getDaysRemaining, shouldBypassPlanGates]);

  // Legacy compatibility wrappers
  const canAddProduct = useMemo(() => {
    return (currentProductCount) => {
      // Use legacy method for backwards compatibility
      if (legacyCanAddProduct) {
        return legacyCanAddProduct(currentProductCount);
      }
      return checkCanAddMore('maxProducts', currentProductCount);
    };
  }, [legacyCanAddProduct, checkCanAddMore]);

  const canAddTable = useMemo(() => {
    return (currentTableCount) => {
      // Use legacy method for backwards compatibility
      if (legacyCanAddTable) {
        return legacyCanAddTable(currentTableCount);
      }
      return checkCanAddMore('maxTables', currentTableCount);
    };
  }, [legacyCanAddTable, checkCanAddMore]);

  const canGenerateReport = useMemo(() => {
    return (reportType) => {
      // Use legacy method for backwards compatibility
      if (legacyCanGenerateReport) {
        return legacyCanGenerateReport(reportType);
      }
      return checkCanGenerateReport(reportType);
    };
  }, [legacyCanGenerateReport, checkCanGenerateReport]);

  return {
    // Plan information
    currentPlan,
    planId,
    planInfo,
    planLoading,
    hasActivePlan,
    
    // Plan status
    isExpiringSoon,
    isExpired,
    daysRemaining: getDaysRemaining(),
    
    // Feature access
    hasFeatureAccess,
    getRequiredPlan,
    canAccessFeature: legacyCanAccessFeature, // Legacy compatibility
    
    // Resource limits
    canAddProduct,
    canAddTable,
    canAddMore: checkCanAddMore,
    getLimit: (limitType) => getLimit(effectivePlanId, limitType),
    getUsageStats,
    
    // Reports
    canGenerateReport,
    availableReports,
    
    // Plan comparison
    isUpgrade: checkIsUpgrade,
    comparePlans: (targetPlan) => comparePlans(planId, targetPlan),
    getFeaturesGained,
    getRecommendation,
    
    // Plan management
    setUserPlan,
    checkUserPlan,
    getAccessLevel,
    
    // Utilities
    formatLimit,
    getFeatureName
  };
};

export default usePlanPermissions;
