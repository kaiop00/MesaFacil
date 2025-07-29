import { useState, useEffect } from "react";
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
    { value: "entrada", label: "Entrada" },
    { value: "saida", label: "Saída" },
    { value: "ajuste", label: "Ajuste" },
    { value: "transferencia", label: "Transferência" },
  ];

  useEffect(() => {
    if (isOpen) {
      if (movement) {
        // Editing mode - populate form
        setFormData({
          itemId: movement.itemId || "",
          unidadeArmazenamento: movement.unidadeArmazenamento || "",
          unidadeCompra: movement.unidadeCompra || "",
          tipoMovimentacao: movement.tipoMovimentacao || "",
          qtdAtual: movement.qtdAtual || "",
          qtd: movement.qtd || "",
          novoSaldo: movement.novoSaldo || "",
          fatorTransformacao: movement.fatorTransformacao || "",
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    // Calculate new balance when quantity changes
    if (field === "qtd" && formData.qtdAtual) {
      const currentQty = parseFloat(formData.qtdAtual) || 0;
      const newQty = parseFloat(value) || 0;
      let newBalance = 0;

      switch (formData.tipoMovimentacao) {
        case "entrada":
          newBalance = currentQty + newQty;
          break;
        case "saida":
          newBalance = currentQty - newQty;
          break;
        case "ajuste":
          newBalance = newQty;
          break;
        default:
          newBalance = currentQty;
      }

      setFormData((prev) => ({
        ...prev,
        novoSaldo: newBalance.toString(),
      }));
    }
  };

  const handleItemSelect = (item) => {
    setFormData((prev) => ({
      ...prev,
      itemId: item.id,
      unidadeArmazenamento: item.unidadeArmazenamento || "",
      unidadeCompra: item.unidadeCompra || "",
      qtdAtual: item.saldo?.toString() || "",
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
      newErrors.itemId = "Item é obrigatório";
    }
    if (!formData.tipoMovimentacao) {
      newErrors.tipoMovimentacao = "Tipo de movimentação é obrigatório";
    }
    if (!formData.qtd) {
      newErrors.qtd = "Quantidade é obrigatória";
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
      title={isEditing ? "Atualizar Movimentação" : "Nova Movimentação"}
      subTitle={isEditing
        ? "Preencha as informações para editar"
        : "Preencha as informações para adicionar"}
      icon={FileDocument}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item
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
                  {selectedItem ? selectedItem.nome : "Escolha uma Opção"}
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
                Unidade de Armazenamento
              </label>
              <input
                type="text"
                value={formData.unidadeArmazenamento}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade Compra
              </label>
              <input
                type="text"
                value={formData.unidadeCompra}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          {/* Transformation Factor (for editing mode when units are different) */}
          {isEditing &&
            formData.unidadeArmazenamento !== formData.unidadeCompra && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fator de Transformação
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fatorTransformacao}
                  onChange={(e) =>
                    handleInputChange("fatorTransformacao", e.target.value)
                  }
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Digite o fator de transformação"
                />
              </div>
            )}

          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Movimentação
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
                    : "Escolha uma Opção"}
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
                Qtd Atual
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
                Qtd
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.qtd}
                onChange={(e) => handleInputChange("qtd", e.target.value)}
                className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  errors.qtd ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Digite a quantidade"
              />
              {errors.qtd && (
                <p className="mt-1 text-sm text-red-600">{errors.qtd}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo Saldo
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-dynamic hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </BaseModalWithHeader>
  );
};

export default MovementsFormModal;
