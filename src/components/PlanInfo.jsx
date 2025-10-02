import { usePlanManagement } from '@/hooks/usePlanManagement';
import { PLANS_DATA } from '@/features/auth/constants/plansData';

export default function PlanInfo({ showDetailed = false }) {
  const { 
    currentPlan, 
    planLoading, 
    getDaysRemaining, 
    getAccessLevel
  } = usePlanManagement();

  if (planLoading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">
          Nenhum plano ativo encontrado.
        </p>
      </div>
    );
  }

  const planData = PLANS_DATA.find(p => p.id === currentPlan.planId);
  const daysRemaining = getDaysRemaining();

  return (
    <div className={`
      bg-white rounded-lg border shadow-sm p-4 
      ${currentPlan.planId === 'free' ? 'border-gray-200' : 'border-orange-200'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-3 h-3 rounded-full
            ${currentPlan.planId === 'free' ? 'bg-gray-400' : 'bg-green-500'}
          `}></div>
          <div>
            <h3 className="font-semibold text-gray-800">
              Plano {planData?.name || currentPlan.planId}
            </h3>
            <p className="text-xs text-gray-500">
              {currentPlan.planId === 'free' ? 'Gratuito' : 
               planData ? `R$ ${planData.price.toFixed(2)}` : 'Personalizado'}
            </p>
          </div>
        </div>

        {daysRemaining !== null && (
          <div className={`
            text-xs px-2 py-1 rounded-full font-medium
            ${daysRemaining > 7 
              ? 'bg-green-100 text-green-700' 
              : daysRemaining > 3 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-red-100 text-red-700'
            }
          `}>
            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Expirado'}
          </div>
        )}
      </div>

      {showDetailed && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Nível de acesso:</span>
            <span className="font-medium">{getAccessLevel()}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Produtos:</span>
            <span className="font-medium">
              {currentPlan.features?.maxProducts === 'unlimited' 
                ? 'Ilimitado' 
                : `Até ${currentPlan.features?.maxProducts || 0}`}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Mesas:</span>
            <span className="font-medium">
              {currentPlan.features?.maxTables === 'unlimited' 
                ? 'Ilimitado' 
                : `Até ${currentPlan.features?.maxTables || 0}`}
            </span>
          </div>

          {currentPlan.planId === 'free' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => window.location.href = '/selecionar-plano'}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs py-2 px-3 rounded font-medium transition-colors"
              >
                Fazer Upgrade
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}