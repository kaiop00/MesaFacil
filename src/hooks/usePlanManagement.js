import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import stripeService from '@/services/stripeService';

export const usePlanManagement = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const { user, stripeCustomerId, plan: authPlan } = useAuth();

  // Check if user has an active plan (from Stripe)
  const checkUserPlan = useCallback(async (userId) => {
    if (!userId) return null;
    
    try {
      // Get stripeCustomerId from auth context or fetch from Firestore
      let customerId = stripeCustomerId;
      
      if (!customerId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          customerId = userDoc.data().stripeCustomerId;
        }
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
      console.error('Erro ao verificar plano do usuário:', error);
      return null;
    }
  }, [stripeCustomerId]);

  // Save Stripe customer ID to Firestore (only reference data)
  const setUserPlan = async (userId, customerId, subscriptionId = null) => {
    try {
      const updateData = {
        stripeCustomerId: customerId
      };

      if (subscriptionId) {
        updateData.stripeSubscriptionId = subscriptionId;
      }

      await setDoc(doc(db, 'users', userId), updateData, { merge: true });

      // Fetch updated plan from Stripe
      const plan = await stripeService.getCurrentPlan(customerId);
      setCurrentPlan(plan);
      setHasActivePlan(plan.status === 'active' || plan.status === 'trialing');
      
      return plan;
    } catch (error) {
      console.error('Erro ao salvar referência do Stripe:', error);
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
      if (user?.uid) {
        setPlanLoading(true);
        
        try {
          // Use plan from AuthContext (already fetched from Stripe)
          if (authPlan) {
            setCurrentPlan(authPlan);
            setHasActivePlan(authPlan.status === 'active' || authPlan.status === 'trialing');
          } else {
            // Fallback: fetch directly
            await checkUserPlan(user.uid);
          }
        } catch (error) {
          console.error('Erro ao carregar plano do usuário:', error);
        }
        
        setPlanLoading(false);
      }
    };

    loadUserPlan();
  }, [user?.uid, authPlan, checkUserPlan]);

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