import { MoreHorizontal, MagnifyingGlassPlus, EditPencil01, CloseLg, Check } from "react-coolicons";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";

const UserListItem = ({ user, onDetailsClick, onEditClick, onDeactivateClick, onActivateClick }) => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    setIsOpen(false);

    if (action === 'details' && onDetailsClick) {
      onDetailsClick(user);
    } else if (action === 'edit' && onEditClick) {
      onEditClick(user);
    } else if (action === 'toggleStatus') {
      if (user.status === 'Inativo') {
        onActivateClick?.(user);
      } else if (user.status === 'Ativo') {
        onDeactivateClick?.(user);
      }
    } else {
      console.log(`${action} user:`, user.id);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 relative">
      <p className="self-center text-sm font-medium text-gray-900 wrap-anywhere">
        {user.name}
      </p>

      <p className="self-center text-sm text-gray-600 wrap-anywhere">
        {user.email}
      </p>

      <div className="flex items-center space-x-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'Ativo'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
          }`}>
          {user.status === 'Ativo' ? t("users:active") : t("users:inactive")}
        </span>
      </div>

      <div className="flex justify-end relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          aria-label="Ações"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>

        {isOpen && (
          <menu className="absolute right-0 mt-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <div className="py-1">
              <p className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                {t("users:actions.label")}
              </p>

              {hasPermission('view_users') && (
                <button
                  onClick={(e) => handleAction(e, 'details')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <MagnifyingGlassPlus className="w-4 h-4 mr-2 text-gray-500" />
                  {t("users:actions.details")}
                </button>
              )}

              {hasPermission('edit_users') && (
                <button
                  onClick={(e) => handleAction(e, 'edit')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <EditPencil01 className="w-4 h-4 mr-2 text-gray-500" />
                  {t("users:actions.edit")}
                </button>
              )}

              {hasPermission('delete_users') && (
                <button
                  onClick={(e) => handleAction(e, 'toggleStatus')}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {user.status === 'Ativo' ? (
                    <>
                      <CloseLg className="w-4 h-4 mr-2 text-red-500" />
                      <span className="text-red-500">{t("users:actions.deactivate")}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      <span className="text-green-500">{t("users:actions.activate")}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </menu>
        )}
      </div>
    </div>
  );
};

export default UserListItem;