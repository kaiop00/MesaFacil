import { useEffect, useState } from "react";
import TableType from "@/features/config/components/TableType";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Coffee } from "react-coolicons";
import { useToast } from "@/hooks/useToast";
import { create, getAll } from "@/services/firebase/firestoreService";
import { useAuth } from "@/contexts/AuthContext";
import { serverTimestamp } from "firebase/firestore";

const ConfigModal = ({ isOpen, onClose }) => {
  const { notify } = useToast();
  const { idRestaurante } = useAuth();

  const [tableType, setTableType] = useState(null);
  const [qtd, setQtd] = useState("");
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const carregarMesas = async () => {
    if (!idRestaurante) return;
    setLoading(true);
    try {
      const data = await getAll(idRestaurante, "mesas", { orderByField: "numero" });
      setMesas(data);
    } catch (error) {
      console.error(error);
      notify("Erro ao carregar mesas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) carregarMesas();
  }, [isOpen, idRestaurante]);

  const handleAdd = () => {
    if (!validateForm()) return;

    const quantidade = Number(qtd);
    const maiorNumero = mesas.length ? Math.max(...mesas.map((m) => m.numero)) : 0;

    const novasMesas = Array.from({ length: quantidade }, (_, i) => ({
      id: `nova-${Date.now()}-${i}`,
      numero: maiorNumero + i + 1,
      tipo: tableType.value,
      status: "livre",
      nova: true,
    }));

    setMesas((prev) => [...prev, ...novasMesas]);
    resetForm();
  };

  const handleSubmit = async () => {
    const novas = mesas.filter((mesa) => mesa.nova);
    if (!novas.length) {
      notify("Nenhuma nova mesa para salvar.", "info");
      return;
    }

    try {
      for (const mesa of novas) {
        const { numero, tipo, status } = mesa;
        await create(idRestaurante, "mesas", {
          numero,
          tipo,
          status,
          criadoEm: serverTimestamp(),
        });
      }
      notify("Mesas salvas com sucesso!", "success");
      onClose();
    } catch (error) {
      console.error(error);
      notify("Erro ao salvar mesas", "error");
    }
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

        <div className="flex justify-end">
          <button className="bg-[#D9A23B] hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md">
            Baixar Todos os QR Codes
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 font-medium">
              <tr>
                <th className="px-4 py-2">Numero</th>
                <th className="px-4 py-2">Tipo de Mesa</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((mesa, index) => (
                <tr
                  key={mesa.id || `${mesa.numero}-${mesa.tipo}`}
                  className={`${index % 2 === 1 ? "bg-gray-50" : ""} ${mesa.nova ? "bg-yellow-50" : ""}`}
                >
                  <td className="px-4 py-2">{mesa.numero}</td>
                  <td className="px-4 py-2">{mesa.tipo} Cadeiras</td>
                  <td className="px-4 py-2">
                    <button className="bg-gray-100 text-sm px-3 py-1 rounded hover:bg-gray-200 flex items-center space-x-1">
                      <span>🧾</span>
                      <span>Baixar QR Code</span>
                    </button>
                  </td>
                </tr>
              ))}
              {mesas.length === 0 && !loading && (
                <tr>
                  <td colSpan="3" className="text-center py-4 text-gray-500">
                    Nenhuma mesa cadastrada.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="3" className="text-center py-4 text-gray-400">
                    Carregando mesas...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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