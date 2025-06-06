import { Check } from "react-coolicons";
import { PERMISSIONS } from "../../constants/permissions";

const UserPermissions = ({ permissions = {}, onPermissionChange, onToggleAll, selectAll }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">
          Selecionar todas as permissões
        </span>

        <button
          type="button"
          onClick={() => onToggleAll(!selectAll)}
          className={`flex items-center justify-center
            w-5 h-5
            rounded border
            ${selectAll
              ? 'bg-yellow-500 border-yellow-500'
              : 'border-gray-300'
            }`}
        >
          {selectAll && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(PERMISSIONS).map(([category, perms]) => (
          <section key={category} className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              {category}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perms.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md"
                >
                  <input
                    type="checkbox"
                    checked={!!permissions[permission.id]}
                    onChange={(e) => onPermissionChange(permission.id, e.target.checked)}
                    className="h-4 w-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                  />

                  <span className="text-sm text-gray-700">
                    {permission.label}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default UserPermissions;
