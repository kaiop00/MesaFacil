import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import stripeService from '@/services/stripeService';
import { getStripeCustomerId, updateStripeData } from '@/services/firebase/restaurantService';

export const usePlanManagement = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const { idRestaurante, stripeCustomerId, plan: authPlan } = useAuth();

  // Check if restaurant has an active plan (from Stripe)
  const checkUserPlan = useCallback(async (restaurantId) => {
    if (!restaurantId) return null;
    
    try {
      // Get stripeCustomerId from auth context or fetch from restaurant document
      let customerId = stripeCustomerId;
      
      if (!customerId) {
        customerId = await getStripeCustomerId(restaurantId);
      }

      if (!customerId) {
        // No Stripe customer, return free plan
        const freePlan = { planId: 'free', status: 'active', expiresAt: null };
        setCurrentPlan(freePlan);
        setHasActivePlan(true);
        return freePlan;
      }

      // Fetch plan from Stripe
      const plan = await stripeService.getCurrentPlan(customerId);
      
      // Check if plan is active
      const isActive = plan.status === 'active' || plan.status === 'trialing';
      
      if (isActive) {
        setCurrentPlan(plan);
        setHasActivePlan(true);
        return plan;
      } else {
        // Plan expired or canceled, return free plan
        const freePlan = { planId: 'free', status: 'active', expiresAt: null };
        setCurrentPlan(freePlan);
        setHasActivePlan(true);
        return freePlan;
      }
    } catch (error) {
      console.error('Erro ao verificar plano do restaurante:', error);
      return null;
    }
  }, [stripeCustomerId]);

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
        // For free plan (no customerId), set free plan directly
        const freePlan = { 
          planId: 'free', 
          status: 'active', 
          expiresAt: null,
          stripeSubscriptionId: null,
          stripePriceId: null
        };
        setCurrentPlan(freePlan);
        setHasActivePlan(true);
        
        return freePlan;
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
    if (!currentPlan || currentPlan.planId === 'free' || !currentPlan.expiresAt) {
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
          // Use plan from AuthContext (already fetched from Stripe)
          if (authPlan) {
            setCurrentPlan(authPlan);
            setHasActivePlan(authPlan.status === 'active' || authPlan.status === 'trialing');
          } else {
            // Fallback: fetch directly
            await checkUserPlan(idRestaurante);
          }
        } catch (error) {
          console.error('Erro ao carregar plano do restaurante:', error);
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