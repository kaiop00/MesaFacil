import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { getAll, create, update, remove } from "@/services/firebase/firestoreService";
import CardHeader from "@/components/CardHeader";
import MovementsTable from "../components/MovementsTable";
import MovementsFormModal from "../components/MovementsFormModal";
import MovementDetailsModal from "../components/MovementDetailsModal";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

const MovementsPage = () => {
  const { t } = useTranslation("movements");
  const { idRestaurante } = useAuth();
  const [allMovements, setAllMovements] = useState([]);
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Load movements from Firestore
  const loadMovements = useCallback(async () => {
    if (!idRestaurante) return;
    
    setLoading(true);
    try {
      const movementsData = await getAll(idRestaurante, 'movimentos', {
        orderByField: 'createdAt',
        order: 'desc'
      });
      
      setAllMovements(movementsData);
    } catch (err) {
      setError(t("page.errorLoading"));
      console.error("Error loading movements:", err);
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, t]);

  // Filter and paginate movements based on search and pagination
  useEffect(() => {
    // Filter movements based on search term
    let filteredMovements = allMovements;
    if (searchTerm) {
      filteredMovements = allMovements.filter((movement) =>
        movement.itemNome.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Simulate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

    setMovements(paginatedMovements);
    setTotalItems(filteredMovements.length);
  }, [allMovements, currentPage, itemsPerPage, searchTerm]);

  // Load items from Firestore
  const loadItems = useCallback(async () => {
    if (!idRestaurante) return;

    try {
      setItemsLoading(true);
      const itemsData = await getAll(idRestaurante, 'itens', {
        orderByField: 'nome',
        order: 'asc'
      });
      setItems(itemsData);
    } catch (error) {
      console.error("Error loading items:", error);
      setError(t("page.errorLoadingItems"));
    } finally {
      setItemsLoading(false);
    }
  }, [idRestaurante, t]);

  // Load data on component mount
  useEffect(() => {
    loadMovements();
    loadItems();
  }, [loadMovements, loadItems]);

  // Handle table actions
  const handleView = (movement) => {
    setSelectedMovement(movement);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (movement) => {
    setSelectedMovement(movement);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (movement) => {
    if (
      window.confirm(
        t("page.deleteConfirm", { itemName: movement.itemNome }),
      )
    ) {
      try {
        setLoading(true);
        
        // Delete from Firestore
        await remove(idRestaurante, 'movimentos', movement.id);

        // Remove from local state
        setAllMovements((prev) => prev.filter((m) => m.id !== movement.id));

        alert(t("page.deleteSuccess"));
      } catch (err) {
        console.error("Error deleting movement:", err);
        setError(t("page.errorDeleting"));
        console.error("Error deleting movement:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreate = () => {
    setSelectedMovement(null);
    setIsFormModalOpen(true);
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    setModalLoading(true);

    try {
      const selectedItem = items.find((item) => item.id === formData.itemId);
      
      // Prepare movement data for Firestore
      const movementData = {
        // Item reference
        itemId: formData.itemId,
        itemNome: selectedItem?.nome || "",
        
        // Movement details
        tipoMovimentacao: formData.tipoMovimentacao,
        quantidade: parseFloat(formData.qtd) || 0,
        saldoAtual: parseFloat(formData.qtdAtual) || 0,
        novoSaldo: parseFloat(formData.novoSaldo) || 0,
        
        // Units
        unidadeArmazenamento: formData.unidadeArmazenamento || "",
        unidadeCompra: formData.unidadeCompra || "",
        
        // Transformation factor (if applicable)
        fatorTransformacao: formData.fatorTransformacao 
          ? parseFloat(formData.fatorTransformacao) 
          : null,
        
        // Timestamps
        updatedAt: new Date().toISOString(),
        data: new Date().toISOString(),
        
        // Additional item info for display
        marca: selectedItem?.marca || "",
        
        // Preserve existing fields if editing
        ...(selectedMovement ? {
          id: selectedMovement.id,
          createdAt: selectedMovement.createdAt || new Date().toISOString(),
        } : {})
      };

      if (selectedMovement) {
        // Update existing movement in Firestore
        await update(idRestaurante, 'movimentos', selectedMovement.id, movementData);

        // Update local state
        setAllMovements(prev =>
          prev.map(m => 
            m.id === selectedMovement.id 
              ? { ...m, ...movementData }
              : m
          )
        );
        
        alert(t("page.updateSuccess"));
      } else {
        // Create new movement in Firestore
        const newMovement = {
          ...movementData,
          createdAt: new Date().toISOString(),
        };
        
        const docRef = await create(idRestaurante, 'movimentos', newMovement);
        
        // Update local state with the new movement (including the Firestore ID)
        setAllMovements(prev => [
          { ...newMovement, id: docRef.id },
          ...prev
        ]);
        
        // Update the item's estoqueAtual
        const selectedItem = items.find(item => item.id === newMovement.itemId);
        if (selectedItem) {
          await update(idRestaurante, 'itens', selectedItem.id, {
            estoqueAtual: parseFloat(newMovement.novoSaldo)
          });
          
          // Update local items state
          setItems(prevItems => 
            prevItems.map(item => 
              item.id === selectedItem.id 
                ? { ...item, estoqueAtual: parseFloat(newMovement.novoSaldo) }
                : item
            )
          );
        }
        
        alert(t("page.createSuccess"));
      }

      setIsFormModalOpen(false);
      setSelectedMovement(null);
    } catch (err) {
      console.error("Error saving movement:", err);
      setError(t("page.errorSaving"));
    } finally {
      setModalLoading(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setIsDetailsModalOpen(false);
    setSelectedMovement(null);
  };

  // Handle details modal edit
  const handleDetailsEdit = (movement) => {
    setIsDetailsModalOpen(false);
    setSelectedMovement(movement);
    setIsFormModalOpen(true);
  };

  return (
    <div className="mt-10 space-y-6">
      <CardHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        onNewClick={handleCreate}
        buttonTitle={t("page.newButton")}
      />
        {/* Loading state */}
        {(loading || itemsLoading) ? (
          <div className="flex justify-center items-center p-8">
            <LoadingSpinnerDynamic />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : (
          <MovementsTable
            movements={movements}
            loading={loading}
            error={error}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            totalItems={totalItems}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {/* Form Modal */}
        <MovementsFormModal
          isOpen={isFormModalOpen}
          onClose={handleModalClose}
          onSubmit={handleFormSubmit}
          movement={selectedMovement}
          items={items}
          loading={modalLoading}
        />

        {/* Details Modal */}
        <MovementDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleModalClose}
          onEdit={handleDetailsEdit}
          movement={selectedMovement}
          loading={modalLoading}
        />
      </div>
  );
};

export default MovementsPage;
