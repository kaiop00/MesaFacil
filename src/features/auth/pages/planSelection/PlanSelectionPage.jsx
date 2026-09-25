import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanManagement } from '@/hooks/usePlanManagement';
import PlanCard from '../../components/PlanCard';
import { PLANS_DATA } from '../../constants/plansData';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import stripeService, { STRIPE_TEMPORARILY_DISABLED } from '@/services/stripeService';
import { hasUserUsedFreeTrial, claimUserFreeTrial } from '@/services/firebase/authService';
import mesafacil from '@/assets/mesafacil.png';

export default function PlanSelectionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, idRestaurante, stripeCustomerId, loading } = useAuth();
  const { setUserPlan, currentPlan } = usePlanManagement();
  const { notify } = useToast();
  const resolvedRestaurantId = idRestaurante || location.state?.idRestaurante;
  const isBlockedFlow = new URLSearchParams(location.search).get("blocked") === "1" || Boolean(location.state?.accessBlocked);
  const isFreeTrialExpired = Boolean(currentPlan?.planId === 'free' && currentPlan?.isTrialExpired);
  const hasConsumedFreeTrial = hasUsedFreeTrial || Boolean(currentPlan?.isTrialExpired);
  const grantedRef = useRef(false);

  useEffect(() => {
    const loadUserTrialUsage = async () => {
      if (!user?.uid) {
        setHasUsedFreeTrial(false);
        return;
      }

      try {
        const used = await hasUserUsedFreeTrial(user.uid);
        setHasUsedFreeTrial(used);
      } catch (error) {
        console.error('Erro ao verificar uso do teste grátis por usuário:', error);
        setHasUsedFreeTrial(false);
      }
    };

    loadUserTrialUsage();
  }, [user?.uid]);

  // Check if user has an existing subscription in Stripe
  useEffect(() => {
    const checkExistingSubscription = async () => {
      // TEMPORARY: If Stripe is disabled, skip subscription check and redirect to home
      if (STRIPE_TEMPORARILY_DISABLED) {
        if (resolvedRestaurantId) {
          // Guard to avoid repeated grants/navigations when component re-renders
          if (!grantedRef.current) {
            grantedRef.current = true;
            // Grant premium plan and redirect
            try {
              await setUserPlan(resolvedRestaurantId, null, null);
            } catch (error) {
              console.error('Error setting user plan:', error);
            }
          }
          setIsCheckingSubscription(false);
          navigate('/home', { replace: true });
        } else {
          setIsCheckingSubscription(false);
        }
        return;
      }
      
      if (!stripeCustomerId) {
        // No Stripe customer, show plan selection
        setIsCheckingSubscription(false);
        return;
      }

      try {
        // Fetch subscription from Stripe
        const subscriptionData = await stripeService.getCustomerSubscription(stripeCustomerId);
        
        // If subscription exists (active or inactive), restore access instead of
        // auto-opening the billing portal. Billing management remains available
        // from explicit user actions elsewhere in the app.
        if (subscriptionData.subscription) {
          const status = subscriptionData.subscription.status;
          const canRestoreAccess = status === 'active' || status === 'trialing';

          if (canRestoreAccess && !isBlockedFlow) {
            try {
              if (resolvedRestaurantId) {
                await setUserPlan(
                  resolvedRestaurantId,
                  stripeCustomerId,
                  subscriptionData.subscription.id
                );
              }
            } catch (err) {
              console.error('Erro ao restaurar o plano da assinatura existente:', err);
            }

            notify('Assinatura reconhecida. Acesso liberado automaticamente.', 'success');
            navigate('/home', { replace: true });
            return;
          }
        }
        
        // No subscription found, show plan selection
        setIsCheckingSubscription(false);
      } catch (error) {
        console.error('Error checking existing subscription:', error);
        // On error, show plan selection anyway
        setIsCheckingSubscription(false);
      }
    };

    checkExistingSubscription();
  }, [stripeCustomerId, notify, resolvedRestaurantId, setUserPlan, navigate, isBlockedFlow]);

  const handlePlanSelect = (plan) => {
    if (plan.id === 'free' && (isFreeTrialExpired || hasConsumedFreeTrial)) {
      notify('Teste grátis já utilizado. Escolha um plano pago para continuar.', 'warning');
      return;
    }

    setSelectedPlan(plan);
  };

  const handleContinue = async () => {
    if (!selectedPlan || !user) {
      notify('Erro: dados de autenticação incompletos. Por favor, faça login novamente.', 'error');
      return;
    }
    
    if (!resolvedRestaurantId) {
      notify('Carregando dados do restaurante... Tente novamente em alguns segundos.', 'warning');
      return;
    }

    setIsProcessing(true);
    
    try {
      if (STRIPE_TEMPORARILY_DISABLED) {
        // When Stripe is disabled, grant premium access regardless of selected plan
        notify('⚠️ Sistema de pagamento temporariamente desativado. Acesso premium concedido!', 'info');
        // Grant premium plan directly
        await setUserPlan(resolvedRestaurantId, null, null);
        navigate('/home', { replace: true });
        return;
      }
      
      if (selectedPlan.id === 'free') {
        if (isFreeTrialExpired || hasConsumedFreeTrial) {
          notify('Teste grátis já utilizado. Escolha um plano pago.', 'warning');
          setIsProcessing(false);
          return;
        }

        await setUserPlan(resolvedRestaurantId, null, null);

        const trialClaimed = await claimUserFreeTrial(user.uid);
        if (!trialClaimed) {
          notify('Teste grátis já utilizado nesta conta. Escolha um plano pago.', 'warning');
          setIsProcessing(false);
          return;
        }

        setHasUsedFreeTrial(true);
        notify('Plano gratuito ativado com sucesso!', 'success');
        navigate('/home', { replace: true });
      } else {
        // Para planos pagos, redireciona para Stripe Checkout
        if (selectedPlan.stripePriceId) {
          await stripeService.redirectToCheckout(
            selectedPlan.stripePriceId,
            user.email,
            {
              idRestaurante: resolvedRestaurantId,
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              source: isBlockedFlow ? 'blocked_access' : 'plan_selection'
            }
          );
        } else {
          notify('Plano não disponível para pagamento no momento.', 'error');
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Erro ao processar seleção do plano:', error);
      notify('Erro ao processar o plano. Tente novamente.', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Show loading while auth context is loading or checking subscription */}
      {(loading || isCheckingSubscription) ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">
              {loading ? 'Carregando dados do usuário...' : 'Verificando sua assinatura...'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header com slogan */}
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <img src={mesafacil} alt="MesaFácil Logo" className="h-12 mx-auto mb-4" />
              </div>
            </div>
          </div>

      {/* Corpo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {STRIPE_TEMPORARILY_DISABLED && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 text-lg mb-2">
                  ⚠️ Sistema de Pagamento Temporariamente Desativado
                </h3>
                <p className="text-yellow-800 mb-2">
                  Nossa conta do Stripe está temporariamente desativada para manutenção. Durante este período:
                </p>
                <ul className="list-disc list-inside text-yellow-800 space-y-1 ml-4">
                  <li>Todas as funcionalidades premium estão liberadas gratuitamente</li>
                  <li>Não é necessário realizar pagamento</li>
                  <li>Você terá acesso completo ao sistema</li>
                </ul>
                <p className="text-yellow-700 text-sm mt-3 font-medium">
                  O sistema de cobrança será reativado em breve. Aproveite o acesso completo!
                </p>
              </div>
            </div>
          </div>
        )}

        {isBlockedFlow && !STRIPE_TEMPORARILY_DISABLED && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 5c-.77-1.33-2.7-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-lg">Seu acesso ao MesaFácil está temporariamente bloqueado</h3>
                <p className="text-red-800 mt-1">A cobrança da assinatura não foi regularizada dentro do período de tolerância. Escolha um plano abaixo para realizar o pagamento e restaurar o acesso automaticamente.</p>
              </div>
            </div>
          </div>
        )}

        {!STRIPE_TEMPORARILY_DISABLED && isFreeTrialExpired && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-lg mb-2">
                  Seu período de Teste Grátis terminou
                </h3>
                <p className="text-red-800">
                  Para continuar usando o MesaFácil, escolha um dos planos pagos abaixo. O plano Teste Grátis foi desativado para esta conta.
                </p>
              </div>
            </div>
          </div>
        )}

        {!STRIPE_TEMPORARILY_DISABLED && !isFreeTrialExpired && hasConsumedFreeTrial && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-lg mb-2">
                  Teste grátis já utilizado
                </h3>
                <p className="text-amber-800">
                  Esta conta já utilizou o período de 30 dias. Para continuar, escolha um plano pago.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Título da seção */}
        <div className="text-center mb-12">{/* Alert if no restaurant ID */}
          {!resolvedRestaurantId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-8">
              <p className="text-red-800">
                <span className="font-semibold">⚠️ Erro ao carregar dados do restaurante</span>
                <br />
                Por favor, faça login novamente ou entre em contato com o suporte.
              </p>
            </div>
          )}
          
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto mb-8">
              <p className="text-blue-800">
                <span className="font-semibold">Bem-vindo, {user.displayName || user.email}!</span>
                <br />
                Selecione o plano que melhor atende às suas necessidades.
              </p>
            </div>
          )}
        </div>

        {/* Grid de planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {PLANS_DATA.map((plan) => {
            const isFreePlanBlocked = !STRIPE_TEMPORARILY_DISABLED && (isFreeTrialExpired || hasConsumedFreeTrial) && plan.id === 'free';

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan?.id === plan.id}
                onSelect={() => handlePlanSelect(plan)}
                isPopular={plan.isPopular}
                isDisabled={isFreePlanBlocked}
                disabledReason={isFreePlanBlocked ? 'Teste grátis já utilizado para esta conta.' : null}
              />
            );
          })}
        </div>

        {/* Botão de continuar */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selectedPlan || isProcessing}
            className={`
              px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200
              ${selectedPlan && !isProcessing
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Processando...
              </div>
            ) : selectedPlan ? (
              `Continuar com ${selectedPlan.name}`
            ) : (
              'Selecione um plano para continuar'
            )}
          </button>

          {selectedPlan && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold text-gray-800 mb-2">Plano selecionado:</h3>
              <p className="text-gray-600">
                <span className="font-medium">{selectedPlan.name}</span> - {' '}
                {selectedPlan.price === 0 ? 'Gratuito' : `R$ ${selectedPlan.price.toFixed(2)}`}
                {selectedPlan.duration && ` (${selectedPlan.duration})`}
              </p>
              {selectedPlan.discount && (
                <p className="text-green-600 font-medium text-sm mt-1">
                  ✨ {selectedPlan.discount}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mt-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Por que escolher o MesaFácil?
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Rápido e Eficiente</h4>
              <p className="text-gray-600 text-sm">
                Gestão de pedidos otimizada para aumentar a produtividade do seu restaurante.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Fácil de Usar</h4>
              <p className="text-gray-600 text-sm">
                Interface intuitiva que qualquer pessoa pode aprender rapidamente.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 110 19.5 9.75 9.75 0 010-19.5z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Suporte 24/7</h4>
              <p className="text-gray-600 text-sm">
                Nossa equipe está sempre disponível para ajudar você.
              </p>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}