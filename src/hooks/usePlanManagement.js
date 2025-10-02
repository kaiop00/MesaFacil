import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_BENEFITS } from '@/features/auth/constants/plansData';

export const usePlanManagement = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const { user } = useAuth();

  // Verificar se o usuário tem um plano ativo
  const checkUserPlan = async (userId) => {
    if (!userId) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const plan = userData.plan;
        
        if (plan) {
          // Verificar se o plano ainda está válido
          const isValid = plan.planId === 'free' || (plan.expiresAt && new Date(plan.expiresAt.toDate()) > new Date());
          
          if (isValid) {
            setCurrentPlan(plan);
            setHasActivePlan(true);
            return plan;
          } else {
            // Plano expirado, definir como free
            await setUserPlan(userId, 'free');
            return { planId: 'free', activatedAt: serverTimestamp() };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao verificar plano do usuário:', error);
      return null;
    }
  };

  // Salvar plano do usuário no Firestore
  const setUserPlan = async (userId, planId, paymentInfo = null) => {
    try {
      const planData = {
        planId,
        activatedAt: serverTimestamp(),
        features: PLAN_BENEFITS[planId] || PLAN_BENEFITS.free
      };

      // Adicionar data de expiração para planos pagos
      if (planId !== 'free') {
        const expirationDate = new Date();
        
        switch (planId) {
          case 'monthly':
            expirationDate.setDate(expirationDate.getDate() + 30);
            break;
          case 'bimonthly':
            expirationDate.setDate(expirationDate.getDate() + 60);
            break;
          case 'quarterly':
            expirationDate.setDate(expirationDate.getDate() + 90);
            break;
          case 'semiannual':
            expirationDate.setDate(expirationDate.getDate() + 180);
            break;
          default:
            expirationDate.setDate(expirationDate.getDate() + 30);
        }
        
        planData.expiresAt = expirationDate;
        
        if (paymentInfo) {
          planData.paymentInfo = paymentInfo;
        }
      }

      await setDoc(doc(db, 'users', userId), {
        plan: planData
      }, { merge: true });

      setCurrentPlan(planData);
      setHasActivePlan(true);
      
      return planData;
    } catch (error) {
      console.error('Erro ao salvar plano do usuário:', error);
      throw error;
    }
  };

  // Verificar se o usuário pode acessar uma funcionalidade
  const canAccessFeature = (featureId) => {
    if (!currentPlan) return false;
    
    const features = currentPlan.features?.features || [];
    return features.includes(featureId);
  };

  // Verificar se o usuário atingiu limite de produtos
  const canAddProduct = (currentProductCount) => {
    if (!currentPlan) return false;
    
    const maxProducts = currentPlan.features?.maxProducts;
    if (maxProducts === 'unlimited') return true;
    
    return currentProductCount < maxProducts;
  };

  // Verificar se o usuário atingiu limite de mesas
  const canAddTable = (currentTableCount) => {
    if (!currentPlan) return false;
    
    const maxTables = currentPlan.features?.maxTables;
    if (maxTables === 'unlimited') return true;
    
    return currentTableCount < maxTables;
  };

  // Verificar se o usuário pode gerar relatórios específicos
  const canGenerateReport = (reportType) => {
    if (!currentPlan) return false;
    
    const availableReports = currentPlan.features?.reports || [];
    return availableReports.includes(reportType);
  };

  // Obter porcentagem de acesso às funcionalidades
  const getAccessLevel = () => {
    return currentPlan?.features?.accessLevel || 0;
  };

  // Obter dias restantes do plano (para planos pagos)
  const getDaysRemaining = () => {
    if (!currentPlan || currentPlan.planId === 'free' || !currentPlan.expiresAt) {
      return null;
    }
    
    const expirationDate = new Date(currentPlan.expiresAt.toDate());
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
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const plan = userData.plan;
            
            if (plan) {
              // Verificar se o plano ainda está válido
              const isValid = plan.planId === 'free' || (plan.expiresAt && new Date(plan.expiresAt.toDate()) > new Date());
              
              if (isValid) {
                setCurrentPlan(plan);
                setHasActivePlan(true);
              } else {
                // Plano expirado, definir como free automaticamente
                const freePlan = {
                  planId: 'free',
                  activatedAt: serverTimestamp(),
                  features: PLAN_BENEFITS.free
                };
                
                await setDoc(doc(db, 'users', user.uid), {
                  plan: freePlan
                }, { merge: true });
                
                setCurrentPlan(freePlan);
                setHasActivePlan(true);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao verificar plano do usuário:', error);
        }
        
        setPlanLoading(false);
      }
    };

    loadUserPlan();
  }, [user?.uid]);

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