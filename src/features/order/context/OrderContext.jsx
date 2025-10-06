// /features/order/context/OrderContext.jsx

import { createContext, useContext, useState } from "react";

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => [...prev, { ...item, quantity: 1 }]);
  };

  const updateItemQuantity = (itemId, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearOrder = () => {
    setSelectedTable(null);
    setItems([]);
  };

  return (
    <OrderContext.Provider
      value={{
        selectedTable,
        setSelectedTable,
        items,
        addItem,
        updateItemQuantity,
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
