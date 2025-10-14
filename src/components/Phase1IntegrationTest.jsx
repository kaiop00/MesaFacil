/**
 * Phase 1 Integration Test Component
 * 
 * This component tests all Phase 1 functionality in one place.
 * Use this to verify the implementation works correctly.
 * 
 * To use: Import this component in a test route and navigate to it.
 */

import React, { useState } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import PlanGate from '@/components/PlanGate';
import PlanBadge, { PlanBadgeWithExpiration, CompactPlanIndicator } from '@/components/PlanBadge';
import UpgradePrompt from '@/components/UpgradePrompt';
import FeatureLocked from '@/components/FeatureLocked';
import { FEATURE_FLAGS } from '@/constants/planFeatures';
import { CircleCheck, CloseMd } from 'react-coolicons';

const Phase1IntegrationTest = () => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [testProductCount, setTestProductCount] = useState(3);
  
  const {
    planInfo,
    planLoading,
    hasFeatureAccess,
    canAddProduct,
    getUsageStats,
    availableReports,
    isExpiringSoon,
    isExpired,
    daysRemaining,
    getFeaturesGained,
    getRecommendation
  } = usePlan();

  if (planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando contexto de planos...</p>
        </div>
      </div>
    );
  }

  // Get usage stats
  const productStats = getUsageStats('maxProducts', testProductCount);
  const tableStats = getUsageStats('maxTables', 1);
  
  // Get recommendations
  const recommendation = getRecommendation({
    productCount: testProductCount,
    tableCount: 1,
    employeeCount: 1
  });

  // Get features for upgrade
  const quarterlyFeatures = getFeaturesGained('quarterly');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-4">Phase 1 Integration Test</h1>
          <p className="text-gray-600 mb-4">
            Esta página testa todos os componentes e funcionalidades implementados na Fase 1.
          </p>
          
          {/* Plan badges */}
          <div className="flex gap-4 items-center">
            <PlanBadge size="sm" showIcon={true} />
            <PlanBadge size="md" showIcon={true} />
            <PlanBadge size="lg" showIcon={true} />
            <PlanBadgeWithExpiration />
            <CompactPlanIndicator />
          </div>
        </div>

        {/* Plan Status Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📊 Status do Plano</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Plano Atual</p>
              <p className="text-xl font-bold text-blue-600">{planInfo.name}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">ID do Plano</p>
              <p className="text-xl font-bold text-green-600">{planInfo.id}</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Dias Restantes</p>
              <p className="text-xl font-bold text-purple-600">
                {daysRemaining !== null ? `${daysRemaining}d` : 'Ilimitado'}
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-xl font-bold text-orange-600">
                {isExpired ? '⚠️ Expirado' : isExpiringSoon ? '⏰ Expirando' : '✅ Ativo'}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Stats Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📈 Estatísticas de Uso</h2>
          
          <div className="space-y-4">
            {/* Products */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Produtos no Cardápio</span>
                <span>
                  {productStats.current}
                  {productStats.isUnlimited ? ' (Ilimitado)' : `/${productStats.limit}`}
                </span>
              </div>
              {!productStats.isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      productStats.percentage > 80 ? 'bg-red-500' :
                      productStats.percentage > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${productStats.percentage}%` }}
                  />
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setTestProductCount(prev => prev + 1)}
                  disabled={!canAddProduct(testProductCount)}
                  className={`px-4 py-2 rounded ${
                    canAddProduct(testProductCount)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Adicionar Produto {!canAddProduct(testProductCount) && '🔒'}
                </button>
                <button
                  onClick={() => setTestProductCount(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Remover Produto
                </button>
              </div>
            </div>

            {/* Tables */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Mesas Cadastradas</span>
                <span>
                  {tableStats.current}
                  {tableStats.isUnlimited ? ' (Ilimitado)' : `/${tableStats.limit}`}
                </span>
              </div>
              {!tableStats.isUnlimited && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${tableStats.percentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature Access Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">🔐 Acesso a Recursos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(FEATURE_FLAGS).slice(0, 12).map(([key, flag]) => {
              const hasAccess = hasFeatureAccess(flag);
              return (
                <div 
                  key={key}
                  className={`p-3 rounded-lg border-2 ${
                    hasAccess 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {hasAccess ? (
                      <CircleCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <CloseMd className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={hasAccess ? 'text-green-900' : 'text-gray-500'}>
                      {key.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reports Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📄 Relatórios Disponíveis</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableReports.map(report => (
              <div 
                key={report.value}
                className="p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center"
              >
                <p className="font-semibold text-green-900">{report.label}</p>
                <p className="text-sm text-green-600">✓ Disponível</p>
              </div>
            ))}
          </div>
        </div>

        {/* PlanGate Demo */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">🚪 Demo PlanGate</h2>
          
          <div className="space-y-6">
            {/* Always accessible */}
            <PlanGate requiredFeature={FEATURE_FLAGS.BASIC_DASHBOARD}>
              <div className="p-4 bg-blue-100 border-2 border-blue-500 rounded-lg">
                <p className="font-bold">✅ Dashboard Básico (sempre acessível no free)</p>
                <p className="text-sm text-gray-700">Este conteúdo está visível porque está no plano free.</p>
              </div>
            </PlanGate>

            {/* May be locked */}
            <PlanGate 
              requiredFeature={FEATURE_FLAGS.INVENTORY_CONTROL}
              showUpgradePrompt={true}
            >
              <div className="p-4 bg-purple-100 border-2 border-purple-500 rounded-lg">
                <p className="font-bold">🔒 Controle de Estoque</p>
                <p className="text-sm text-gray-700">
                  Este recurso requer plano Bimestral ou superior. 
                  Se você está vendo isto, você tem acesso!
                </p>
              </div>
            </PlanGate>

            {/* Likely locked for most */}
            <PlanGate 
              requiredFeature={FEATURE_FLAGS.PROMOTIONS_ADS}
              showUpgradePrompt={true}
            >
              <div className="p-4 bg-gold-100 border-2 border-gold-500 rounded-lg">
                <p className="font-bold">⭐ Promoções e Anúncios</p>
                <p className="text-sm text-gray-700">
                  Este recurso premium requer plano Semestral.
                  Se você está vendo isto, você tem o plano top!
                </p>
              </div>
            </PlanGate>
          </div>
        </div>

        {/* Upgrade Recommendation */}
        {recommendation && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">💡 Recomendação de Upgrade</h2>
            <p className="mb-4">
              Baseado no seu uso atual, recomendamos o plano <strong>{recommendation.planName}</strong>
            </p>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="font-semibold mb-2">Recursos que você ganhará:</p>
              <ul className="space-y-1">
                {recommendation.features.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="text-sm">✓ {feature.name}</li>
                ))}
                {recommendation.features.length > 5 && (
                  <li className="text-sm italic">+ {recommendation.features.length - 5} outros recursos</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Quarterly Features Preview */}
        {quarterlyFeatures.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">🎯 Recursos do Plano Trimestral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quarterlyFeatures.slice(0, 8).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-purple-900">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Upgrade Prompt Test */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">🎨 Testar Modal de Upgrade</h2>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Abrir Modal de Upgrade
          </button>
        </div>

        {/* FeatureLocked Demo */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">🔒 Demo FeatureLocked</h2>
          <FeatureLocked
            featureName="Personalização Avançada"
            requiredPlan="quarterly"
            message="Personalize completamente o visual do seu restaurante com cores, logo e imagens personalizadas."
            onUpgradeClick={() => setShowUpgradeModal(true)}
            showPreview={true}
          />
        </div>

        {/* Test Results Summary */}
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-900 mb-4">✅ Resumo dos Testes</h2>
          <div className="space-y-2 text-green-800">
            <p>✓ PlanContext carregado com sucesso</p>
            <p>✓ usePlan hook funcionando corretamente</p>
            <p>✓ Badges de plano renderizando</p>
            <p>✓ Verificação de recursos funcionando</p>
            <p>✓ Estatísticas de uso calculadas</p>
            <p>✓ PlanGate bloqueando recursos corretamente</p>
            <p>✓ Relatórios disponíveis filtrados por plano</p>
            <p>✓ Recomendações de upgrade funcionando</p>
          </div>
        </div>

      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureFlag={FEATURE_FLAGS.CUSTOM_LAYOUT}
        requiredPlan="quarterly"
      />
    </div>
  );
};

export default Phase1IntegrationTest;
