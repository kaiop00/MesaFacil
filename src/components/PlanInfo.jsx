import { usePlan } from "@/contexts/PlanContext";
import { PLANS_DATA } from "@/features/auth/constants/plansData";

export default function PlanInfo({ showDetailed = false }) {
  const { currentPlan, planInfo, planLoading, getAccessLevel } = usePlan();

  if (planLoading) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-20"></div>;
  }

  if (!currentPlan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">Nenhum plano ativo encontrado.</p>
      </div>
    );
  }

  const planData = PLANS_DATA.find((p) => p.id === (planInfo?.id || currentPlan?.planId));
  const planLabel = planData?.name || planInfo?.name || currentPlan?.planId || 'Desconhecido';
  const isFreePlan = (planInfo?.id || currentPlan?.planId) === 'free';

  return (
    <div
      className={`
      bg-white rounded-lg
    `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`
            w-3 h-3 rounded-full
            ${isFreePlan ? "bg-gray-400" : "bg-green-500"}
          `}
          ></div>
          <div>
            <h3 className="font-semibold text-gray-800">
              Plano {planLabel}
            </h3>
          </div>
        </div>
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
              {currentPlan.features?.maxProducts === "unlimited"
                ? "Ilimitado"
                : `Até ${currentPlan.features?.maxProducts || 0}`}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Mesas:</span>
            <span className="font-medium">
              {currentPlan.features?.maxTables === "unlimited"
                ? "Ilimitado"
                : `Até ${currentPlan.features?.maxTables || 0}`}
            </span>
          </div>

          {isFreePlan && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => (window.location.href = "/selecionar-plano")}
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
