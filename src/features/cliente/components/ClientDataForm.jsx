import React, { useState, useEffect, useCallback } from 'react';
import { useClientData } from '@/hooks/useClientData';

/**
 * Formulário para coletar dados do cliente (WhatsApp orders)
 * Auto-preenche com dados salvos no IndexedDB
 * Suporta múltiplos endereços com apelidos
 * @param {Object} props
 * @param {Function} props.onDataChange - Callback quando dados mudam
 * @param {boolean} props.isRequired - Se o preenchimento é obrigatório
 * @param {boolean} props.isRetirada - Se é pedido para retirada (sem endereço)
 * @param {Array} props.bairros - Array de bairros com taxa de entrega
 * @param {Object} props.selectedBairro - Bairro selecionado
 * @param {Function} props.setSelectedBairro - Setter para bairro selecionado
 * @param {boolean} props.deliveryFeeLoading - Se está carregando os bairros
 * @param {string} props.tipoEntrega - Tipo de entrega (delivery ou retirada)
 */
export function ClientDataForm({ onDataChange, isRequired = true, isRetirada = false, bairros = [], selectedBairro = null, setSelectedBairro = null, deliveryFeeLoading = false, tipoEntrega = 'delivery' }) {
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
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    pontoReferencia: ''
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
        rua: selectedEndereco.rua || '',
        numero: selectedEndereco.numero || '',
        complemento: selectedEndereco.complemento || '',
        bairro: selectedEndereco.bairro || '',
        cidade: selectedEndereco.cidade || '',
        pontoReferencia: selectedEndereco.pontoReferencia || ''
      });
    } else {
      setEnderecoData({ 
        apelido: '', 
        rua: '', 
        numero: '', 
        complemento: '', 
        bairro: '', 
        cidade: '', 
        pontoReferencia: '' 
      });
    }
  }, [selectedEndereco]);

  /**
   * Formata o endereço completo a partir dos campos
   */
  const formatEnderecoCompleto = (dados) => {
    const partes = [];
    if (dados.rua) partes.push(dados.rua);
    if (dados.numero) partes.push(dados.numero);
    if (dados.complemento) partes.push(dados.complemento);
    if (dados.bairro) partes.push(dados.bairro);
    if (dados.cidade) partes.push(dados.cidade);
    if (dados.pontoReferencia) partes.push(`(Ref: ${dados.pontoReferencia})`);
    return partes.join(', ');
  };

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
   * Para retirada, não precisa validar endereço
   */
  const isFormValid = useCallback(() => {
    if (!isRequired) return true;

    // Validação básica (nome, CPF, telefone) - obrigatória para ambos os modos
    const validacaoBasica = (
      formData.nome.trim().length >= 3 &&
      isValidCPF(formData.cpf) &&
      isValidPhone(formData.telefone)
    );

    // Para retirada, apenas validação básica
    if (isRetirada) {
      return validacaoBasica;
    }

    // Para delivery, também valida endereço
    const enderecoAtual = selectedEndereco || enderecoData;
    const temRua = (enderecoAtual.rua || '').trim().length >= 3;
    const temNumero = (enderecoAtual.numero || '').trim().length >= 1;
    const temCidade = (enderecoAtual.cidade || '').trim().length >= 2;
    
    // Valida bairro: se for select, verifica se foi selecionado; se for input, valida texto
    let temBairro = false;
    if (!isRetirada && tipoEntrega === 'delivery' && bairros.length > 0) {
      // É um select
      temBairro = selectedBairro && selectedBairro.nome;
    } else {
      // É um input de texto
      temBairro = (enderecoAtual.bairro || '').trim().length >= 2;
    }

    return (
      validacaoBasica &&
      temRua &&
      temNumero &&
      temBairro &&
      temCidade
    );
  }, [formData, selectedEndereco, enderecoData, isRequired, isRetirada, tipoEntrega, bairros, selectedBairro]);

  // Notifica componente pai sobre mudanças
  useEffect(() => {
    if (onDataChange) {
      // Para retirada, não precisa de endereço
      if (isRetirada) {
        const fullData = {
          ...formData,
          endereco: '',
          enderecoDetalhado: null
        };
        onDataChange(fullData, isFormValid());
      } else {
        const enderecoAtual = selectedEndereco || enderecoData;
        const enderecoCompleto = formatEnderecoCompleto(enderecoAtual);
        const fullData = {
          ...formData,
          endereco: enderecoCompleto,
          enderecoDetalhado: {
            rua: enderecoAtual.rua || '',
            numero: enderecoAtual.numero || '',
            complemento: enderecoAtual.complemento || '',
            bairro: enderecoAtual.bairro || '',
            cidade: enderecoAtual.cidade || '',
            pontoReferencia: enderecoAtual.pontoReferencia || ''
          }
        };
        onDataChange(fullData, isFormValid());
      }
    }
  }, [formData, selectedEndereco, enderecoData, isRetirada, onDataChange, isFormValid]);

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
      } else if (name === 'rua' && value.trim().length < 3) {
        newErrors.rua = 'Rua muito curta';
      } else if (name === 'numero' && value.trim().length < 1) {
        newErrors.numero = 'Informe o número';
      } else if (name === 'bairro' && !(!isRetirada && tipoEntrega === 'delivery' && bairros.length > 0) && value.trim().length < 2) {
        // Só valida bairro como texto se NÃO for um select
        newErrors.bairro = 'Bairro muito curto';
      } else if (name === 'cidade' && value.trim().length < 2) {
        newErrors.cidade = 'Cidade muito curta';
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
    setEnderecoData({ 
      apelido: '', 
      rua: '', 
      numero: '', 
      complemento: '', 
      bairro: '', 
      cidade: '', 
      pontoReferencia: '' 
    });
  };

  const handleEditEndereco = (endereco) => {
    setEditingEnderecoId(endereco.id);
    setShowNewEnderecoForm(false);
    setEnderecoData({
      apelido: endereco.apelido,
      rua: endereco.rua || '',
      numero: endereco.numero || '',
      complemento: endereco.complemento || '',
      bairro: endereco.bairro || '',
      cidade: endereco.cidade || '',
      pontoReferencia: endereco.pontoReferencia || ''
    });
  };

  const handleSaveEndereco = async () => {
    // Validação dos campos obrigatórios
    const newErrors = {};
    if (!enderecoData.rua?.trim() || enderecoData.rua.trim().length < 3) {
      newErrors.rua = 'Rua deve ter pelo menos 3 caracteres';
    }
    if (!enderecoData.numero?.trim()) {
      newErrors.numero = 'Informe o número';
    }
    
    // Valida bairro: se for um select (delivery com bairros), verifica se foi selecionado; se for input, valida texto
    if (!isRetirada && tipoEntrega === 'delivery' && bairros.length > 0) {
      // É um select
      if (!selectedBairro || !selectedBairro.nome) {
        newErrors.bairro = 'Selecione um bairro';
      }
    } else {
      // É um input de texto
      if (!enderecoData.bairro?.trim() || enderecoData.bairro.trim().length < 2) {
        newErrors.bairro = 'Bairro deve ter pelo menos 2 caracteres';
      }
    }
    
    if (!enderecoData.cidade?.trim() || enderecoData.cidade.trim().length < 2) {
      newErrors.cidade = 'Cidade deve ter pelo menos 2 caracteres';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    const apelido = enderecoData.apelido.trim() || 'Endereço ' + (enderecos.length + 1);

    const enderecoParaSalvar = {
      apelido,
      rua: enderecoData.rua.trim(),
      numero: enderecoData.numero.trim(),
      complemento: enderecoData.complemento?.trim() || '',
      bairro: enderecoData.bairro.trim(),
      cidade: enderecoData.cidade.trim(),
      pontoReferencia: enderecoData.pontoReferencia?.trim() || ''
    };

    if (editingEnderecoId) {
      await updateEnderecoData(editingEnderecoId, enderecoParaSalvar);
      setEditingEnderecoId(null);
    } else {
      const isFirst = enderecos.length === 0;
      await addNewEndereco({
        ...enderecoParaSalvar,
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
        rua: selectedEndereco.rua || '',
        numero: selectedEndereco.numero || '',
        complemento: selectedEndereco.complemento || '',
        bairro: selectedEndereco.bairro || '',
        cidade: selectedEndereco.cidade || '',
        pontoReferencia: selectedEndereco.pontoReferencia || ''
      });
    } else {
      setEnderecoData({ 
        apelido: '', 
        rua: '', 
        numero: '', 
        complemento: '', 
        bairro: '', 
        cidade: '', 
        pontoReferencia: '' 
      });
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
        {isRetirada ? 'Dados para Retirada' : 'Dados para Entrega'} {isRequired && <span className="text-red-500">*</span>}
      </h3>

      {/* Mensagem informativa para retirada */}
      {isRetirada && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <div>
              <p className="text-sm font-medium text-blue-800">Pedido pronto para retirada</p>
              <p className="text-xs text-blue-600">Você pode retirar seu pedido diretamente no estabelecimento</p>
            </div>
          </div>
        </div>
      )}
      
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

      {/* Seção de endereços - apenas para delivery */}
      {!isRetirada && (
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
                      {endereco.rua}, {endereco.numero}
                      {endereco.complemento && `, ${endereco.complemento}`}
                      {endereco.bairro && ` - ${endereco.bairro}`}
                      {endereco.cidade && `, ${endereco.cidade}`}
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
              <label htmlFor="rua" className="block text-sm font-medium mb-1.5 text-gray-700">
                Rua / Avenida *
              </label>
              <input
                type="text"
                id="rua"
                name="rua"
                value={enderecoData.rua}
                onChange={handleEnderecoChange}
                onBlur={handleBlur}
                placeholder="Ex: Rua das Flores"
                className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
                  errors.rua 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
                required={isRequired}
              />
              {errors.rua && <span className="block text-red-500 text-xs mt-1">{errors.rua}</span>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="numero" className="block text-sm font-medium mb-1.5 text-gray-700">
                  Número *
                </label>
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  value={enderecoData.numero}
                  onChange={handleEnderecoChange}
                  onBlur={handleBlur}
                  placeholder="123"
                  className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
                    errors.numero 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                  } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
                  required={isRequired}
                />
                {errors.numero && <span className="block text-red-500 text-xs mt-1">{errors.numero}</span>}
              </div>

              <div>
                <label htmlFor="complemento" className="block text-sm font-medium mb-1.5 text-gray-700">
                  Complemento
                </label>
                <input
                  type="text"
                  id="complemento"
                  name="complemento"
                  value={enderecoData.complemento}
                  onChange={handleEnderecoChange}
                  placeholder="Apto, Bloco..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-green-500 focus:outline-none focus:ring-2 focus:ring-opacity-20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="bairro" className="block text-sm font-medium mb-1.5 text-gray-700">
                  Bairro *
                </label>
                {!isRetirada && tipoEntrega === 'delivery' && bairros.length > 0 ? (
                  deliveryFeeLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 p-2">
                      <span>Carregando bairros...</span>
                    </div>
                  ) : (
                    <select
                      id="bairro"
                      name="bairro"
                      value={selectedBairro?.nome || ''}
                      onChange={(e) => {
                        const bairroSelecionado = bairros.find(b => b.nome === e.target.value);
                        setSelectedBairro(bairroSelecionado);
                        setEnderecoData(prev => ({
                          ...prev,
                          bairro: e.target.value
                        }));
                      }}
                      className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
                        errors.bairro 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                      } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
                      required={isRequired}
                    >
                      <option value="">Selecione seu bairro</option>
                      {bairros.map((bairro, index) => (
                        <option key={index} value={bairro.nome}>
                          {bairro.nome}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <input
                    type="text"
                    id="bairro"
                    name="bairro"
                    value={enderecoData.bairro}
                    onChange={handleEnderecoChange}
                    onBlur={handleBlur}
                    placeholder="Centro"
                    className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
                      errors.bairro 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                    } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
                    required={isRequired}
                  />
                )}
                {errors.bairro && <span className="block text-red-500 text-xs mt-1">{errors.bairro}</span>}
              </div>

              <div>
                <label htmlFor="cidade" className="block text-sm font-medium mb-1.5 text-gray-700">
                  Cidade *
                </label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={enderecoData.cidade}
                  onChange={handleEnderecoChange}
                  onBlur={handleBlur}
                  placeholder="São Paulo"
                  className={`w-full px-3 py-2.5 border rounded-md text-sm transition-colors ${
                    errors.cidade 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                  } focus:outline-none focus:ring-2 focus:ring-opacity-20`}
                  required={isRequired}
                />
                {errors.cidade && <span className="block text-red-500 text-xs mt-1">{errors.cidade}</span>}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="pontoReferencia" className="block text-sm font-medium mb-1.5 text-gray-700">
                Ponto de Referência
              </label>
              <input
                type="text"
                id="pontoReferencia"
                name="pontoReferencia"
                value={enderecoData.pontoReferencia}
                onChange={handleEnderecoChange}
                placeholder="Próximo ao mercado, em frente à praça..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:border-green-500 focus:ring-green-500 focus:outline-none focus:ring-2 focus:ring-opacity-20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ajuda o entregador a encontrar você mais facilmente
              </p>
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
      )}

      <div className="flex items-start gap-2 bg-green-50 p-3 rounded-md mt-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 text-green-600 mt-0.5">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z"/>
        </svg>
        <p className="text-xs text-green-800 leading-relaxed">
          {isRetirada 
            ? 'Seus dados serão salvos no dispositivo para facilitar próximos pedidos.'
            : 'Seus dados e endereços serão salvos no dispositivo para facilitar próximos pedidos.'
          }
        </p>
      </div>
    </div>
  );
}

export default ClientDataForm;
