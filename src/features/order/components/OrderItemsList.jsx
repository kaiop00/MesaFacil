// src/features/order/components/OrderItemsList.jsx
import React, { useState } from "react";
import { TrashFull, CaretDownMd } from "react-coolicons";
import { useTranslation } from "react-i18next";

const OrderItemsList = ({
    items,
    updateItemQuantity,
    updateItemObservation,
    removeItem,
    onCancelItem,
    readOnly = false,
}) => {
    const { t } = useTranslation('order');
    const [expandedItemIds, setExpandedItemIds] = useState([]);
    const [observationDrafts, setObservationDrafts] = useState({});

    const toggleExpand = (id) => {
        setExpandedItemIds((prev) =>
            prev.includes(id)
                ? prev.filter((itemId) => itemId !== id)
                : [...prev, id]
        );
    };

    const handleOpenEditor = (itemKey, currentValue) => {
        setObservationDrafts((prev) => ({
            ...prev,
            [itemKey]: currentValue || "",
        }));
    };

    const handleSaveObservation = (itemId, itemKey) => {
        if (typeof updateItemObservation === 'function') {
            updateItemObservation(itemId, observationDrafts[itemKey] || "");
        }
    };

    return (
        <div className="space-y-4">
            {items.map((item, index) => {
                const itemKey = item.lineId || item.cartItemId || `${item.id}-${index}`;
                const isExpanded = expandedItemIds.includes(itemKey);
                return (
                    <div
                        key={itemKey}
                        className="border border-gray-200 p-4 rounded-xl"
                    >
                        <div className="flex items-center justify-between">
                            {/* Imagem */}
                            <img
                                src={item.imagemUrl}
                                alt={item.nome}
                                className="w-30 h-15 object-cover rounded-lg"
                            />

                            {/* Info */}
                            <div className="flex-1 px-4">
                                <div className="font-bold">
                                    {item.quantity}x - {item.nome}
                                </div>
                                <div className="text-gray-500">
                                    R$ {Number(item.price).toFixed(2)}
                                </div>
                            </div>

                            {/* Controle quantidade */}
                            {!readOnly && (
                                <div className="flex items-center bg-gray-50 rounded-md px-2 py-1">
                                    <button
                                        onClick={() => updateItemQuantity(item.lineId || item.id, -1)}
                                        className="text-primary-dynamic px-2 cursor-pointer text-2xl"
                                    >
                                        -
                                    </button>
                                    <span className="px-4">{item.quantity}</span>
                                    <button
                                        onClick={() => updateItemQuantity(item.lineId || item.id, 1)}
                                        className="text-primary-dynamic px-2 cursor-pointer text-2xl"
                                    >
                                        +
                                    </button>
                                </div>
                            )}

                            {/* Toggle expand */}
                            <CaretDownMd
                                className={`ml-5 mr-5 cursor-pointer transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                    }`}
                                onClick={() => toggleExpand(itemKey)}
                            />

                            {/* Cancelar item da comanda */}
                            {typeof onCancelItem === "function" && (
                                <button
                                    onClick={() => onCancelItem(item, index)}
                                    className="mr-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
                                >
                                    Cancelar item
                                </button>
                            )}

                            {/* Remover */}
                            {!readOnly && (
                                <button
                                    onClick={() => removeItem(item.lineId || item.id)}
                                    className="text-red-500 cursor-pointer"
                                >
                                    <TrashFull />
                                </button>
                            )}
                        </div>

                        {/* Item observations - always visible (important for iFood orders) */}
                        {item.descricao && (
                            <p className="mt-2 text-xs text-gray-600 font-bold bg-gray-50 px-3 py-1.5 rounded-md">
                                📝 Observações: {item.descricao}
                            </p>
                        )}

                        {/* iFood item options (complementos) - always visible */}
                        {item.ifoodData?.options && item.ifoodData.options.length > 0 && (
                            <div className="mt-1.5 pl-3 border-l-2 border-orange-200">
                                {item.ifoodData.options.map((option, idx) => (
                                    <p key={idx} className="text-xs text-gray-600">
                                        + {option.quantity || 1}x {option.name}
                                        {option.price > 0 && (
                                            <span className="text-gray-400 ml-1">
                                                (R$ {Number(option.price).toFixed(2)})
                                            </span>
                                        )}
                                    </p>
                                ))}
                            </div>
                        )}

                        {/* Bloco expandido */}
                        {isExpanded && (
                            <div className="mt-4 text-gray-700">

                                {!readOnly && typeof updateItemObservation === 'function' && (
                                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Observação deste item
                                        </label>
                                        <textarea
                                            value={observationDrafts[itemKey] ?? item.descricao ?? ""}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setObservationDrafts((prev) => ({
                                                    ...prev,
                                                    [itemKey]: value,
                                                }));
                                            }}
                                            onFocus={() => handleOpenEditor(itemKey, item.descricao)}
                                            placeholder="Ex: gelo e limão, sem cebola, ponto da carne..."
                                            className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-dynamic focus:ring-1 focus:ring-primary-dynamic"
                                        />
                                        <div className="mt-2 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setObservationDrafts((prev) => ({ ...prev, [itemKey]: "" }))}
                                                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300"
                                            >
                                                Limpar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveObservation(item.lineId || item.id, itemKey)}
                                                className="rounded-md bg-primary-dynamic px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                                            >
                                                Salvar observação
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {item.alergias?.length > 0 && (
                                    <>
                                        <p className="font-bold mb-1">{t('cardapio.ingredients')}</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {item.alergias.map((alergia, idx) => (
                                                <div
                                                    key={idx}
                                                    className="px-3 py-1 bg-gray-100 rounded-md font-semibold text-xs"
                                                >
                                                    {alergia}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {items.length === 0 && (
                <div className="h-32 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                    {t('modals.orderDetail.noItems')}
                </div>
            )}
        </div>
    );
};

export default OrderItemsList;
