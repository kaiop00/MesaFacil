import { useState } from "react";
import { UserAdd, FileDocument, Slider01 } from "react-coolicons";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import UserForm from "@/features/users/components/modals/UserForm";
import UserPermissions from "@/features/users/components/modals/UserPermissions";
import registerUserOnFirebase from "@/features/users/components/modals/handlers/registerUserOnFirebase";
import addUserToFirestore from "@/features/users/services/addUserToFirestore";

const NewUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState('dados-gerais');
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'dados-gerais') {
      setActiveTab('permissoes');
      return;
    }
    try {
      setIsLoading(true);
      if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
      const response = await registerUserOnFirebase(formData);
      const data = await response.json();

      if (response.ok) {
        const uid = data.localId;
        await addUserToFirestore(uid, formData.name, formData.email, permissions, idRestaurante);
        notify('Usuário adicionado com sucesso', 'success');
        onClose();
        if (onUserAdded) onUserAdded();
      } else {
        if (response.status === 400) {
          if (data.error.message === 'EMAIL_EXISTS') {
            notify('Email já cadastrado', 'error');
            return;
          }
        }
        notify(JSON.stringify(response.status + ' ' + response.statusText), 'error');
      }
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setIsLoading(false);
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
            Dados Gerais
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
            Permissões
          </button>
        </section>

        <form onSubmit={handleSubmit}>
          {/* Formulários de dados gerais e permissões */}
          {activeTab === 'dados-gerais' ? (
            <UserForm
              formData={formData}
              setFormData={setFormData}
            />
          ) : (
            <UserPermissions
              permissions={permissions}
              setPermissions={setPermissions}
              selectAll={selectAll}
              setSelectAll={setSelectAll}
            />
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : activeTab === 'dados-gerais' ? 'Próximo' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </BaseModalWithHeader>
  );
};

export default NewUserModal;