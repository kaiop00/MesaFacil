// src/features/order/components/OrderItemsList.jsx
import React, { useState } from "react";
import { TrashFull, CaretDownMd } from "react-coolicons";

const OrderItemsList = ({ items, updateItemQuantity, removeItem, readOnly = false }) => {
    const [expandedItemIds, setExpandedItemIds] = useState([]);

    const toggleExpand = (id) => {
        setExpandedItemIds((prev) =>
            prev.includes(id)
                ? prev.filter((itemId) => itemId !== id)
                : [...prev, id]
        );
    };

    return (
        <div className="space-y-4">
            {items.map((item) => {
                const isExpanded = expandedItemIds.includes(item.id);
                return (
                    <div
                        key={item.id}
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
                                        onClick={() => updateItemQuantity(item.id, -1)}
                                        className="text-primary-dynamic px-2 cursor-pointer text-2xl"
                                    >
                                        -
                                    </button>
                                    <span className="px-4">{item.quantity}</span>
                                    <button
                                        onClick={() => updateItemQuantity(item.id, 1)}
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
                                onClick={() => toggleExpand(item.id)}
                            />

                            {/* Remover */}
                            {!readOnly && (
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-500 cursor-pointer"
                                >
                                    <TrashFull />
                                </button>
                            )}
                        </div>

                        {/* Bloco expandido */}
                        {isExpanded && (
                            <div className="mt-4 text-gray-700">
                                {item.descricao && (
                                    <p className="mb-2 text-xs">{item.descricao}</p>
                                )}

                                {item.alergias?.length > 0 && (
                                    <>
                                        <p className="font-bold mb-1">Alergias</p>
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
                    Nenhum item adicionado ainda
                </div>
            )}
        </div>
    );
};

export default OrderItemsList;
