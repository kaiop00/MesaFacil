import { useState } from "react";
import { UserAdd, FileDocument, Slider01 } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import UserForm from "./UserForm";
import UserPermissions from "./UserPermissions";
import { PERMISSIONS } from "../../constants/permissions";

/**
 * Modal para adicionar novos usuários.
 *
 * @param {boolean} isOpen - Se o modal está aberto ou não.
 * @param {function} onClose - Função para fechar o modal.
 */
const NewUserModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('dados-gerais');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [permissions, setPermissions] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  /**
   * Atualiza o estado do formulário com os dados do usuário.
   *
   * @param {object} e - Evento de mudança do formulário.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Atualiza o estado das permissões do usuário.
   *
   * @param {string} permissionId - ID da permissão.
   * @param {boolean} checked - Se a permissão está selecionada ou não.
   */
  const handlePermissionChange = (permissionId, checked) => {
    setPermissions(prev => ({
      ...prev,
      [permissionId]: checked
    }));
  };

  /**
   * Atualiza o estado de todas as permissões.
   *
   * @param {boolean} checked - Se todas as permissões devem ser selecionadas ou não.
   */
  const toggleSelectAll = (checked) => {
    const allPermissions = {};
    Object.values(PERMISSIONS).forEach(category => {
      category.forEach(permission => {
        allPermissions[permission.id] = checked;
      });
    });
    setPermissions(allPermissions);
    setSelectAll(checked);
  };

  /**
   * Função para lidar com o envio do formulário.
   *
   * @param {object} e - Evento de envio do formulário.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'dados-gerais') {
      setActiveTab('permissoes');
    } else {
      // Handle final form submission with both user data and permissions
      console.log('Form submitted:', { ...formData, permissions });
      onClose();
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Usuário"
      subTitle="Preencha as informações para adicionar."
      icon={UserAdd}
    >
      <div className="p-6">
        {/* Abas */}
        <section className="flex flex-wrap mb-6 bg-gray-100 rounded-lg p-1">
          <button
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
            Dados Gerais
          </button>

          <button
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
            Permissões
          </button>
        </section>

        <form onSubmit={handleSubmit}>
          {/* Formulários de dados gerais e permissões */}
          {activeTab === 'dados-gerais' ? (
            <UserForm formData={formData} onInputChange={handleInputChange} />
          ) : (
            <UserPermissions
              permissions={permissions}
              onPermissionChange={handlePermissionChange}
              onToggleAll={toggleSelectAll}
              selectAll={selectAll}
            />
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {activeTab === 'dados-gerais' ? 'Próximo' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </BaseModalWithHeader>
  );
};

export default NewUserModal;