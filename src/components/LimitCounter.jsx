/**
 * LimitCounter Component
 * 
 * Displays resource usage counter with progress bar and upgrade prompt.
 * Used for products, tables, and other limited resources.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { usePlan } from '@/contexts/PlanContext';
import UpgradePrompt from './UpgradePrompt';
import { FEATURE_FLAGS } from '@/constants/planFeatures';

/**
 * LimitCounter - Show usage stats with progress bar
 * 
 * @param {Object} props
 * @param {string} props.limitType - Type of limit (maxProducts, maxTables, maxEmployees)
 * @param {number} props.currentCount - Current usage count
 * @param {string} props.label - Display label (e.g., "Produtos")
 * @param {string} props.featureFlag - Feature flag for upgrade prompt (optional)
 * @param {boolean} props.showUpgradeLink - Show upgrade link when near limit
 */
const LimitCounter = ({
  limitType,
  currentCount,
  label,
  featureFlag,
  showUpgradeLink = true
}) => {
  const { getUsageStats, currentPlan } = usePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const stats = getUsageStats(limitType, currentCount);

  // Don't render for paid plans (only show for free plan)
  if (currentPlan?.planId !== 'free') {
    return null;
  }

  console.log(stats);

  // Determine color based on usage percentage
  const getProgressColor = () => {
    if (stats.isUnlimited) return 'bg-green-500';
    if (stats.percentage >= 100) return 'bg-red-500';
    if (stats.percentage >= 80) return 'bg-orange-500';
    if (stats.percentage >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTextColor = () => {
    if (stats.isUnlimited) return 'text-green-700';
    if (stats.percentage >= 100) return 'text-red-700';
    if (stats.percentage >= 80) return 'text-orange-700';
    return 'text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${getTextColor()}`}>
            {label}:
          </span>
          <span className={`text-lg font-bold ${getTextColor()}`}>
            {stats.current}
            {stats.isUnlimited ? (
              <span className="text-sm font-normal text-green-600 ml-2">
                (Ilimitado ✨)
              </span>
            ) : (
              <span className="text-sm font-normal text-gray-600">
                /{stats.limit}
              </span>
            )}
          </span>
        </div>

        {/* Show upgrade link when approaching limit */}
        {!stats.isUnlimited && stats.percentage >= 60 && showUpgradeLink && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Upgrade ↗
          </button>
        )}
      </div>

      {/* Progress bar - only show if not unlimited */}
      {!stats.isUnlimited && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`${getProgressColor()} h-2.5 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(100, stats.percentage)}%` }}
            />
          </div>
          
          {/* Warning message when near/at limit */}
          {stats.percentage >= 80 && (
            <p className="text-xs text-orange-600 font-medium">
              {stats.percentage >= 100 
                ? `⚠️ Limite atingido! ${stats.canAdd ? '' : 'Faça upgrade para adicionar mais.'}`
                : `⚠️ Você está usando ${stats.percentage}% do limite.`
              }
            </p>
          )}
        </div>
      )}

      {/* Upgrade Modal */}
      {featureFlag && (
        <UpgradePrompt
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          featureFlag={featureFlag}
          requiredPlan="monthly"
        />
      )}
    </div>
  );
};

LimitCounter.propTypes = {
  limitType: PropTypes.oneOf(['maxProducts', 'maxTables', 'maxEmployees']).isRequired,
  currentCount: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  featureFlag: PropTypes.string,
  showUpgradeLink: PropTypes.bool
};

/**
 * CompactLimitCounter - Minimal inline version
 */
export const CompactLimitCounter = ({ limitType, currentCount, label }) => {
  const { getUsageStats, currentPlan } = usePlan();
  const stats = getUsageStats(limitType, currentCount);

  // Don't render for paid plans (only show for free plan)
  if (currentPlan?.planId !== 'free') {
    return null;
  }

  return (
    <span className="text-sm text-gray-600">
      {label}: <span className="font-semibold">{stats.current}</span>
      {stats.isUnlimited ? (
        <span className="text-green-600 ml-1">✨</span>
      ) : (
        <span>/{stats.limit}</span>
      )}
      {!stats.isUnlimited && stats.percentage >= 80 && (
        <span className="text-orange-600 ml-1">⚠️</span>
      )}
    </span>
  );
};

CompactLimitCounter.propTypes = {
  limitType: PropTypes.oneOf(['maxProducts', 'maxTables', 'maxEmployees']).isRequired,
  currentCount: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired
};

export default LimitCounter;
