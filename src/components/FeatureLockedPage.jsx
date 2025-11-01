import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'react-coolicons';
import { PLAN_NAMES } from '@/constants/planFeatures';
import { usePlan } from '@/contexts/PlanContext';

/**
 * FeatureLockedPage Component
 * 
 * Full-page locked state for features that require plan upgrade.
 * Used when user attempts to access a restricted route.
 * 
 * @param {Object} props
 * @param {string} props.featureName - Display name of the locked feature
 * @param {string} props.requiredPlan - Minimum plan required (e.g., 'bimonthly')
 * @param {string} props.description - Description of what this feature offers
 * @param {Array<string>} props.benefits - List of benefits user gets with this feature
 */
const FeatureLockedPage = ({ 
  featureName = 'Este Recurso',
  requiredPlan = 'bimonthly',
  description = 'Esta funcionalidade está disponível em planos superiores.',
  benefits = []
}) => {
  const navigate = useNavigate();
  const { currentPlan } = usePlan();

  const handleUpgrade = () => {
    navigate('/selecionar-plano');
  };

  const handleGoBack = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <Lock className="w-10 h-10 text-orange-500" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {featureName} Bloqueado 🔒
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-6">
            {description}
          </p>

          {/* Required plan badge */}
          <div className="inline-block bg-gradient-to-r from-orange-100 to-yellow-100 rounded-full px-6 py-3 mb-8">
            <p className="text-sm font-medium text-gray-700">
              Disponível no plano{' '}
              <span className="font-bold text-orange-600">
                {PLAN_NAMES[requiredPlan]}
              </span>
              {' '}e superiores
            </p>
          </div>

          {/* Benefits list */}
          {benefits.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">
                O que você ganha com o upgrade:
              </h3>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current plan info */}
          <div className="mb-8">
            <p className="text-sm text-gray-500">
              Seu plano atual:{' '}
              <span className="font-semibold text-gray-700">
                {PLAN_NAMES[currentPlan]}
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleUpgrade}
              className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg"
            >
              Ver Planos Disponíveis
            </button>
            <button
              onClick={handleGoBack}
              className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Precisa de ajuda? Entre em contato com nosso suporte
        </p>
      </div>
    </div>
  );
};

export default FeatureLockedPage;
