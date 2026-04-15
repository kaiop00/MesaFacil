import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import stripeService from '@/services/stripeService';
import {
  getStripeCustomerId,
  updateStripeData,
  getFreeTrialData,
  initializeFreeTrialIfNeeded,
  markFreeTrialAsExpired
} from '@/services/firebase/restaurantService';

const FREE_TRIAL_DAYS = 30;

const isPaidPlanActive = (plan) => {
  if (!plan) return false;
  return plan.planId !== 'free' && (plan.status === 'active' || plan.status === 'trialing');
};

const buildTrialState = (basePlan, trialData) => {
  const now = new Date();
  const expiresAt = trialData?.expiresAt || null;
  const isExpired = Boolean(trialData?.isExpired) || (expiresAt ? now > expiresAt : false);

  let trialDaysRemaining = null;
  if (expiresAt) {
    const diffMs = expiresAt.getTime() - now.getTime();
    trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    ...basePlan,
    planId: 'free',
    status: isExpired ? 'expired' : 'active',
    trialStartedAt: trialData?.startedAt || null,
    trialExpiresAt: expiresAt,
    trialDaysRemaining,
    trialLimitDays: FREE_TRIAL_DAYS,
    isTrialExpired: isExpired,
  };
};

export const usePlanManagement = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const { idRestaurante, stripeCustomerId, plan: authPlan } = useAuth();

  const loadFreeTrialPlan = useCallback(async (restaurantId, basePlan = null) => {
    const trialData = await initializeFreeTrialIfNeeded(restaurantId);
    const trialPlan = buildTrialState(basePlan || { planId: 'free' }, trialData);

    if (trialPlan.isTrialExpired && !trialData?.isExpired) {
      try {
        await markFreeTrialAsExpired(restaurantId);
      } catch (markError) {
        console.error('Erro ao marcar teste grátis como expirado:', markError);
      }
    }

    setCurrentPlan(trialPlan);
    setHasActivePlan(!trialPlan.isTrialExpired);
    return trialPlan;
  }, []);

  // Check if restaurant has an active plan (from Stripe)
  const checkUserPlan = useCallback(async (restaurantId) => {
    if (!restaurantId) return null;
    
    try {
      // Get stripeCustomerId from auth context or fetch from restaurant document
      let customerId = stripeCustomerId;
      
      if (!customerId) {
        customerId = await getStripeCustomerId(restaurantId);
      }

      // Fetch plan from Stripe (will return mock premium plan if Stripe is disabled)
      const plan = await stripeService.getCurrentPlan(customerId);

      if (isPaidPlanActive(plan)) {
        setCurrentPlan(plan);
        setHasActivePlan(true);
        return plan;
      }

      return await loadFreeTrialPlan(restaurantId, plan);
    } catch (error) {
      console.error('Erro ao verificar plano do restaurante:', error);

      try {
        return await loadFreeTrialPlan(restaurantId, { planId: 'free' });
      } catch (trialError) {
        console.error('Erro ao carregar fallback do teste grátis:', trialError);
        const fallbackPlan = { planId: 'free', status: 'expired', isTrialExpired: true };
        setCurrentPlan(fallbackPlan);
        setHasActivePlan(false);
        return fallbackPlan;
      }
    }
  }, [stripeCustomerId, loadFreeTrialPlan]);

  // Save Stripe customer ID to restaurant document (only reference data)
  const setUserPlan = async (restaurantId, customerId, subscriptionId = null) => {
    try {
      // If customerId is provided, update Stripe references
      if (customerId) {
        await updateStripeData(restaurantId, customerId, subscriptionId);
        
        // Fetch updated plan from Stripe
        const plan = await stripeService.getCurrentPlan(customerId);
        setCurrentPlan(plan);
        setHasActivePlan(plan.status === 'active' || plan.status === 'trialing');
        
        return plan;
      } else {
        const fallbackPlan = await stripeService.getCurrentPlan(null);
        if (isPaidPlanActive(fallbackPlan)) {
          setCurrentPlan(fallbackPlan);
          setHasActivePlan(true);
          return fallbackPlan;
        }

        // For free plan, enforce the restaurant trial window
        return await loadFreeTrialPlan(restaurantId, {
          planId: 'free',
          stripeSubscriptionId: null,
          stripePriceId: null
        });
      }
    } catch (error) {
      console.error('Erro ao salvar referência do Stripe no restaurante:', error);
      throw error;
    }
  };

  // Check if user can access a feature (based on plan from constants)
  const canAccessFeature = () => {
    // This will be handled by planPermissions utilities
    // Keeping for backward compatibility
    return true;
  };

  // Check if user can add more products (based on plan limits)
  const canAddProduct = () => {
    // This will be handled by planPermissions utilities
    // Keeping for backward compatibility
    return true;
  };

  // Check if user can add more tables (based on plan limits)
  const canAddTable = () => {
    // This will be handled by planPermissions utilities
    // Keeping for backward compatibility
    return true;
  };

  // Check if user can generate specific reports
  const canGenerateReport = () => {
    // This will be handled by planPermissions utilities
    // Keeping for backward compatibility
    return true;
  };

  // Get access level (not used anymore, keeping for compatibility)
  const getAccessLevel = () => {
    return currentPlan?.planId === 'free' ? 40 : 100;
  };

  // Get days remaining in subscription
  const getDaysRemaining = () => {
    if (!currentPlan) {
      return null;
    }

    if (currentPlan.planId === 'free') {
      return typeof currentPlan.trialDaysRemaining === 'number' ? currentPlan.trialDaysRemaining : null;
    }

    if (!currentPlan.expiresAt) {
      return null;
    }
    
    const expirationDate = new Date(currentPlan.expiresAt);
    const today = new Date();
    const timeDiff = expirationDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysDiff);
  };

  useEffect(() => {
    const loadUserPlan = async () => {
      if (idRestaurante) {
        setPlanLoading(true);
        
        try {
          if (isPaidPlanActive(authPlan)) {
            setCurrentPlan(authPlan);
            setHasActivePlan(true);
          } else {
            let trialData = await getFreeTrialData(idRestaurante);
            if (!trialData.hasStarted) {
              trialData = await initializeFreeTrialIfNeeded(idRestaurante);
            }

            const trialPlan = buildTrialState(authPlan || { planId: 'free' }, trialData);

            if (trialPlan.isTrialExpired && !trialData?.isExpired) {
              try {
                await markFreeTrialAsExpired(idRestaurante);
              } catch (markError) {
                console.error('Erro ao persistir status expirado do teste grátis:', markError);
              }
            }

            setCurrentPlan(trialPlan);
            setHasActivePlan(!trialPlan.isTrialExpired);
          }
        } catch (error) {
          console.error('Erro ao carregar plano do restaurante:', error);
          await checkUserPlan(idRestaurante);
        }
        
        setPlanLoading(false);
      }
    };

    loadUserPlan();
  }, [idRestaurante, authPlan, checkUserPlan]);

  return {
    currentPlan,
    planLoading,
    hasActivePlan,
    setUserPlan,
    checkUserPlan,
    canAccessFeature,
    canAddProduct,
    canAddTable,
    canGenerateReport,
    getAccessLevel,
    getDaysRemaining
  };
};