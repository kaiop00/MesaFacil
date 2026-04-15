import { useState } from 'react';
import { Gift, Calendar, DownloadPackage, TrendingUp, Star, CreditCard01, Settings } from 'react-coolicons';
import BaseModalWithHeader from '@/components/BaseModalWithHeader';
import { usePlanManagement } from '@/hooks/usePlanManagement';
import { useAuth } from '@/contexts/AuthContext';
import { PLANS_DATA } from '@/features/auth/constants/plansData';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import stripeService from '@/services/stripeService';

const PlanManagementModal = ({ isOpen, onClose }) => {
  const { 
    currentPlan, 
    planLoading, 
    setUserPlan,
    getDaysRemaining, 
    getAccessLevel
  } = usePlanManagement();
  
  const { user, idRestaurante, stripeCustomerId } = useAuth();
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState(null);
  const { notify } = useToast();

  if (!isOpen) return null;

  const handlePlanChange = async (newPlanId) => {
    if (!newPlanId || changingPlan || !idRestaurante) return;

    const newPlanData = PLANS_DATA.find(p => p.id === newPlanId);
    
    // If it's a free plan, update directly
    if (newPlanId === 'free') {
      setChangingPlan(true);
      try {
        await setUserPlan(idRestaurante, null, null);
        notify(`Alterado para plano gratuito com sucesso!`, 'success');
        setSelectedNewPlan(null);
        onClose();
      } catch (error) {
        console.error('Erro ao alterar plano:', error);
        notify('Erro ao alterar o plano. Tente novamente.', 'error');
      } finally {
        setChangingPlan(false);
      }
      return;
    }

    // For paid plans, redirect to Stripe Checkout
    if (newPlanData?.stripePriceId) {
      setChangingPlan(true);
      try {
        await stripeService.redirectToCheckout(
          newPlanData.stripePriceId,
          user.email,
          {
            idRestaurante: idRestaurante,
            planId: newPlanId,
            planName: newPlanData.name
          }
        );
      } catch (error) {
        console.error('Erro ao redirecionar para pagamento:', error);
        notify('Erro ao processar o pagamento. Tente novamente.', 'error');
        setChangingPlan(false);
      }
    } else {
      notify('Plano não disponível para pagamento no momento.', 'error');
    }
  };

  const handleBillingPortal = async () => {
    if (!stripeCustomerId) {
      notify('Nenhuma informação de faturamento encontrada.', 'warning');
      return;
    }

    try {
      await stripeService.redirectToBillingPortal(stripeCustomerId);
    } catch (error) {
      console.error('Erro ao acessar portal de faturamento:', error);
      notify('Erro ao acessar o portal de faturamento. Tente novamente.', 'error');
    }
  };

  const currentPlanData = PLANS_DATA.find(p => p.id === currentPlan?.planId);
  const daysRemaining = getDaysRemaining();

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'free': return <DownloadPackage size={20} className="text-gray-600" />;
      case 'monthly': return <Star size={20} className="text-blue-600" />;
      case 'bimonthly': return <TrendingUp size={20} className="text-green-600" />;
      case 'semiannual': return <Gift size={20} className="text-yellow-600" />;
      default: return <DownloadPackage size={20} className="text-gray-600" />;
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case 'free': return 'border-gray-200 bg-gray-50';
      case 'monthly': return 'border-blue-200 bg-blue-50';
      case 'bimonthly': return 'border-green-200 bg-green-50';
      case 'semiannual': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar Plano"
      icon={Gift}
      maxWidth="4xl"
    >
      <div className="p-6 space-y-6">
        {planLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Plano Atual */}
            <div className="bg-white border-2 border-primary-dynamic rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                {getPlanIcon(currentPlan?.planId)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Plano Atual: {currentPlanData?.name || 'Personalizado'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentPlan?.planId === 'free' 
                      ? 'Gratuito' 
                      : currentPlanData ? `R$ ${currentPlanData.price.toFixed(2)}` : 'Personalizado'
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      currentPlan?.planId === 'free' ? 'bg-gray-400' : 
                      daysRemaining && daysRemaining > 7 ? 'bg-green-500' :
                      daysRemaining && daysRemaining > 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">
                      {currentPlan?.planId === 'free' ? 'Gratuito - Ativo' :
                       daysRemaining !== null ? `${daysRemaining} dias restantes` : 'Ativo'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Nível de Acesso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-dynamic h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getAccessLevel()}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {getAccessLevel()}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Limites do Plano */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {currentPlan?.features?.maxProducts === 'unlimited' ? '∞' : currentPlan?.features?.maxProducts || 0}
                  </div>
                  <div className="text-xs text-blue-600">Produtos</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    {currentPlan?.features?.maxTables === 'unlimited' ? '∞' : currentPlan?.features?.maxTables || 0}
                  </div>
                  <div className="text-xs text-green-600">Mesas</div>
                </div>
              </div>

              {/* Billing Portal Button */}
              {currentPlan?.planId !== 'free' && (
                <div className="flex justify-center">
                  <button
                    onClick={handleBillingPortal}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    <Settings size={16} />
                    Gerenciar Assinatura
                  </button>
                </div>
              )}
            </div>

            {/* Planos Disponíveis */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Planos Disponíveis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PLANS_DATA.map((plan) => (
                  <div
                    key={plan.id}
                    className={`
                      border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                      ${plan.id === currentPlan?.planId 
                        ? 'border-primary-dynamic bg-primary-dynamic/10' 
                        : 'border-gray-200 hover:border-primary-dynamic/50'
                      }
                      ${getPlanColor(plan.id)}
                    `}
                    onClick={() => {
                      if (plan.id !== currentPlan?.planId) {
                        setSelectedNewPlan(plan);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getPlanIcon(plan.id)}
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {plan.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {plan.price === 0 ? 'Gratuito' : `R$ ${plan.price.toFixed(2)}`}
                        </p>
                      </div>
                      {plan.id === currentPlan?.planId && (
                        <div className="ml-auto">
                          <span className="bg-primary-dynamic text-white text-xs px-2 py-1 rounded-full">
                            Atual
                          </span>
                        </div>
                      )}
                    </div>

                    {plan.discount && (
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mb-2">
                        {plan.discount}
                      </div>
                    )}

                    <div className="space-y-1">
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                          <div className={`w-2 h-2 rounded-full ${
                            feature.included ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          {feature.text}
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{plan.features.length - 3} funcionalidades
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmação de Mudança de Plano */}
            {selectedNewPlan && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  {selectedNewPlan.id === 'free' ? 'Confirmar Mudança de Plano' : 'Confirmar Assinatura'}
                </h4>
                <p className="text-sm text-yellow-700 mb-4">
                  {selectedNewPlan.id === 'free' ? (
                    <>
                      Deseja alterar para o plano <strong>{selectedNewPlan.name}</strong>?
                      {currentPlan?.planId !== 'free' && (
                        <span className="block mt-1 text-red-600">
                          ⚠️ Ao downgrade para o plano gratuito, algumas funcionalidades serão limitadas.
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Você será redirecionado para o checkout do Stripe para assinar o plano <strong>{selectedNewPlan.name}</strong>.
                      <span className="block mt-1 text-blue-600">
                        💳 Valor: R$ {selectedNewPlan.price.toFixed(2)} - Pagamento seguro via Stripe
                      </span>
                    </>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePlanChange(selectedNewPlan.id)}
                    disabled={changingPlan}
                    className="bg-primary-dynamic hover:bg-primary-dynamic/90 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {changingPlan && <LoadingSpinner size="sm" />}
                    {selectedNewPlan.id === 'free' ? (
                      'Confirmar'
                    ) : (
                      <>
                        <CreditCard01 size={16} />
                        Pagar com Stripe
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedNewPlan(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseModalWithHeader>
  );
};

export default PlanManagementModal;