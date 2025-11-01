/**
 * PlanBadge Component
 * 
 * Display badge showing user's current subscription plan with color coding.
 * Used in headers, sidebars, and plan-related UI elements.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { usePlan } from '@/contexts/PlanContext';
import { PLAN_COLORS } from '@/constants/planFeatures';

/**
 * PlanBadge - Display current plan badge
 * 
 * @param {Object} props
 * @param {boolean} props.showDaysRemaining - Show days remaining for paid plans
 * @param {string} props.size - Size variant (sm, md, lg)
 * @param {boolean} props.showIcon - Show icon before plan name
 */
const PlanBadge = ({
  showDaysRemaining = false,
  size = 'md',
  showIcon = true
}) => {
  const { planInfo, daysRemaining, planLoading } = usePlan();

  if (planLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
    gold: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 border-amber-300'
  };

  const planColor = PLAN_COLORS[planInfo.id] || 'gray';
  const colorClass = colorClasses[planColor] || colorClasses.gray;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Plan icons
  const planIcons = {
    free: '🆓',
    monthly: '📅',
    bimonthly: '📊',
    quarterly: '📈',
    semiannual: '⭐'
  };

  const icon = planIcons[planInfo.id] || '📦';

  return (
    <div className={`inline-flex items-center gap-1.5 ${sizeClass} ${colorClass} border rounded-full font-semibold`}>
      {showIcon && <span>{icon}</span>}
      <span>{planInfo.name}</span>
      
      {/* Show days remaining for paid plans */}
      {showDaysRemaining && daysRemaining !== null && (
        <span className="text-xs opacity-75">
          ({daysRemaining}d)
        </span>
      )}
    </div>
  );
};

PlanBadge.propTypes = {
  showDaysRemaining: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showIcon: PropTypes.bool
};

/**
 * PlanBadgeWithExpiration - Badge that highlights expiring plans
 */
export const PlanBadgeWithExpiration = ({ size = 'md' }) => {
  const { planInfo, daysRemaining, isExpiringSoon, isExpired } = usePlan();

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'} bg-red-100 text-red-700 border border-red-300 rounded-full font-semibold`}>
        <span>⚠️</span>
        <span>Plano Expirado</span>
      </div>
    );
  }

  if (isExpiringSoon) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'} bg-orange-100 text-orange-700 border border-orange-300 rounded-full font-semibold animate-pulse`}>
        <span>⏰</span>
        <span>{planInfo.name}</span>
        <span className="text-xs">({daysRemaining}d restantes)</span>
      </div>
    );
  }

  return <PlanBadge size={size} showDaysRemaining={daysRemaining !== null && daysRemaining <= 30} />;
};

PlanBadgeWithExpiration.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
};

/**
 * CompactPlanIndicator - Minimal plan indicator for tight spaces
 */
export const CompactPlanIndicator = () => {
  const { planInfo } = usePlan();
  
  const colorDots = {
    free: 'bg-gray-400',
    monthly: 'bg-blue-500',
    bimonthly: 'bg-green-500',
    quarterly: 'bg-purple-500',
    semiannual: 'bg-gradient-to-r from-yellow-400 to-amber-500'
  };

  const dotColor = colorDots[planInfo.id] || colorDots.free;

  return (
    <div 
      className={`w-2 h-2 rounded-full ${dotColor}`}
      title={`Plano ${planInfo.name}`}
    />
  );
};

export default PlanBadge;
