// /features/order/context/OrderContext.jsx

import { createContext, useContext, useState } from "react";

const OrderContext = createContext();

function buildOrderItemKey(item) {
  const descricao = (item.descricao || item.observacao || item.observacoes || "").trim();
  return `${item.id}::${descricao.toLowerCase()}`;
}

export const OrderProvider = ({ children }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => {
      const itemKey = buildOrderItemKey(item);
      const index = prev.findIndex((currentItem) => (currentItem.lineKey || buildOrderItemKey(currentItem)) === itemKey);
      const quantityToAdd = item.quantity ?? item.quantidade ?? 1;

      if (index !== -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: (updated[index].quantity || 1) + quantityToAdd,
        };
        return updated;
      }

      return [...prev, {
        ...item,
        lineId: item.lineId || `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        lineKey: itemKey,
        quantity: quantityToAdd,
        descricao: (item.descricao || item.observacao || item.observacoes || "").trim(),
        observacao: (item.observacao || item.descricao || item.observacoes || "").trim(),
      }];
    });
  };

  const updateItemQuantity = (itemId, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        (item.lineId || item.id) === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const updateItemObservation = (itemId, observation) => {
    const descricao = (observation || "").trim();

    setItems((prev) =>
      prev.map((item) => {
        if ((item.lineId || item.id) !== itemId) {
          return item;
        }

        const updatedItem = {
          ...item,
          descricao,
          observacao: descricao,
        };

        updatedItem.lineKey = buildOrderItemKey(updatedItem);
        return updatedItem;
      })
    );
  };

  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => (item.lineId || item.id) !== itemId));
  };

  const clearOrder = () => {
    setSelectedTable((prev) => (prev === null ? prev : null));
    setItems((prev) => (prev.length === 0 ? prev : []));
  };

  return (
    <OrderContext.Provider
      value={{
        selectedTable,
        setSelectedTable,
        items,
        addItem,
        updateItemQuantity,
        updateItemObservation,
        removeItem,
        clearOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderContext deve ser usado dentro de OrderProvider");
  }
  return context;
};
