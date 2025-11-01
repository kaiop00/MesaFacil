/**
 * UpgradePrompt Component
 * 
 * Modal that displays plan upgrade information and encourages users to upgrade.
 * Shows feature comparison and direct link to plan selection.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { CircleCheck } from 'react-coolicons';
import BaseModalWithHeader from './BaseModalWithHeader';
import { usePlan } from '@/contexts/PlanContext';
import { PLAN_NAMES, PLAN_COLORS } from '@/constants/planFeatures';
import { PLANS_DATA } from '@/features/auth/constants/plansData';

/**
 * UpgradePrompt - Modal for encouraging plan upgrades
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback to close modal
 * @param {string} props.featureFlag - Feature flag that triggered the prompt
 * @param {string} props.requiredPlan - Minimum plan required for feature
 */
const UpgradePrompt = ({
  isOpen,
  onClose,
  featureFlag,
  requiredPlan
}) => {
  const navigate = useNavigate();
  const { planInfo, getFeaturesGained, getFeatureName } = usePlan();

  if (!isOpen) return null;

  const currentPlanName = planInfo.name;
  const requiredPlanName = PLAN_NAMES[requiredPlan] || 'Premium';
  const featureName = getFeatureName(featureFlag);
  
  // Get features that would be gained
  const featuresGained = getFeaturesGained(requiredPlan);
  
  // Get plan data
  const planData = PLANS_DATA.find(p => p.id === requiredPlan);

  const handleUpgrade = () => {
    onClose();
    // Navigate to plan selection page
    navigate('/auth/assinatura');
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Desbloqueie Recursos Premium"
    >
      <div className="p-6 space-y-6">
        {/* Feature highlight */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">✨</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {featureName}
              </h3>
              <p className="text-sm text-gray-600">
                Este recurso está disponível no plano <span className="font-semibold">{requiredPlanName}</span> e superiores.
              </p>
            </div>
          </div>
        </div>

        {/* Current vs Required plan */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Plano Atual</p>
            <p className={`text-lg font-bold text-${PLAN_COLORS[planInfo.id]}-600`}>
              {currentPlanName}
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <p className="text-xs text-gray-500 mb-1">Plano Necessário</p>
            <p className={`text-lg font-bold text-${PLAN_COLORS[requiredPlan]}-600`}>
              {requiredPlanName}
            </p>
          </div>
        </div>

        {/* Features you'll gain */}
        {featuresGained.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Recursos que você terá acesso:
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {featuresGained.slice(0, 8).map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CircleCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature.name}</span>
                </div>
              ))}
              {featuresGained.length > 8 && (
                <p className="text-xs text-gray-500 italic pl-7">
                  + {featuresGained.length - 8} outros recursos
                </p>
              )}
            </div>
          </div>
        )}

        {/* Plan pricing */}
        {planData && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Plano {planData.name}</p>
                <p className="text-2xl font-bold">
                  R$ {planData.price.toFixed(2)}
                </p>
                <p className="text-xs opacity-75">por {planData.duration}</p>
              </div>
              {planData.discount && (
                <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <p className="text-xs font-semibold">{planData.discount}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Agora Não
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
          >
            Ver Planos
          </button>
        </div>

        {/* Additional info */}
        <p className="text-xs text-center text-gray-500">
          Cancele quando quiser. Sem compromisso de longo prazo.
        </p>
      </div>
    </BaseModalWithHeader>
  );
};

UpgradePrompt.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  featureFlag: PropTypes.string,
  requiredPlan: PropTypes.string
};

export default UpgradePrompt;
