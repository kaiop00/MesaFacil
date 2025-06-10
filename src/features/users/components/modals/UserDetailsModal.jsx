import { FileDocument, Slider01 } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import UserForm from "@/features/users/components/modals/UserForm";
import UserPermissions from "@/features/users/components/modals/UserPermissions";
import { useState } from "react";

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('dados-gerais');

  if (!user) return null;

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Usuário"
      icon={null}
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

        <div className="space-y-4">
          {activeTab === 'dados-gerais' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                  {user.name || 'Não informado'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                  {user.email || 'Não informado'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="p-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.status === 'Ativo'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    {user.status || 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Menu
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nível de Acesso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {user.role ? (
                    Object.entries(user.role).map(([menu, permission]) => (
                      <tr key={menu}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {menu}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {permission === 'read' ? 'Somente Visualização' : 'Total'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhuma permissão definida
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </BaseModalWithHeader>
  );
};

export default UserDetailsModal;
