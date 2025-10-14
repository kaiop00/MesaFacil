/**
 * PlanContext
 * 
 * Centralized plan permissions provider that makes plan data and utilities
 * available throughout the application.
 */

import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';

// Create context with null default
const PlanContext = createContext(null);

/**
 * PlanProvider component
 * Wraps the application and provides plan permission utilities
 */
export const PlanProvider = ({ children }) => {
  const planPermissions = usePlanPermissions();

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // Plan information
    currentPlan: planPermissions.currentPlan,
    planId: planPermissions.planId,
    planInfo: planPermissions.planInfo,
    planLoading: planPermissions.planLoading,
    hasActivePlan: planPermissions.hasActivePlan,
    
    // Plan status
    isExpiringSoon: planPermissions.isExpiringSoon,
    isExpired: planPermissions.isExpired,
    daysRemaining: planPermissions.daysRemaining,
    
    // Feature access
    hasFeatureAccess: planPermissions.hasFeatureAccess,
    getRequiredPlan: planPermissions.getRequiredPlan,
    canAccessFeature: planPermissions.canAccessFeature,
    
    // Resource limits
    canAddProduct: planPermissions.canAddProduct,
    canAddTable: planPermissions.canAddTable,
    canAddMore: planPermissions.canAddMore,
    getLimit: planPermissions.getLimit,
    getUsageStats: planPermissions.getUsageStats,
    
    // Reports
    canGenerateReport: planPermissions.canGenerateReport,
    availableReports: planPermissions.availableReports,
    
    // Plan comparison
    isUpgrade: planPermissions.isUpgrade,
    comparePlans: planPermissions.comparePlans,
    getFeaturesGained: planPermissions.getFeaturesGained,
    getRecommendation: planPermissions.getRecommendation,
    
    // Plan management
    setUserPlan: planPermissions.setUserPlan,
    checkUserPlan: planPermissions.checkUserPlan,
    getAccessLevel: planPermissions.getAccessLevel,
    
    // Utilities
    formatLimit: planPermissions.formatLimit,
    getFeatureName: planPermissions.getFeatureName
  }), [planPermissions]);

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
};

PlanProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * usePlan Hook
 * Access plan context with error boundary
 * 
 * @throws {Error} If used outside PlanProvider
 * @returns {Object} Plan context value
 */
export const usePlan = () => {
  const context = useContext(PlanContext);
  
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  
  return context;
};

export default PlanContext;
