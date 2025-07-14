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
        console.error("Error fetching items:", error);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinnerDynamic size={5} />
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      <CardHeader
        title="Itens"
        subtitle="Gerencie os itens do seu restaurante"
        onNewClick={handleNewItem}
        buttonTitle="Novo Item"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchMagnifyingGlass className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              placeholder="Pesquisar itens..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <ItemsTable
            items={paginatedItems}
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
            onEdit={handleEditItem}
            onView={handleViewItem}
            onDelete={handleDeleteItem}
          />
        </div>
      </div>

      <ItemFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        item={selectedItem}
        onSave={handleSaveItem}
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