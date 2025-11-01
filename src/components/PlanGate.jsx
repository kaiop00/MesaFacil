/**
 * PlanGate Component
 * 
 * Component to wrap features that require specific plan access.
 * Shows locked UI or upgrade prompt when user doesn't have required plan.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { usePlan } from '@/contexts/PlanContext';
import FeatureLocked from './FeatureLocked';
import UpgradePrompt from './UpgradePrompt';

/**
 * PlanGate - Conditionally render content based on plan permissions
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if user has access
 * @param {string} props.requiredFeature - Feature flag required to access content
 * @param {React.ReactNode} props.fallback - Optional custom fallback UI
 * @param {boolean} props.showUpgradePrompt - Whether to show upgrade modal (default: false)
 * @param {boolean} props.showLockedOverlay - Whether to show locked overlay (default: true)
 * @param {string} props.lockedMessage - Custom message for locked state
 */
const PlanGate = ({
  children,
  requiredFeature,
  fallback,
  showUpgradePrompt = false,
  showLockedOverlay = true,
  lockedMessage
}) => {
  const { hasFeatureAccess, getRequiredPlan, getFeatureName, planLoading } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Show loading state
  if (planLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Check if user has access to the feature
  const hasAccess = hasFeatureAccess(requiredFeature);

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle upgrade modal
  const handleUpgradeClick = () => {
    setIsUpgradeModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUpgradeModalOpen(false);
  };

  // Get required plan for this feature
  const requiredPlan = getRequiredPlan(requiredFeature);
  const featureName = getFeatureName(requiredFeature);

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show locked overlay if enabled
  if (showLockedOverlay) {
    return (
      <>
        <FeatureLocked
          featureName={featureName}
          requiredPlan={requiredPlan}
          message={lockedMessage}
          onUpgradeClick={handleUpgradeClick}
        />
        {showUpgradePrompt && (
          <UpgradePrompt
            isOpen={isUpgradeModalOpen}
            onClose={handleCloseModal}
            featureFlag={requiredFeature}
            requiredPlan={requiredPlan}
          />
        )}
      </>
    );
  }

  // Default: don't render anything
  return null;
};

PlanGate.propTypes = {
  children: PropTypes.node.isRequired,
  requiredFeature: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  showUpgradePrompt: PropTypes.bool,
  showLockedOverlay: PropTypes.bool,
  lockedMessage: PropTypes.string
};

export default PlanGate;
