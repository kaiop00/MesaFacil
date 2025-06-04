import { useState } from "react";
import TableType from "@/features/config/components/TableType";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import { useToast } from "@/hooks/useToast";

const ConfigModal = ({ isOpen, onClose }) => {
  const { notify } = useToast();

  const [tableType, setTableType] = useState(null);
  const [qtd, setQtd] = useState("");

  const resetForm = () => {
    setTableType(null);
    setQtd("");
  };

  const validateForm = () => {
    if (!tableType) {
      notify("Selecione o tipo de mesa.", "error");
      return false;
    }

    const quantidade = Number(qtd);
    if (!quantidade || quantidade <= 0) {
      notify("Informe uma quantidade válida.", "error");
      return false;
    }

    return true;
  };

  const handleAdd = () => {
    if (!validateForm()) return;

    console.log("Mesas incluídas:", {
      tipo: tableType.value,
      quantidade: Number(qtd),
    });

    notify(`Incluídas ${qtd} mesas de ${tableType.label}`, "success");
    resetForm();
  };

  const handleSubmit = () => {
    // Aqui você pode salvar no banco ou enviar para o backend
    notify("Configurações salvas com sucesso!", "success");
    onClose();
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações"
      subTitle="Gerencie as configurações do Sistema"
      icon={Coffee}
    >
      <div className="p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0">
          <div className="w-full md:w-1/2">
            <TableType value={tableType} onChange={setTableType} />
          </div>

          <div className="w-full md:w-1/4">
            <label className="block mb-1 font-medium text-gray-700">Qtd</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:border-amber-500"
              placeholder="0"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              min={1}
            />
          </div>

          <div className="md:w-auto">
            <button
              onClick={handleAdd}
              className="bg-[#D9A23B] hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md w-full"
            >
              Incluir
            </button>
          </div>
        </div>
      </div>

      <div className="font-inter flex justify-between items-center px-6 py-4">
        <button
          onClick={onClose}
          className="cursor-pointer font-bold text-[#334155] px-4 py-2 rounded bg-[#F1F5F9] hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="cursor-pointer font-bold bg-[#D9A23B] text-white px-6 py-2 rounded hover:bg-yellow-600"
        >
          Salvar
        </button>
      </div>
    </BaseModalWithHeader>
  );
};

export default ConfigModal;
