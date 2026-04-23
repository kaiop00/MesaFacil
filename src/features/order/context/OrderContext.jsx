/* eslint-disable react-refresh/only-export-components */

// /features/order/context/OrderContext.jsx

import { createContext, useContext, useState } from "react";
import { useCallback, useMemo } from "react";

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [items, setItems] = useState([]);

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, { ...item, quantity: 1 }]);
  }, []);

  const updateItemQuantity = useCallback((itemId, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearOrder = useCallback(() => {
    setSelectedTable(null);
    setItems((prev) => (prev.length > 0 ? [] : prev));
  }, []);

  const value = useMemo(
    () => ({
      selectedTable,
      setSelectedTable,
      items,
      addItem,
      updateItemQuantity,
      removeItem,
      clearOrder,
    }),
    [selectedTable, items, addItem, updateItemQuantity, removeItem, clearOrder]
  );

  return (
    <OrderContext.Provider value={value}>
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
