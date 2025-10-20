import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanManagement } from '@/hooks/usePlanManagement';
import PlanCard from '../../components/PlanCard';
import { PLANS_DATA } from '../../constants/plansData';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import stripeService from '@/services/stripeService';
import mesafacil from '@/assets/mesafacil.png';

export default function PlanSelectionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const navigate = useNavigate();
  const { user, stripeCustomerId } = useAuth();
  const { setUserPlan } = usePlanManagement();
  const { notify } = useToast();

  // Check if user has an existing subscription in Stripe
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (!stripeCustomerId) {
        // No Stripe customer, show plan selection
        setIsCheckingSubscription(false);
        return;
      }

      try {
        // Fetch subscription from Stripe
        const subscriptionData = await stripeService.getCustomerSubscription(stripeCustomerId);
        
        // If subscription exists (active or inactive), redirect to Billing Portal
        if (subscriptionData.subscription) {
          notify('Você já possui uma assinatura. Redirecionando para o portal de gerenciamento...', 'info');
          
          // Redirect to Billing Portal after short delay
          setTimeout(async () => {
            await stripeService.redirectToBillingPortal(stripeCustomerId);
          }, 1500);
          
          return; // Don't set isCheckingSubscription to false, keep loading state
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
  }, [stripeCustomerId, notify]);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleContinue = async () => {
    if (!selectedPlan || !user) return;

    setIsProcessing(true);
    
    try {
      if (selectedPlan.id === 'free') {
        // Para plano gratuito, salva no Firestore e vai direto para o dashboard
        await setUserPlan(user.uid, 'free');
        notify('Plano gratuito ativado com sucesso!', 'success');
        navigate('/home', { replace: true });
      } else {
        // Para planos pagos, redireciona para Stripe Checkout
        if (selectedPlan.stripePriceId) {
          await stripeService.redirectToCheckout(
            selectedPlan.stripePriceId,
            user.email,
            {
              userId: user.uid,
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              source: 'plan_selection'
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
      {/* Show loading while checking for existing subscription */}
      {isCheckingSubscription ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Verificando sua assinatura...</p>
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
        {/* Título da seção */}
        <div className="text-center mb-12">
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
          {PLANS_DATA.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={() => handlePlanSelect(plan)}
              isPopular={plan.isPopular}
            />
          ))}
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