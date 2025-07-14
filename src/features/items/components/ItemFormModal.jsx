import { useState, useEffect } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { FileDocument } from "react-coolicons";

const ItemFormModal = ({ 
  isOpen, 
  onClose, 
  item = null, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    nome: "",
    marca: "",
    unidadeArmazenamento: "",
    unidadeCompra: "",
    estoqueAtual: "",
    estoqueBaixo: "",
    estoqueMedio: "",
    estoqueAlto: ""
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome || "",
        marca: item.marca || "",
        unidadeArmazenamento: item.unidadeArmazenamento || "Unidade",
        unidadeCompra: item.unidadeCompra || "Unidade",
        estoqueAtual: item.estoqueAtual || "",
        estoqueBaixo: item.estoqueBaixo || "",
        estoqueMedio: item.estoqueMedio || "",
        estoqueAlto: item.estoqueAlto || ""
      });
    } else {
      setFormData({
        nome: "",
        marca: "",
        unidadeArmazenamento: "Unidade",
        unidadeCompra: "Unidade",
        estoqueAtual: "",
        estoqueBaixo: "",
        estoqueMedio: "",
        estoqueAlto: ""
      });
    }
    setFormErrors({});
  }, [item, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.nome.trim()) {
      errors.nome = "O nome do item é obrigatório";
    }
    
    if (!formData.estoqueAtual) {
      errors.estoqueAtual = "O estoque atual é obrigatório";
    } else if (isNaN(formData.estoqueAtual) || parseInt(formData.estoqueAtual) < 0) {
      errors.estoqueAtual = "Estoque inválido";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        estoqueAtual: parseInt(formData.estoqueAtual, 10),
        estoqueBaixo: parseInt(formData.estoqueBaixo || 0, 10),
        estoqueMedio: parseInt(formData.estoqueMedio || 0, 10),
        estoqueAlto: parseInt(formData.estoqueAlto || 0, 10)
      });
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={item ? item.nome || "Editar Item" : "Novo Item"}
      subTitle={item ? "Preencha as informações para editar" : "Preencha as informações para adicionar"}
      icon={FileDocument}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome *
          </label>
          <input
            type="text"
            name="nome"
            className={`w-full px-3 py-2 border ${
              formErrors.nome ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder="Nome do item"
            value={formData.nome}
            onChange={handleInputChange}
          />
          {formErrors.nome && (
            <p className="mt-1 text-sm text-red-600">{formErrors.nome}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca
          </label>
          <input
            type="text"
            name="marca"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Marca do item"
            value={formData.marca}
            onChange={handleInputChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade de Armazenamento
            </label>
            <select
              name="unidadeArmazenamento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.unidadeArmazenamento}
              onChange={handleInputChange}
            >
              <option value="Unidade">Unidade</option>
              <option value="Quilograma">Quilograma</option>
              <option value="Grama">Grama</option>
              <option value="Litro">Litro</option>
              <option value="Mililitro">Mililitro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade Compra
            </label>
            <select
              name="unidadeCompra"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.unidadeCompra}
              onChange={handleInputChange}
            >
              <option value="Unidade">Unidade</option>
              <option value="Caixa">Caixa</option>
              <option value="Pacote">Pacote</option>
              <option value="Fardo">Fardo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estoque Atual *
          </label>
          <input
            type="number"
            name="estoqueAtual"
            min="0"
            className={`w-full px-3 py-2 border ${
              formErrors.estoqueAtual ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder="Quantidade em estoque"
            value={formData.estoqueAtual}
            onChange={handleInputChange}
          />
          {formErrors.estoqueAtual && (
            <p className="mt-1 text-sm text-red-600">{formErrors.estoqueAtual}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque Baixo
            </label>
            <input
              type="number"
              name="estoqueBaixo"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.estoqueBaixo}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque Médio
            </label>
            <input
              type="number"
              name="estoqueMedio"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.estoqueMedio}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque Alto
            </label>
            <input
              type="number"
              name="estoqueAlto"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.estoqueAlto}
              onChange={handleInputChange}
            />
          </div>
        </div>

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
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-dynamic hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Salvar
          </button>
        </div>
      </form>
    </BaseModalWithHeader>
  );
};

export default ItemFormModal;
