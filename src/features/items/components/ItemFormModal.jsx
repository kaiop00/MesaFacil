import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { FileDocument } from "react-coolicons";

const ItemFormModal = ({ 
  isOpen, 
  onClose, 
  item = null, 
  onSave,
  setores = [],
}) => {
  const { t } = useTranslation("items");
  const [formData, setFormData] = useState({
    nome: "",
    marca: "",
    unidadeArmazenamento: "",
    unidadeCompra: "",
    fatorTransformacaoPadrao: "",
    estoqueAtual: "",
    estoqueBaixo: "",
    estoqueMedio: "",
    estoqueAlto: "",
    setorId: ""
  });
  const [formErrors, setFormErrors] = useState({});

  // Helper function to get unit translation with plural support
  const getUnitTranslation = (unitValue, type, count = 1) => {
    if (!unitValue) return "";
    const unitKey = unitValue.toLowerCase();
    const baseKey = `form.units.${type}.${unitKey}`;
    
    // Use plural if count is different from 1
    if (count !== 1) {
      const pluralKey = `${baseKey}_plural`;
      const pluralTranslation = t(pluralKey, { defaultValue: null });
      if (pluralTranslation) return pluralTranslation;
    }
    
    return t(baseKey);
  };

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome || "",
        marca: item.marca || "",
        unidadeArmazenamento: item.unidadeArmazenamento || "Unidade",
        unidadeCompra: item.unidadeCompra || "Unidade",
        fatorTransformacaoPadrao: item.fatorTransformacaoPadrao || "",
        estoqueAtual: item.estoqueAtual || "",
        estoqueBaixo: item.estoqueBaixo || "",
        estoqueMedio: item.estoqueMedio || "",
        estoqueAlto: item.estoqueAlto || "",
        setorId: item.setorId || ""
      });
    } else {
      setFormData({
        nome: "",
        marca: "",
        unidadeArmazenamento: "Unidade",
        unidadeCompra: "Unidade",
        fatorTransformacaoPadrao: "",
        estoqueAtual: "",
        estoqueBaixo: "",
        estoqueMedio: "",
        estoqueAlto: "",
        setorId: setores?.[0]?.id || ""
      });
    }
    setFormErrors({});
  }, [item, isOpen, setores]);

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
      errors.nome = t("form.fields.nameRequired");
    }
    
    if (!formData.estoqueAtual) {
      errors.estoqueAtual = t("form.fields.currentStockRequired");
    } else if (isNaN(formData.estoqueAtual) || parseInt(formData.estoqueAtual) < 0) {
      errors.estoqueAtual = t("form.fields.currentStockInvalid");
    }

    if (!formData.setorId) {
      errors.setorId = "Selecione um setor de produção";
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
        estoqueAlto: parseInt(formData.estoqueAlto || 0, 10),
        fatorTransformacaoPadrao: formData.fatorTransformacaoPadrao 
          ? parseFloat(formData.fatorTransformacaoPadrao)
          : null,
        setorId: formData.setorId,
      });
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={item ? item.nome || t("form.titleEdit") : t("form.titleCreate")}
      subTitle={item ? t("form.subtitleEdit") : t("form.subtitleCreate")}
      icon={FileDocument}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.name")} {t("form.required")}
          </label>
          <input
            type="text"
            name="nome"
            className={`w-full px-3 py-2 border ${
              formErrors.nome ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder={t("form.fields.namePlaceholder")}
            value={formData.nome}
            onChange={handleInputChange}
          />
          {formErrors.nome && (
            <p className="mt-1 text-sm text-red-600">{formErrors.nome}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.brand")}
          </label>
          <input
            type="text"
            name="marca"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder={t("form.fields.brandPlaceholder")}
            value={formData.marca}
            onChange={handleInputChange}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.purchaseUnit")}
            </label>
            <select
              name="unidadeCompra"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.unidadeCompra}
              onChange={handleInputChange}
            >
              <option value="Unidade">{t("form.units.purchase.unidade")}</option>
              <option value="Caixa">{t("form.units.purchase.caixa")}</option>
              <option value="Pacote">{t("form.units.purchase.pacote")}</option>
              <option value="Fardo">{t("form.units.purchase.fardo")}</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t("form.help.purchaseUnit")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.storageUnit")}
            </label>
            <select
              name="unidadeArmazenamento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              value={formData.unidadeArmazenamento}
              onChange={handleInputChange}
            >
              <option value="Unidade">{t("form.units.storage.unidade")}</option>
              <option value="Quilograma">{t("form.units.storage.quilograma")}</option>
              <option value="Grama">{t("form.units.storage.grama")}</option>
              <option value="Litro">{t("form.units.storage.litro")}</option>
              <option value="Mililitro">{t("form.units.storage.mililitro")}</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t("form.help.storageUnit")}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Setor de Produção {t("form.required")}
          </label>
          <select
            name="setorId"
            className={`w-full px-3 py-2 border ${
              formErrors.setorId ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500`}
            value={formData.setorId}
            onChange={handleInputChange}
          >
            <option value="">Selecione</option>
            {setores.map((setor) => (
              <option key={setor.id} value={setor.id}>
                {setor.nome}
              </option>
            ))}
          </select>
          {formErrors.setorId && (
            <p className="mt-1 text-sm text-red-600">{formErrors.setorId}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Todo produto deve estar vinculado a um setor de produção.
          </p>
        </div>

        {/* Transformation Factor */}
        {formData.unidadeArmazenamento !== formData.unidadeCompra && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.transformationFactor")} (opcional)
            </label>
            <input
              type="number"
              name="fatorTransformacaoPadrao"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder={`Ex: 1 ${getUnitTranslation(formData.unidadeCompra, 'purchase', 1)} = 10 ${getUnitTranslation(formData.unidadeArmazenamento, 'storage', 10)}`}
              value={formData.fatorTransformacaoPadrao}
              onChange={handleInputChange}
            />
            <p className="mt-1 text-xs text-gray-500">
              {`1 ${getUnitTranslation(formData.unidadeCompra, 'purchase', 1)} = ${formData.fatorTransformacaoPadrao || "___"} ${getUnitTranslation(formData.unidadeArmazenamento, 'storage', parseFloat(formData.fatorTransformacaoPadrao) || 1)}`}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.currentStock")} {t("form.required")}
          </label>
          <input
            type="number"
            name="estoqueAtual"
            min="0"
            className={`w-full px-3 py-2 border ${
              formErrors.estoqueAtual ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder={t("form.fields.currentStockPlaceholder")}
            value={formData.estoqueAtual}
            onChange={handleInputChange}
          />
          {formErrors.estoqueAtual && (
            <p className="mt-1 text-sm text-red-600">{formErrors.estoqueAtual}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.lowStock")}
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
              {t("form.fields.mediumStock")}
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
              {t("form.fields.highStock")}
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

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:space-x-3 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:w-auto"
          >
            {t("form.actions.cancel")}
          </button>
          <button
            type="submit"
            className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-dynamic hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:w-auto"
          >
            {t("form.actions.save")}
          </button>
        </div>
      </form>
    </BaseModalWithHeader>
  );
};

export default ItemFormModal;
