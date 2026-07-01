import React from 'react';
import { usePlan } from '@/contexts/PlanContext';
import FeatureLockedPage from './FeatureLockedPage';

/**
 * RequireFeature Component
 * 
 * Protects routes by checking if user has required feature access.
 * Shows FeatureLockedPage if access is denied.
 * 
 * Usage in routes:
 * ```jsx
 * {
 *   path: "itens",
 *   element: (
 *     <RequireFeature 
 *       feature="inventory_control"
 *       featureName="Controle de Estoque"
 *       requiredPlan="bimonthly"
 *     >
 *       <ItemsPage />
 *     </RequireFeature>
 *   )
 * }
 * ```
 * 
 * @param {Object} props
 * @param {string} props.feature - Feature flag to check (from FEATURE_FLAGS)
 * @param {string} props.featureName - Display name for locked page
 * @param {string} props.requiredPlan - Minimum plan required
 * @param {string} props.description - Description for locked page
 * @param {Array<string>} props.benefits - Benefits list for locked page
 * @param {React.ReactNode} props.children - Component to render if access granted
 */
const RequireFeature = ({ 
  feature,
  featureName,
  requiredPlan,
  description,
  benefits,
  children 
}) => {
  const { hasFeatureAccess, isExpired, daysRemaining } = usePlan();

  // Show expiration message if plan is expired
  if (isExpired) {
    return (
      <FeatureLockedPage
        featureName={featureName || 'Recurso'}
        requiredPlan={requiredPlan}
        description={`Sua assinatura expirou. Renove para continuar usando ${featureName?.toLowerCase() || 'este recurso'}.`}
        benefits={benefits}
        isExpired={true}
      />
    );
  }

  // Check if user has access to the feature
  if (!hasFeatureAccess(feature)) {
    return (
      <FeatureLockedPage
        featureName={featureName}
        requiredPlan={requiredPlan}
        description={description}
        benefits={benefits}
      />
    );
  }

  // User has access, render the protected content
  return <>{children}</>;
};

export default RequireFeature;
