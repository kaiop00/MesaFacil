import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { create, getAll, update, remove } from "@/services/firebase/firestoreService";
import CardHeader from "@/components/CardHeader";
import { SearchMagnifyingGlass } from "react-coolicons";
import ItemsTable from "@/features/items/components/ItemsTable";
import ItemFormModal from "@/features/items/components/ItemFormModal";
import ItemDetailsModal from "@/features/items/components/ItemDetailsModal";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";

const ItemsPage = () => {
  const { idRestaurante } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (!idRestaurante) return;

      try {
        setIsLoading(true);
        const itemsData = await getAll(idRestaurante, 'itens', {
          orderByField: 'nome',
          order: 'asc'
        });

        setItems(itemsData);
        setFilteredItems(itemsData);
        setTotalItems(itemsData.length);
      } catch (error) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [idRestaurante]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.marca && item.marca.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
    }
    setCurrentPage(1);
    setTotalItems(filteredItems.length);
  }, [searchTerm, items, filteredItems]);

  useEffect(() => {
    setTotalItems(filteredItems.length);
  }, [filteredItems]);

  const handleNewItem = () => {
    setSelectedItem(null);
    setIsFormModalOpen(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setIsFormModalOpen(true);
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Tem certeza que deseja excluir o item "${item.nome}"?`)) {
      try {
        // Delete from Firestore
        await remove(idRestaurante, 'itens', item.id);

        // Update local state
        setItems(prevItems => prevItems.filter(i => i.id !== item.id));
        setTotalItems(prev => prev - 1);

        // Show success message or handle success
        // You might want to add a toast notification here

      } catch (error) {
        console.error("Error deleting item:", error);
        // Handle error (e.g., show error message to user)
      }
    }
  };

  const handleSaveItem = async (itemData) => {
    try {
      if (selectedItem) {
        // Update existing item in Firestore
        await update(idRestaurante, 'itens', selectedItem.id, itemData);

        // Update local state
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === selectedItem.id ? { ...item, ...itemData } : item
          )
        );
      } else {
        // Create new item in Firestore
        const newItem = {
          ...itemData,
          createdAt: new Date().toISOString()
        };
        const docRef = await create(idRestaurante, 'itens', newItem);

        // Update local state with the new item (including the Firestore ID)
        setItems(prevItems => [
          { ...newItem, id: docRef.id },
          ...prevItems
        ]);
      }

      // Show success message or handle success
      // You might want to add a toast notification here

    } catch (error) {
      console.error("Error saving item:", error);
      // Handle error (e.g., show error message to user)
    } finally {
      setIsFormModalOpen(false);
      setSelectedItem(null);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="mt-10 space-y-6">
      <CardHeader
        title="Itens"
        subtitle="Gerencie os itens do seu restaurante"
        onNewClick={handleNewItem}
        buttonTitle="Novo Item"
      />

      <div className="mt-5 bg-white p-6">
        <div className="mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              Carregando...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              <p>Erro ao carregar itens. Tente novamente.</p>
            </div>
          ) : (
            <>
              <header className="mb-6">
                <div className="relative max-w-md">
                  <label htmlFor="search" className="sr-only">
                    Procure o item que deseja encontrar
                  </label>
                  <input
                    type="search"
                    id="search"
                    placeholder="Procure por nome ou marca"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-4 pr-12 py-3
                    border border-gray-300 rounded-lg
                    bg-white text-gray-900 placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <SearchMagnifyingGlass className="absolute right-4 top-1/2
                  transform -translate-y-1/2 
                  text-orange-500 w-5 h-5" />
                </div>
              </header>

              <ItemsTable
                items={paginatedItems}
                totalItems={totalItems}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                onView={handleViewItem}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            </>
          )}
        </div>
      </div>

      <ItemFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveItem}
        item={selectedItem}
      />

      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        item={selectedItem}
      />
    </div>
  );
};

export default ItemsPage;