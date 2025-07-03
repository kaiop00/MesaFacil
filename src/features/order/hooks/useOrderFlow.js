import { useState } from "react";

export const useOrderFlow = () => {
  const [isNewOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [isAddItemsModalOpen, setAddItemsModalOpen] = useState(false);

  const openNewOrderModal = () => setNewOrderModalOpen(true);
  const closeNewOrderModal = () => setNewOrderModalOpen(false);

  const openAddItemsModal = () => setAddItemsModalOpen(true);
  const closeAddItemsModal = () => setAddItemsModalOpen(false);

  return {
    isNewOrderModalOpen,
    openNewOrderModal,
    closeNewOrderModal,
    isAddItemsModalOpen,
    openAddItemsModal,
    closeAddItemsModal
  };
};
