import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'react-coolicons';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanManagement } from '@/hooks/usePlanManagement';
import { useToast } from '@/hooks/useToast';
import stripeService from '@/services/stripeService';
import LoadingSpinner from '@/components/LoadingSpinner';
import { PLANS_DATA } from '@/features/auth/constants/plansData';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setUserPlan } = usePlanManagement();
  const { notify } = useToast();
  
  const [verificationStatus, setVerificationStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [sessionData, setSessionData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        setVerificationStatus('loading');

        // Verify the checkout session
        const sessionInfo = await stripeService.verifyCheckoutSession(sessionId);
        setSessionData(sessionInfo);

        // Get plan data from metadata
        const planId = sessionInfo.metadata?.planId;
        if (!planId) {
          throw new Error('Plan ID não encontrado nos metadados da sessão');
        }

        const plan = PLANS_DATA.find(p => p.id === planId);
        if (!plan) {
          throw new Error('Plano não encontrado');
        }
        setPlanData(plan);

        // Check if payment was successful
        if (sessionInfo.payment_status === 'paid') {
          // Activate the plan
          await stripeService.activateUserPlan(user.uid, planId, {
            customerId: sessionInfo.customer,
            subscriptionId: sessionInfo.subscription,
            sessionId: sessionId
          });

          // Update local plan state
          await setUserPlan(user.uid, planId);

          setVerificationStatus('success');
          notify(`Plano ${plan.name} ativado com sucesso!`, 'success');
        } else {
          throw new Error('Pagamento não foi confirmado');
        }

      } catch (error) {
        console.error('Error verifying payment:', error);
        setError(error.message);
        setVerificationStatus('error');
        notify('Erro ao verificar o pagamento. Entre em contato com o suporte.', 'error');
      }
    };

    if (!sessionId) {
      setVerificationStatus('error');
      setError('Session ID não encontrado na URL');
      return;
    }

    if (!user) {
      setVerificationStatus('error');
      setError('Usuário não autenticado');
      return;
    }

    verifyPayment();
  }, [sessionId, user, notify, setUserPlan]);

  const manualVerifyPayment = async () => {
    try {
      setVerificationStatus('loading');

      // Verify the checkout session
      const sessionInfo = await stripeService.verifyCheckoutSession(sessionId);
      setSessionData(sessionInfo);

      // Get plan data from metadata
      const planId = sessionInfo.metadata?.planId;
      if (!planId) {
        throw new Error('Plan ID não encontrado nos metadados da sessão');
      }

      const plan = PLANS_DATA.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plano não encontrado');
      }
      setPlanData(plan);

      // Check if payment was successful
      if (sessionInfo.payment_status === 'paid') {
        // Activate the plan
        await stripeService.activateUserPlan(user.uid, planId, {
          customerId: sessionInfo.customer,
          subscriptionId: sessionInfo.subscription,
          sessionId: sessionId
        });

        // Update local plan state
        await setUserPlan(user.uid, planId);

        setVerificationStatus('success');
        notify(`Plano ${plan.name} ativado com sucesso!`, 'success');
      } else {
        throw new Error('Pagamento não foi confirmado');
      }

    } catch (error) {
      console.error('Error verifying payment:', error);
      setError(error.message);
      setVerificationStatus('error');
      notify('Erro ao verificar o pagamento. Entre em contato com o suporte.', 'error');
    }
  };

  const handleContinue = () => {
    navigate('/home', { replace: true });
  };

  const handleRetry = () => {
    navigate('/selecionar-plano', { replace: true });
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'loading':
        return <Clock size={64} className="text-blue-500" />;
      case 'success':
        return <CheckCircle size={64} className="text-green-500" />;
      case 'error':
        return <XCircle size={64} className="text-red-500" />;
      default:
        return <Clock size={64} className="text-blue-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (verificationStatus) {
      case 'loading':
        return 'Verificando pagamento...';
      case 'success':
        return 'Pagamento confirmado!';
      case 'error':
        return 'Erro na verificação';
      default:
        return 'Processando...';
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'loading':
        return 'Aguarde enquanto verificamos seu pagamento no Stripe...';
      case 'success':
        return `Seu plano ${planData?.name} foi ativado com sucesso. Agora você tem acesso a todas as funcionalidades!`;
      case 'error':
        return error || 'Ocorreu um erro ao verificar seu pagamento. Tente novamente ou entre em contato com o suporte.';
      default:
        return 'Processando sua solicitação...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            {verificationStatus === 'loading' ? (
              <LoadingSpinner size="lg" />
            ) : (
              getStatusIcon()
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {getStatusTitle()}
          </h1>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {getStatusMessage()}
          </p>

          {/* Session Details */}
          {verificationStatus === 'success' && sessionData && planData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Detalhes da Assinatura</h3>
              <div className="text-sm text-green-700 space-y-1">
                <div className="flex justify-between">
                  <span>Plano:</span>
                  <span className="font-medium">{planData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <span className="font-medium">R$ {planData.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duração:</span>
                  <span className="font-medium">{planData.duration}</span>
                </div>
                {sessionData.customer && (
                  <div className="flex justify-between">
                    <span>Cliente ID:</span>
                    <span className="font-medium text-xs">{sessionData.customer}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Details */}
          {verificationStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">O que aconteceu?</h3>
              <p className="text-sm text-red-700">
                {error || 'Não foi possível verificar o status do pagamento'}
              </p>
              {sessionId && (
                <p className="text-xs text-red-600 mt-2">
                  Session ID: {sessionId}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {verificationStatus === 'success' && (
              <button
                onClick={handleContinue}
                className="w-full bg-primary-dynamic hover:bg-primary-dynamic/90 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors duration-200"
              >
                Continuar para o Dashboard
                <ArrowRight size={16} />
              </button>
            )}

            {verificationStatus === 'error' && (
              <>
                <button
                  onClick={() => manualVerifyPayment()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={handleRetry}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Voltar para Seleção de Planos
                </button>
              </>
            )}

            {verificationStatus === 'loading' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Este processo pode levar alguns segundos...
                </p>
              </div>
            )}
          </div>

          {/* Support Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Problemas com seu pagamento?{' '}
              <button 
                onClick={() => navigate('/suporte')}
                className="text-primary-dynamic hover:underline"
              >
                Entre em contato com o suporte
              </button>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle size={16} className="text-green-500" />
            <span>Pagamento processado com segurança via Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;