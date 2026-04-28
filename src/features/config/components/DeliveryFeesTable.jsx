import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { updateWhatsAppConfig } from '@/features/config/services/whatsappService';
import ConfirmModal from '@/components/ConfirmModal';

/**
 * Componente para gerenciar a tabela de taxas de entrega por bairro
 * Permite adicionar, editar e deletar bairros com seus respectivos valores
 */
const DeliveryFeesTable = ({ idRestaurante, bairros = [], onUpdate }) => {
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [newBairro, setNewBairro] = useState('');
  const [newValor, setNewValor] = useState('');
  const [editName, setEditName] = useState('');
  const [editValor, setEditValor] = useState('');

  const handleAddBairro = async () => {
    // Validação
    if (!newBairro.trim()) {
      notify('Digite o nome do bairro', 'error');
      return;
    }
    if (!newValor.trim()) {
      notify('Digite o valor da taxa', 'error');
      return;
    }

    // Verifica se já existe um bairro com o mesmo nome
    const bairroExistente = bairros.some(
      (b) => b.nome.toLowerCase() === newBairro.trim().toLowerCase()
    );
    if (bairroExistente) {
      notify('Este bairro já foi adicionado', 'error');
      return;
    }

    try {
      setSaving(true);
      const valor = parseFloat(newValor.replace(',', '.')) || 0;

      // Adiciona o novo bairro
      const updatedBairros = [
        ...bairros,
        {
          nome: newBairro.trim(),
          valor: valor,
        },
      ];

      await updateWhatsAppConfig(idRestaurante, { bairros: updatedBairros });
      
      // Limpa os campos
      setNewBairro('');
      setNewValor('');
      notify('Bairro adicionado com sucesso!', 'success');
      
      if (onUpdate) {
        onUpdate(updatedBairros);
      }
    } catch (error) {
      console.error('Erro ao adicionar bairro:', error);
      notify('Erro ao adicionar bairro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBairro = async (index) => {
    // Validação
    if (!editName.trim()) {
      notify('Digite o nome do bairro', 'error');
      return;
    }
    if (!editValor.trim()) {
      notify('Digite o valor da taxa', 'error');
      return;
    }

    // Verifica se existe outro bairro com o mesmo nome
    const bairroExistente = bairros.some(
      (b, idx) =>
        idx !== index &&
        b.nome.toLowerCase() === editName.trim().toLowerCase()
    );
    if (bairroExistente) {
      notify('Já existe um bairro com este nome', 'error');
      return;
    }

    try {
      setSaving(true);
      const valor = parseFloat(editValor.replace(',', '.')) || 0;

      // Atualiza o bairro
      const updatedBairros = bairros.map((b, idx) =>
        idx === index ? { nome: editName.trim(), valor } : b
      );

      await updateWhatsAppConfig(idRestaurante, { bairros: updatedBairros });
      
      setEditingIndex(null);
      setEditName('');
      setEditValor('');
      notify('Bairro atualizado com sucesso!', 'success');
      
      if (onUpdate) {
        onUpdate(updatedBairros);
      }
    } catch (error) {
      console.error('Erro ao atualizar bairro:', error);
      notify('Erro ao atualizar bairro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBairro = async () => {
    try {
      setSaving(true);

      // Remove o bairro
      const updatedBairros = bairros.filter((_, idx) => idx !== deletingIndex);

      await updateWhatsAppConfig(idRestaurante, { bairros: updatedBairros });
      
      setDeletingIndex(null);
      notify('Bairro removido com sucesso!', 'success');
      
      if (onUpdate) {
        onUpdate(updatedBairros);
      }
    } catch (error) {
      console.error('Erro ao deletar bairro:', error);
      notify('Erro ao remover bairro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditName(bairros[index].nome);
    setEditValor(bairros[index].valor.toString().replace('.', ','));
  };

  return (
    <div className="space-y-4">
      {/* Tabela de bairros existentes */}
      {bairros.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Bairro
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  Valor (R$)
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {bairros.map((bairro, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-900">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={saving}
                      />
                    ) : (
                      bairro.nome
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {editingIndex === index ? (
                      <div className="relative w-32 ml-auto">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          R$
                        </span>
                        <input
                          type="text"
                          value={editValor}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            setEditValor(value);
                          }}
                          placeholder="0,00"
                          className="w-full px-3 py-1 pr-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
                          disabled={saving}
                        />
                      </div>
                    ) : (
                      `R$ ${bairro.valor.toFixed(2).replace('.', ',')}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      {editingIndex === index ? (
                        <>
                          <button
                            onClick={() => handleEditBairro(index)}
                            disabled={saving}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            disabled={saving}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-400 disabled:opacity-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(index)}
                            disabled={saving}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingIndex(index)}
                            disabled={saving}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Deletar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulário para adicionar novo bairro */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-semibold text-blue-900 mb-3">
          {bairros.length === 0
            ? 'Adicione o primeiro bairro'
            : 'Adicionar novo bairro'}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do bairro
            </label>
            <input
              type="text"
              value={newBairro}
              onChange={(e) => setNewBairro(e.target.value)}
              placeholder="Ex: Centro"
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor da taxa (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                R$
              </span>
              <input
                type="text"
                value={newValor}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.,]/g, '');
                  setNewValor(value);
                }}
                placeholder="0,00"
                disabled={saving}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddBairro}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação para deletar */}
      {deletingIndex !== null && (
        <ConfirmModal
          title="Remover bairro"
          message={`Tem certeza que deseja remover o bairro "${bairros[deletingIndex].nome}"?`}
          onConfirm={handleDeleteBairro}
          onCancel={() => setDeletingIndex(null)}
          isOpen={true}
          confirmText="Remover"
          cancelText="Cancelar"
          destructive={true}
        />
      )}
    </div>
  );
};

export default DeliveryFeesTable;
