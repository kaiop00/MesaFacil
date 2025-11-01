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

  // Check if user has access to a specific feature flag
  const hasFeatureAccess = useMemo(() => {
    return (featureFlag) => hasFeature(planId, featureFlag);
  }, [planId]);

  // Get required plan for a feature
  const getRequiredPlan = useMemo(() => {
    return (featureFlag) => getRequiredPlanForFeature(featureFlag);
  }, []);

  // Check if can add more of a resource type
  const checkCanAddMore = useMemo(() => {
    return (limitType, currentCount) => canAddMore(planId, limitType, currentCount);
  }, [planId]);

  // Get usage statistics for a resource
  const getUsageStats = useMemo(() => {
    return (limitType, currentCount) => {
      const limit = getLimit(planId, limitType);
      const percentage = getUsagePercentage(planId, limitType, currentCount);
      const canAdd = canAddMore(planId, limitType, currentCount);
      const isUnlimited = canExceedLimit(planId, limitType);

      return {
        current: currentCount,
        limit,
        percentage,
        canAdd,
        isUnlimited,
        formattedLimit: formatLimit(limit)
      };
    };
  }, [planId]);

  // Get plan display information
  const planInfo = useMemo(() => {
    return {
      id: planId,
      name: PLAN_NAMES[planId] || 'Desconhecido',
      color: PLAN_COLORS[planId] || 'gray',
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
    return getAvailableReports(planId);
  }, [planId]);

  // Check if can generate specific report
  const checkCanGenerateReport = useMemo(() => {
    return (reportType) => canGenerateReportUtil(planId, reportType);
  }, [planId]);

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
    const daysRemaining = getDaysRemaining();
    return daysRemaining !== null && daysRemaining <= 0;
  }, [getDaysRemaining]);

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
    getLimit: (limitType) => getLimit(planId, limitType),
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
