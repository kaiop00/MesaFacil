import React, { useState, useEffect } from 'react';
import { useClientData } from '@/hooks/useClientData';

/**
 * Formulário para coletar dados do cliente (WhatsApp orders)
 * Auto-preenche com dados salvos no IndexedDB
 * Suporta múltiplos endereços com apelidos
 * @param {Object} props
 * @param {Function} props.onDataChange - Callback quando dados mudam
 * @param {boolean} props.isRequired - Se o preenchimento é obrigatório
 */
export function ClientDataForm({ onDataChange, isRequired = true }) {
  const { 
    clientData, 
    enderecos, 
    selectedEndereco,
    selectedEnderecoId,
    saveClient, 
    addNewEndereco,
    updateEnderecoData,
    removeEndereco,
    setDefault,
    selectEndereco,
    loading 
  } = useClientData();
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: ''
  });

  const [enderecoData, setEnderecoData] = useState({
    apelido: '',
    endereco: ''
  });

  const [errors, setErrors] = useState({});
  const [showNewEnderecoForm, setShowNewEnderecoForm] = useState(false);
  const [editingEnderecoId, setEditingEnderecoId] = useState(null);

  // Auto-preenche com dados salvos do cliente
  useEffect(() => {
    if (clientData) {
      setFormData({
        nome: clientData.nome || '',
        cpf: clientData.cpf || '',
        telefone: clientData.telefone || ''
      });
    }
  }, [clientData]);

  // Atualiza o endereço quando um é selecionado
  useEffect(() => {
    if (selectedEndereco) {
      setEnderecoData({
        apelido: selectedEndereco.apelido || '',
        endereco: selectedEndereco.endereco || ''
      });
    } else {
      setEnderecoData({ apelido: '', endereco: '' });
    }
  }, [selectedEndereco]);

  // Notifica componente pai sobre mudanças
  useEffect(() => {
    if (onDataChange) {
      const fullData = {
        ...formData,
        endereco: selectedEndereco?.endereco || enderecoData.endereco
      };
      onDataChange(fullData, isFormValid());
    }
  }, [formData, selectedEndereco, enderecoData]);

  /**
   * Valida CPF (apenas formato básico)
   */
  const isValidCPF = (cpf) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11;
  };

  /**
   * Valida telefone (básico)
   */
  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  };

  /**
   * Valida formulário completo
   */
  const isFormValid = () => {
    if (!isRequired) return true;

    const endereco = selectedEndereco?.endereco || enderecoData.endereco;
    return (
      formData.nome.trim().length >= 3 &&
      isValidCPF(formData.cpf) &&
      endereco.trim().length >= 10 &&
      isValidPhone(formData.telefone)
    );
  };

  /**
   * Formata CPF: 000.000.000-00
   */
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleaned.slice(0, 11);
  };

  /**
   * Formata telefone: (00) 00000-0000
   */
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return cleaned.slice(0, 11);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Aplica formatação
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Limpa erro do campo ao editar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleEnderecoChange = (e) => {
    const { name, value } = e.target;
    setEnderecoData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    // Valida ao sair do campo
    if (isRequired) {
      if (name === 'nome' && value.trim().length < 3) {
        newErrors.nome = 'Nome deve ter pelo menos 3 caracteres';
      } else if (name === 'cpf' && !isValidCPF(value)) {
        newErrors.cpf = 'CPF inválido';
      } else if (name === 'endereco' && value.trim().length < 10) {
        newErrors.endereco = 'Endereço muito curto';
      } else if (name === 'telefone' && !isValidPhone(value)) {
        newErrors.telefone = 'Telefone inválido';
      } else {
        delete newErrors[name];
      }
    }

    setErrors(newErrors);

    // Salva automaticamente no IndexedDB quando campo é válido
    if (!newErrors[name] && value.trim()) {
      saveClient(formData);
    }
  };

  const handleSelectEndereco = (id) => {
    selectEndereco(id);
    setShowNewEnderecoForm(false);
    setEditingEnderecoId(null);
  };

  const handleAddEndereco = () => {
    setShowNewEnderecoForm(true);
    setEditingEnderecoId(null);
    setEnderecoData({ apelido: '', endereco: '' });
  };

  const handleEditEndereco = (endereco) => {
    setEditingEnderecoId(endereco.id);
    setShowNewEnderecoForm(false);
    setEnderecoData({
      apelido: endereco.apelido,
      endereco: endereco.endereco
    });
  };

  const handleSaveEndereco = async () => {
    if (!enderecoData.endereco.trim() || enderecoData.endereco.trim().length < 10) {
      setErrors(prev => ({ ...prev, endereco: 'Endereço muito curto (mínimo 10 caracteres)' }));
      return;
    }

    const apelido = enderecoData.apelido.trim() || 'Endereço ' + (enderecos.length + 1);

    if (editingEnderecoId) {
      await updateEnderecoData(editingEnderecoId, {
        apelido,
        endereco: enderecoData.endereco.trim()
      });
      setEditingEnderecoId(null);
    } else {
      const isFirst = enderecos.length === 0;
      await addNewEndereco({
        apelido,
        endereco: enderecoData.endereco.trim(),
        isDefault: isFirst
      });
      setShowNewEnderecoForm(false);
    }
  };

  const handleCancelEdit = () => {
    setShowNewEnderecoForm(false);
    setEditingEnderecoId(null);
    if (selectedEndereco) {
      setEnderecoData({
        apelido: selectedEndereco.apelido,
        endereco: selectedEndereco.endereco
      });
    } else {
      setEnderecoData({ apelido: '', endereco: '' });
    }
  };

  const handleDeleteEndereco = async (id) => {
    if (confirm('Tem certeza que deseja excluir este endereço?')) {
      await removeEndereco(id);
      setEditingEnderecoId(null);
    }
  };

  const handleSetDefault = async (id) => {
    await setDefault(id);
  };

  if (loading) {
    return <div className="p-5 text-center text-gray-600">Carregando...</div>;
  }

  const isEditing = showNewEnderecoForm || editingEnderecoId !== null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 my-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Dados para Entrega {isRequired && <span className="text-red-500">*</span>}
      </h3>
      
      {/* Campos do cliente */}
      <div className="mb-4">
        <label htmlFor="nome" className="block text-sm font-medium mb-1.5 text-gray-700">
          Nome Completo *
        </label>
        <input
          type="text"
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Digite seu nome completo"
          className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
            errors.nome 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
          } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
          required={isRequired}
        />
        {errors.nome && <span className="block text-red-500 text-xs mt-1">{errors.nome}</span>}
      </div>

      <div className="mb-4">
        <label htmlFor="cpf" className="block text-sm font-medium mb-1.5 text-gray-700">
          CPF *
        </label>
        <input
          type="text"
          id="cpf"
          name="cpf"
          value={formData.cpf}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="000.000.000-00"
          className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
            errors.cpf 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
          } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
          required={isRequired}
        />
        {errors.cpf && <span className="block text-red-500 text-xs mt-1">{errors.cpf}</span>}
      </div>

      <div className="mb-4">
        <label htmlFor="telefone" className="block text-sm font-medium mb-1.5 text-gray-700">
          Telefone *
        </label>
        <input
          type="tel"
          id="telefone"
          name="telefone"
          value={formData.telefone}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="(00) 00000-0000"
          className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
            errors.telefone 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
          } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
          required={isRequired}
        />
        {errors.telefone && <span className="block text-red-500 text-xs mt-1">{errors.telefone}</span>}
      </div>

      {/* Seção de endereços */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Endereço de Entrega *
          </label>
          {!isEditing && enderecos.length > 0 && (
            <button
              type="button"
              onClick={handleAddEndereco}
              className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo endereço
            </button>
          )}
        </div>

        {/* Lista de endereços salvos */}
        {enderecos.length > 0 && !isEditing && (
          <div className="space-y-2 mb-3">
            {enderecos.map((endereco) => (
              <div
                key={endereco.id}
                className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedEnderecoId === endereco.id
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => handleSelectEndereco(endereco.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">
                        {endereco.apelido}
                      </span>
                      {endereco.isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {endereco.endereco}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEndereco(endereco);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    {!endereco.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(endereco.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                        title="Definir como padrão"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </button>
                    )}
                    {enderecos.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEndereco(endereco.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulário para novo/editar endereço */}
        {(isEditing || enderecos.length === 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="mb-3">
              <label htmlFor="apelido" className="block text-sm font-medium mb-1.5 text-gray-700">
                Nome do Endereço
              </label>
              <input
                type="text"
                id="apelido"
                name="apelido"
                value={enderecoData.apelido}
                onChange={handleEnderecoChange}
                placeholder="Ex: Casa, Trabalho, Escritório..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-green-500 focus:outline-none focus:ring-2 focus:ring-opacity-20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dê um nome para identificar este endereço
              </p>
            </div>

            <div className="mb-3">
              <label htmlFor="endereco" className="block text-sm font-medium mb-1.5 text-gray-700">
                Endereço Completo *
              </label>
              <textarea
                id="endereco"
                name="endereco"
                value={enderecoData.endereco}
                onChange={handleEnderecoChange}
                onBlur={handleBlur}
                placeholder="Rua, número, complemento, bairro, cidade"
                className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors resize-none ${
                  errors.endereco 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
                rows="3"
                required={isRequired}
              />
              {errors.endereco && <span className="block text-red-500 text-xs mt-1">{errors.endereco}</span>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEndereco}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                {editingEnderecoId ? 'Atualizar' : 'Salvar'} Endereço
              </button>
              {(showNewEnderecoForm || editingEnderecoId) && enderecos.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 bg-green-50 p-3 rounded-md mt-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 text-green-600 mt-0.5">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z"/>
        </svg>
        <p className="text-xs text-green-800 leading-relaxed">
          Seus dados e endereços serão salvos no dispositivo para facilitar próximos pedidos.
        </p>
      </div>
    </div>
  );
}

export default ClientDataForm;
