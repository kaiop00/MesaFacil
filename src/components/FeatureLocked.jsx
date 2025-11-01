/**
 * FeatureLocked Component
 * 
 * Displays a locked state UI for features that require a higher plan.
 * Shows a blur overlay with upgrade information.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Lock } from 'react-coolicons';
import { PLAN_NAMES } from '@/constants/planFeatures';

/**
 * FeatureLocked - Display locked feature UI
 * 
 * @param {Object} props
 * @param {string} props.featureName - Name of the locked feature
 * @param {string} props.requiredPlan - Plan required to unlock (planId)
 * @param {string} props.message - Custom message
 * @param {Function} props.onUpgradeClick - Callback when upgrade button clicked
 * @param {boolean} props.showPreview - Show blurred preview (default: true)
 */
const FeatureLocked = ({
  featureName,
  requiredPlan,
  message,
  onUpgradeClick,
  showPreview = true
}) => {
  const planName = PLAN_NAMES[requiredPlan] || 'Premium';

  return (
    <div className="relative">
      {/* Blurred preview content (optional) */}
      {showPreview && (
        <div className="blur-sm pointer-events-none select-none opacity-40">
          <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="h-24 bg-gray-300 rounded"></div>
                <div className="h-24 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lock overlay */}
      <div 
        className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center bg-white bg-opacity-95 rounded-lg border-2 border-dashed border-gray-300 p-8`}
      >
        <div className="text-center max-w-md">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-gray-600" />
          </div>

          {/* Feature name */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            🔒 {featureName}
          </h3>

          {/* Message */}
          <p className="text-gray-600 mb-4">
            {message || `Este recurso está disponível no plano ${planName}.`}
          </p>

          {/* Required plan badge */}
          <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            Disponível no Plano {planName}
          </div>

          {/* Upgrade button */}
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Desbloquear Recurso
            </button>
          )}

          {/* Additional info */}
          <p className="text-xs text-gray-500 mt-4">
            Faça upgrade para acessar este e outros recursos exclusivos
          </p>
        </div>
      </div>
    </div>
  );
};

FeatureLocked.propTypes = {
  featureName: PropTypes.string.isRequired,
  requiredPlan: PropTypes.string.isRequired,
  message: PropTypes.string,
  onUpgradeClick: PropTypes.func,
  showPreview: PropTypes.bool
};

export default FeatureLocked;
