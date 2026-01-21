import { useTranslation } from "react-i18next";
import { usePlan } from "@/contexts/PlanContext";
import { getPermissions } from "../../../constants/permissions";
import { filterPermissionsByPlan, requiresPaidPlan } from "../../../utils/permissionRestrictions";
import { Lock } from "react-coolicons";

const UserPermissions = ({ 
  permissions = {}, 
  setPermissions, 
  selectAll, 
  setSelectAll,
  readOnly = false 
}) => {
  const { t } = useTranslation();
  const { planId } = usePlan();
  const ALL_PERMISSIONS = getPermissions(t);
  const PERMISSIONS = filterPermissionsByPlan(ALL_PERMISSIONS, planId);
  
  const ALL_PERMISSION_IDS = Object.values(PERMISSIONS)
    .flatMap(category => category.map(permission => permission.id));

  const handlePermissionChange = (permissionId, checked) => {
    if (readOnly) return;
    
    setPermissions(prev => ({
      ...prev,
      [permissionId]: checked
    }));
  };

  const handleToggleAll = (checked) => {
    if (readOnly) return;
    
    const allPermissions = {};

    ALL_PERMISSION_IDS.forEach(id => {
      allPermissions[id] = checked;
    });

    setPermissions(allPermissions);
    setSelectAll(checked);
  };

  if (readOnly) {
    return (
      <div className="space-y-6">
        {Object.entries(PERMISSIONS).map(([category, perms]) => (
          <section key={category} className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              {category}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perms.map((permission) => (
                <div 
                  key={permission.id} 
                  className="flex items-center justify-between p-2"
                >
                  <span className="text-sm text-gray-700">
                    {permission.label}
                  </span>
                  
                  {permissions[permission.id] ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {t("users:form.allowed")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {t("users:form.denied")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {planId === 'free' && !readOnly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Lock size={20} className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">
                {t("users:planRestriction.title", "Plano Gratuito")}
              </h4>
              <p className="text-xs text-yellow-700">
                {t("users:planRestriction.message", "Algumas permissões de gerenciamento estão disponíveis apenas em planos pagos. Atualize seu plano para liberar todas as funcionalidades.")}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">
          {t("users:form.selectAllPermissions")}
        </span>

        <button
          type="button"
          onClick={() => handleToggleAll(!selectAll)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${selectAll ? 'bg-yellow-500' : 'bg-gray-200'
            }`}
        >
          <span
            className={`${selectAll ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(PERMISSIONS).map(([category, perms]) => (
          <section key={category} className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              {category}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perms.map((permission) => {
                const isPaidOnly = requiresPaidPlan(permission.id);
                const isLocked = isPaidOnly && planId === 'free';
                
                return (
                  <label
                    key={permission.id}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      isLocked 
                        ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <span className="text-sm text-gray-700 flex items-center">
                      {permission.label}
                      {isLocked && (
                        <Lock size={14} className="ml-2 text-gray-400" />
                      )}
                    </span>


                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input
                        type="checkbox"
                        checked={permissions[permission.id] || false}
                        onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                        disabled={isLocked}
                        className="sr-only"
                        id={`toggle-${permission.id}`}
                      />

                      <label
                        htmlFor={`toggle-${permission.id}`}
                        className={`block overflow-hidden h-6 rounded-full ${
                          isLocked 
                            ? 'cursor-not-allowed bg-gray-200' 
                            : `cursor-pointer ${permissions[permission.id] ? 'bg-yellow-500' : 'bg-gray-200'}`
                        }`}
                      >
                        <span
                          className={`block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${
                            permissions[permission.id] && !isLocked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </label>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default UserPermissions;
