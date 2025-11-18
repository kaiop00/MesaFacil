import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
    getIfoodItems,
    getMesaFacilCardapioItems,
    getIfoodItemMappings,
    saveIfoodItemMappings,
} from "../services/ifoodItemMappingService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { CheckboxCheck, TriangleWarning, Link as LinkIcon, Cloud } from "react-coolicons";

const IfoodItemMappingModal = ({ isOpen, onClose }) => {
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [ifoodItems, setIfoodItems] = useState([]);
    const [mesaFacilItems, setMesaFacilItems] = useState([]);
    const [mappings, setMappings] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [catalogSource, setCatalogSource] = useState(null); // 'catalog' or 'orders'

    const loadData = async () => {
        try {
            setLoading(true);
            
            const [ifoodItemsData, mesaFacilItemsData, mappingsData] = await Promise.all([
                getIfoodItems(idRestaurante),
                getMesaFacilCardapioItems(idRestaurante),
                getIfoodItemMappings(idRestaurante),
            ]);
            
            setIfoodItems(ifoodItemsData);
            setMesaFacilItems(mesaFacilItemsData);
            setMappings(mappingsData);
            
            // Set catalog source for UI feedback
            if (ifoodItemsData.length > 0) {
                setCatalogSource(ifoodItemsData[0].source || 'unknown');
            }
        } catch (error) {
            console.error("Error loading mapping data:", error);
            notify("Erro ao carregar dados de mapeamento", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, idRestaurante]);

    const handleMappingChange = (ifoodItemId, mesaFacilItemId) => {
        setMappings(prev => ({
            ...prev,
            [ifoodItemId]: mesaFacilItemId || null,
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Remove null/empty mappings
            const cleanedMappings = Object.entries(mappings).reduce((acc, [key, value]) => {
                if (value) {
                    acc[key] = value;
                }
                return acc;
            }, {});
            
            await saveIfoodItemMappings(idRestaurante, cleanedMappings);
            notify("Mapeamentos salvos com sucesso!", "success");
            onClose();
        } catch (error) {
            console.error("Error saving mappings:", error);
            notify("Erro ao salvar mapeamentos", "error");
        } finally {
            setSaving(false);
        }
    };

    const getMappedItemName = (mesaFacilItemId) => {
        const item = mesaFacilItems.find(i => i.id === mesaFacilItemId);
        return item ? item.nome : "Item não encontrado";
    };

    const filteredIfoodItems = ifoodItems.filter(item => {
        if (!searchTerm) return true;
        return item.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const mappedCount = Object.values(mappings).filter(Boolean).length;
    const totalCount = ifoodItems.length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Mapeamento de Itens do iFood
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Vincule os itens do iFood aos itens do seu cardápio no MesaFacil
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>
                    
                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                        <div className="bg-blue-50 rounded-lg px-4 py-2">
                            <span className="text-sm text-gray-600">Total de itens:</span>
                            <span className="ml-2 font-semibold text-blue-600">{totalCount}</span>
                        </div>
                        <div className="bg-green-50 rounded-lg px-4 py-2">
                            <span className="text-sm text-gray-600">Mapeados:</span>
                            <span className="ml-2 font-semibold text-green-600">{mappedCount}</span>
                        </div>
                        <div className="bg-yellow-50 rounded-lg px-4 py-2">
                            <span className="text-sm text-gray-600">Pendentes:</span>
                            <span className="ml-2 font-semibold text-yellow-600">{totalCount - mappedCount}</span>
                        </div>
                        {catalogSource && (
                            <div className={`rounded-lg px-4 py-2 flex items-center gap-2 ${
                                catalogSource === 'catalog' 
                                    ? 'bg-purple-50' 
                                    : 'bg-orange-50'
                            }`}>
                                <Cloud className={`w-4 h-4 ${
                                    catalogSource === 'catalog' 
                                        ? 'text-purple-600' 
                                        : 'text-orange-600'
                                }`} />
                                <span className={`text-sm font-medium ${
                                    catalogSource === 'catalog' 
                                        ? 'text-purple-600' 
                                        : 'text-orange-600'
                                }`}>
                                    {catalogSource === 'catalog' ? 'Catálogo da API' : 'Itens de Pedidos'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <LoadingSpinnerDynamic size={10} />
                        </div>
                    ) : (
                        <>
                            {/* Controls */}
                            <div className="mb-4 flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Buscar item do iFood..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-dynamic"
                                />
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Como funciona</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    {catalogSource === 'catalog' ? (
                                        <>
                                            <li>• ✨ Itens carregados diretamente do <strong>catálogo do iFood via API</strong></li>
                                            <li>• Todos os itens do seu cardápio no iFood estão disponíveis para mapeamento</li>
                                        </>
                                    ) : (
                                        <li>• Itens extraídos dos pedidos já recebidos do iFood</li>
                                    )}
                                    <li>• Vincule cada item do iFood a um item do seu cardápio no MesaFacil</li>
                                    <li>• Itens mapeados terão controle de estoque e ingredientes aplicados automaticamente</li>
                                    <li>• Itens não mapeados continuarão funcionando, mas sem controle de estoque</li>
                                </ul>
                            </div>

                            {/* Mapping List */}
                            {ifoodItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <TriangleWarning className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        Nenhum item do iFood encontrado.
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Os itens aparecerão aqui após você receber pedidos do iFood.
                                    </p>
                                </div>
                            ) : filteredIfoodItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-600">
                                        Nenhum item encontrado com "{searchTerm}"
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredIfoodItems.map((ifoodItem) => {
                                        const mappedId = mappings[ifoodItem.id];
                                        const isMapped = !!mappedId;
                                        
                                        return (
                                            <div
                                                key={ifoodItem.id}
                                                className={`border rounded-lg p-4 ${
                                                    isMapped ? "border-green-300 bg-green-50" : "border-gray-300 bg-white"
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* iFood Item Info */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-gray-900">
                                                                {ifoodItem.name}
                                                            </h4>
                                                            {isMapped && (
                                                                <CheckboxCheck className="w-5 h-5 text-green-600" />
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                                            <p>ID: {ifoodItem.id}</p>
                                                            {ifoodItem.externalCode && (
                                                                <p>Código Externo: {ifoodItem.externalCode}</p>
                                                            )}
                                                            <p>Preço: R$ {(ifoodItem.price / 100).toFixed(2)}</p>
                                                            <p className="text-blue-600">
                                                                Aparece em {ifoodItem.orderCount} pedido(s)
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Mapping Arrow */}
                                                    <div className="flex items-center">
                                                        <LinkIcon className="w-6 h-6 text-gray-400" />
                                                    </div>

                                                    {/* MesaFacil Item Selector */}
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Item do MesaFacil
                                                        </label>
                                                        <select
                                                            value={mappedId || ""}
                                                            onChange={(e) => handleMappingChange(ifoodItem.id, e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-dynamic"
                                                        >
                                                            <option value="">Selecione um item...</option>
                                                            {mesaFacilItems.map((mfItem) => (
                                                                <option key={mfItem.id} value={mfItem.id}>
                                                                    {mfItem.nome} - R$ {(mfItem.valor || 0).toFixed(2)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {mappedId && (
                                                            <p className="text-xs text-green-600 mt-1">
                                                                ✓ Mapeado para: {getMappedItemName(mappedId)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? "Salvando..." : "Salvar Mapeamentos"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IfoodItemMappingModal;
