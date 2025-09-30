import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, FileDocument } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";

const MovementsFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  movement = null,
  items = [],
  loading = false,
}) => {
  const { t } = useTranslation("movements");
  const { t: tItems } = useTranslation("items");
  
  // Function to translate unit names for display
  const translateUnit = (unitValue) => {
    if (!unitValue) return "";
    const unitKey = unitValue.toLowerCase();
    // Try storage units first, then purchase units
    return tItems(`form.units.storage.${unitKey}`, { defaultValue: 
      tItems(`form.units.purchase.${unitKey}`, { defaultValue: unitValue })
    });
  };
  
  const [formData, setFormData] = useState({
    itemId: "",
    unidadeArmazenamento: "",
    unidadeCompra: "",
    tipoMovimentacao: "",
    qtdAtual: "",
    qtd: "",
    novoSaldo: "",
    fatorTransformacao: "",
  });

  const [errors, setErrors] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState({
    item: false,
    tipoMovimentacao: false,
  });

  const isEditing = !!movement;

  // Movement types
  const movementTypes = [
    { value: "Entrada", label: t("form.movementTypes.entrada") },
    { value: "Saida", label: t("form.movementTypes.saida") },
    { value: "Ajuste", label: t("form.movementTypes.ajuste") },
    { value: "Transferencia", label: t("form.movementTypes.transferencia") },
  ];

  useEffect(() => {
    if (isOpen) {
      if (movement) {
        // Editing mode - populate form
        console.log(movement);
        setFormData({
          itemId: movement.itemId || "",
          unidadeArmazenamento: movement.unidadeArmazenamento || "",
          unidadeCompra: movement.unidadeCompra || "",
          // Ensure we use the correct field name from the movement object
          tipoMovimentacao: movement.tipoMovimentacao || "",
          qtdAtual: movement.saldoAtual || "",
          qtd: movement.quantidade || "",
          novoSaldo: movement.novoSaldo || "",
          fatorTransformacao: movement.fatorTransformacao?.toString() || "",
        });
      } else {
        // Creating mode - reset form
        setFormData({
          itemId: "",
          unidadeArmazenamento: "",
          unidadeCompra: "",
          tipoMovimentacao: "",
          qtdAtual: "",
          qtd: "",
          novoSaldo: "",
          fatorTransformacao: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, movement]);

  const handleInputChange = (field, value) => {
    // First, update the field that changed
    setFormData(prevFormData => {
      // Create the updated form data with the new value
      const updatedFormData = {
        ...prevFormData,
        [field]: value,
      };

      // Clear error for the field that changed
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: "",
        }));
      }

      // Calculate new balance when quantity or transformation factor changes
      if ((field === "qtd" || field === "fatorTransformacao") && updatedFormData.qtdAtual) {
        const currentQty = parseFloat(updatedFormData.qtdAtual) || 0;
        const newQty = field === "qtd" ? parseFloat(value) || 0 : parseFloat(updatedFormData.qtd) || 0;
        const factor = field === "fatorTransformacao" ? parseFloat(value) || 1 : parseFloat(updatedFormData.fatorTransformacao) || 1;
        
        // Apply transformation factor if units are different and factor is provided
        const effectiveQty = updatedFormData.unidadeArmazenamento !== updatedFormData.unidadeCompra && factor
          ? newQty * factor
          : newQty;
          
        let newBalance = 0;

        switch (updatedFormData.tipoMovimentacao) {
          case movementTypes[0].value: // Entrada
            newBalance = currentQty + effectiveQty;
            break;
          case movementTypes[1].value: // Saída
            newBalance = currentQty - effectiveQty;
            break;
          case movementTypes[2].value: // Ajuste
            newBalance = effectiveQty;
            break;
          default:
            newBalance = currentQty;
        }

        // Return the updated form data with the new balance
        return {
          ...updatedFormData,
          novoSaldo: newBalance.toFixed(2),
          // Auto-calculate factor if not set and units are different
          ...(field === "qtd" && 
              updatedFormData.unidadeArmazenamento !== updatedFormData.unidadeCompra && 
              !updatedFormData.fatorTransformacao && {
                fatorTransformacao: "1.00"
              }
          )
        };
      }

      return updatedFormData;
    });
  };

  const handleItemSelect = (item) => {
    setFormData((prev) => ({
      ...prev,
      itemId: item.id,
      unidadeArmazenamento: item.unidadeArmazenamento || "",
      unidadeCompra: item.unidadeCompra || "",
      qtdAtual: item.estoqueAtual?.toString() || "",
    }));
    setIsDropdownOpen((prev) => ({ ...prev, item: false }));
  };

  const handleMovementTypeSelect = (type) => {
    setFormData((prev) => ({
      ...prev,
      tipoMovimentacao: type.value,
    }));
    setIsDropdownOpen((prev) => ({ ...prev, tipoMovimentacao: false }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.itemId) {
      newErrors.itemId = t("form.validation.itemRequired");
    }
    if (!formData.tipoMovimentacao) {
      newErrors.tipoMovimentacao = t("form.validation.movementTypeRequired");
    }
    if (!formData.qtd) {
      newErrors.qtd = t("form.validation.quantityRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit?.(formData);
  };

  const handleCancel = () => {
    onClose?.();
  };

  const selectedItem = items.find((item) => item.id === formData.itemId);
  const selectedMovementType = movementTypes.find(
    (type) => type.value === formData.tipoMovimentacao,
  );

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleCancel}
      title={isEditing ? t("form.titleEdit") : t("form.titleCreate")}
      subTitle={isEditing
        ? t("form.subtitleEdit")
        : t("form.subtitleCreate")}
      icon={FileDocument}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("form.fields.item")}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setIsDropdownOpen((prev) => ({ ...prev, item: !prev.item }))
                }
                className={`w-full px-3 py-3 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  errors.itemId ? "border-red-500" : "border-gray-300"
                }`}
              >
                <span
                  className={selectedItem ? "text-gray-900" : "text-gray-500"}
                >
                  {selectedItem ? selectedItem.nome : t("form.fields.itemPlaceholder")}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {isDropdownOpen.item && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {item.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.itemId && (
              <p className="mt-1 text-sm text-red-600">{errors.itemId}</p>
            )}
          </div>

          {/* Storage and Purchase Units */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.fields.storageUnit")}
              </label>
              <input
                type="text"
                value={translateUnit(formData.unidadeArmazenamento)}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.fields.purchaseUnit")}
              </label>
              <input
                type="text"
                value={translateUnit(formData.unidadeCompra)}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          {/* Transformation Factor (when units are different) */}
          {formData.unidadeArmazenamento && 
           formData.unidadeCompra && 
           formData.unidadeArmazenamento !== formData.unidadeCompra && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.fields.transformationFactor")} ({translateUnit(formData.unidadeCompra)} → {translateUnit(formData.unidadeArmazenamento)})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.fatorTransformacao || ""}
                onChange={(e) =>
                  handleInputChange("fatorTransformacao", e.target.value)
                }
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder={`Ex: 1 ${translateUnit(formData.unidadeCompra)} = 0.05 ${translateUnit(formData.unidadeArmazenamento)}`}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                {`1 ${translateUnit(formData.unidadeCompra)} = ${formData.fatorTransformacao || '1.00'} ${translateUnit(formData.unidadeArmazenamento)}`}
              </p>
            </div>
          )}

          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("form.fields.movementType")}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setIsDropdownOpen((prev) => ({
                    ...prev,
                    tipoMovimentacao: !prev.tipoMovimentacao,
                  }))
                }
                className={`w-full px-3 py-3 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  errors.tipoMovimentacao ? "border-red-500" : "border-gray-300"
                }`}
              >
                <span
                  className={
                    selectedMovementType ? "text-gray-900" : "text-gray-500"
                  }
                >
                  {selectedMovementType
                    ? selectedMovementType.label
                    : t("form.fields.itemPlaceholder")}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {isDropdownOpen.tipoMovimentacao && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  {movementTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleMovementTypeSelect(type)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.tipoMovimentacao && (
              <p className="mt-1 text-sm text-red-600">
                {errors.tipoMovimentacao}
              </p>
            )}
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.fields.currentQty")}
              </label>
              <input
                type="number"
                value={formData.qtdAtual}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.fields.quantity")}
              </label>
              <input
                type="number"
                step="1"
                value={formData.qtd}
                onChange={(e) => handleInputChange("qtd", e.target.value)}
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  errors.qtd ? "border-red-500" : "border-gray-300"
                }`}
                placeholder={t("form.fields.quantityPlaceholder")}
              />
              {errors.qtd && (
                <p className="mt-1 text-sm text-red-600">{errors.qtd}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.fields.newBalance")}
              </label>
              <input
                type="number"
                value={formData.novoSaldo}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            {t("form.actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-dynamic hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("form.actions.saving") : t("form.actions.save")}
          </button>
        </div>
      </form>
    </BaseModalWithHeader>
  );
};

export default MovementsFormModal;
