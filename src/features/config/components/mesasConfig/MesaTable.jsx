import { QrCode, TrashFull } from "react-coolicons";

const MesaTable = ({ mesas, loading, onDelete, onQrCodeClick }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 font-medium">
                <tr>
                    <th className="px-4 py-2">Numero</th>
                    <th className="px-4 py-2">Tipo de Mesa</th>
                    <th className="px-4 py-2 text-center">Ações</th>
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
                            <div className="flex justify-around gap-2 items-center">
                                <button
                                    className="bg-gray-100 text-sm px-3 py-1 rounded hover:bg-gray-200 flex items-center space-x-1 cursor-pointer"
                                    onClick={() => onQrCodeClick(mesa)}
                                >
                                    <span><QrCode className="w-3 h-3" /></span>
                                    <span>QRCode</span>
                                </button>
                                <button
                                    onClick={() => onDelete(mesa)}
                                    className="text-red-600 hover:underline text-sm cursor-pointer"
                                >
                                    <TrashFull className="w-4 h-4" />
                                </button>
                            </div>
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
);

export default MesaTable;
