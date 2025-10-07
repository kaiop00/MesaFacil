import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileDocument, Slider01 } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import UserForm from "./forms/UserForm";
import UserPermissions from "./forms/UserPermissions";

const UserModal = ({
  isOpen,
  onClose,
  user = null,
  mode = 'view', // 'view' | 'create' | 'edit'
  title = 'Usuário',
  subTitle = '',
  icon = null,
  onSubmit,
  onSuccess,
  isLoading = false,
  children,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dados-gerais');
  const [permissions, setPermissions] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', status: '' });
  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  // Inicializa os dados do formulario quando a propriedade 'user' muda
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '', // Senha esta vazia para edicao/visualizacao
        status: user.status || '',
      });
      setPermissions(user.role || {});
    } else if (isCreateMode) {
      // Reseta form para novo usuário
      setFormData({ name: '', email: '', password: '', status: '' });
      setPermissions({});
      setSelectAll(false);
    }
  }, [user, isCreateMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (activeTab === 'dados-gerais' && !isViewMode) {
      setActiveTab('permissoes');
      return;
    }

    if (typeof onSubmit === 'function') {
      await onSubmit({ formData, permissions });
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'dados-gerais') {
      if (isViewMode) {
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("users:form.name")}</label>
              <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                {user.name || t("users:form.notInformed")}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("users:form.email")}</label>
              <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                {user.email || t("users:form.notInformed")}
              </div>
            </div>
            {user.status && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("users:status")}</label>
                <div className="p-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.status === 'Ativo'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {user.status === 'Ativo' ? t("users:active") : t("users:inactive")}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      }
      return (
        <UserForm
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditMode}
        />
      );
    }

    // Aba de permissões
    if (isViewMode) {
      return (
        <UserPermissions
          permissions={permissions}
          readOnly={true}
        />
      );
    }

    return (
      <UserPermissions
        permissions={permissions}
        setPermissions={setPermissions}
        selectAll={selectAll}
        setSelectAll={setSelectAll}
      />
    );
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subTitle={subTitle}
      icon={icon}
    >
      <div className="p-6">
        {/* Tabs */}
        <section className="flex flex-wrap mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab('dados-gerais')}
            className={`flex-1 flex items-center justify-center
              px-4 py-2
              text-sm font-medium
              rounded-md transition-colors
              ${activeTab === 'dados-gerais'
                ? 'bg-yellow-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
              }`}
          >
            <FileDocument className="w-4 h-4 mr-2" />
            {t("users:tabs.generalData")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissoes')}
            className={`flex-1 flex items-center justify-center
              px-4 py-2
              text-sm font-medium
              rounded-md transition-colors
            ${activeTab === 'permissoes'
                ? 'bg-yellow-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Slider01 className="w-4 h-4 mr-2" />
            {t("users:tabs.permissions")}
          </button>
        </section>

        {!isViewMode ? (
          <form onSubmit={handleSubmit}>
            {renderTabContent()}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                {activeTab === 'dados-gerais' ? t("users:buttons.cancel") : t("users:buttons.back")}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                {isLoading
                  ? t("users:buttons.saving")
                  : activeTab === 'dados-gerais'
                    ? t("users:buttons.next")
                    : t("users:buttons.save")}
              </button>
            </div>
          </form>
        ) : (
          <>
            {renderTabContent()}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                {t("users:buttons.close")}
              </button>
            </div>
          </>
        )}

        {children}
      </div>
    </BaseModalWithHeader>
  );
};

export default UserModal;
