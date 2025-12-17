import React, { useState, useEffect } from 'react';
import { useClientData } from '@/hooks/useClientData';

/**
 * Formulário para coletar dados do cliente (WhatsApp orders)
 * Auto-preenche com dados salvos no IndexedDB
 * @param {Object} props
 * @param {Function} props.onDataChange - Callback quando dados mudam
 * @param {boolean} props.isRequired - Se o preenchimento é obrigatório
 */
export function ClientDataForm({ onDataChange, isRequired = true }) {
  const { clientData, saveClient, loading } = useClientData();
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    endereco: '',
    telefone: ''
  });

  const [errors, setErrors] = useState({});

  // Auto-preenche com dados salvos
  useEffect(() => {
    if (clientData) {
      setFormData({
        nome: clientData.nome || '',
        cpf: clientData.cpf || '',
        endereco: clientData.endereco || '',
        telefone: clientData.telefone || ''
      });
    }
  }, [clientData]);

  // Notifica componente pai sobre mudanças
  useEffect(() => {
    if (onDataChange) {
      onDataChange(formData, isFormValid());
    }
  }, [formData]);

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

    return (
      formData.nome.trim().length >= 3 &&
      isValidCPF(formData.cpf) &&
      formData.endereco.trim().length >= 10 &&
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

  if (loading) {
    return <div className="p-5 text-center text-gray-600">Carregando...</div>;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 my-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Dados para Entrega {isRequired && <span className="text-red-500">*</span>}
      </h3>
      
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

      <div className="mb-4">
        <label htmlFor="endereco" className="block text-sm font-medium mb-1.5 text-gray-700">
          Endereço Completo *
        </label>
        <textarea
          id="endereco"
          name="endereco"
          value={formData.endereco}
          onChange={handleChange}
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

      <div className="flex items-start gap-2 bg-green-50 p-3 rounded-md mt-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 text-green-600 mt-0.5">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z"/>
        </svg>
        <p className="text-xs text-green-800 leading-relaxed">
          Seus dados serão salvos no dispositivo para facilitar próximos pedidos.
        </p>
      </div>
    </div>
  );
}

export default ClientDataForm;
