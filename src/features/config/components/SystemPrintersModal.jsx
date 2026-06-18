import { useEffect, useState } from 'react';
import { fetchAvailablePrinters, getPrintServiceBaseUrl } from '@/services/printService';

export default function SystemPrintersModal({ isOpen, onClose, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    async function fetchPrinters() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAvailablePrinters();
        if (mounted) setPrinters(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn(err);
        if (mounted) {
          setError(
            `Não foi possível carregar as impressoras do sistema. Verifique se o serviço local de impressão está ativo em ${getPrintServiceBaseUrl()} e se a dependência de impressão está disponível.`
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchPrinters();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Impressoras do sistema</h3>
          <button onClick={onClose} className="text-sm text-gray-500">Fechar</button>
        </div>

        {loading && <p>Carregando impressoras do sistema...</p>}
        {error && (
          <div className="mb-4 rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            <p className="mt-2 text-xs text-red-600">Se o serviço estiver ativo, tente recarregar o modal. Caso contrário, inicie o serviço em apps/print-service com npm run dev.</p>
          </div>
        )}

        {!loading && printers.length === 0 && !error && (
          <div className="rounded border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
            Nenhuma impressora foi encontrada no S.O. deste computador.
            <div className="mt-1 text-xs text-amber-700">Se existir uma impressora instalada, verifique o agente local e tente novamente.</div>
          </div>
        )}

        <ul className="max-h-56 space-y-2 overflow-auto">
          {printers.map((p) => (
            <li key={p.name} className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <div className="font-medium">{p.name}</div>
                {p.location && <div className="text-xs text-gray-500">{p.location}</div>}
              </div>
              <div>
                <button
                  onClick={() => {
                    onSelect(p.name);
                    onClose();
                  }}
                  className="rounded bg-amber-500 px-3 py-1 text-sm font-medium text-white"
                >
                  Selecionar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
