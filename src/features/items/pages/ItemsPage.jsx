import { useState, useEffect } from "react";
import CardHeader from "@/components/CardHeader";
import { SearchMagnifyingGlass } from "react-coolicons";
import ItemsTable from "@/features/items/components/ItemsTable";
import ItemFormModal from "@/features/items/components/ItemFormModal";
import ItemDetailsModal from "@/features/items/components/ItemDetailsModal";

const ItemsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const mockItems = [
      {
        id: 1,
        nome: "Carne de Boi",
        marca: "Friboi",
        unidadeArmazenamento: "Grama",
        unidadeCompra: "Unidade",
        estoque: {
          atual: 20,
          baixo: 5,
          medio: 10,
          alto: 20,
        },
        categoria: "Carnes"
      },
      {
        id: 2,
        nome: "Arroz",
        marca: "Tio João",
        unidadeArmazenamento: "Grama",
        unidadeCompra: "Pacote",
        estoque: {
          atual: 50,
          baixo: 10,
          medio: 30,
          alto: 50,
        },
        categoria: "Grãos"
      },
      {
        id: 3,
        nome: "Feijão",
        marca: "Camil",
        unidadeArmazenamento: "Quilograma",
        unidadeCompra: "Pacote",
        estoque: {
          atual: 25,
          baixo: 5,
          medio: 15,
          alto: 25,
        },
        categoria: "Grãos"
      },
      {
        id: 4,
        nome: "Macarrão",
        marca: "Tio João",
        unidadeArmazenamento: "Quilograma",
        unidadeCompra: "Pacote",
        estoque: {
          atual: 25,
          baixo: 5,
          medio: 15,
          alto: 25,
        },
        categoria: "Grãos"
      },
      {
        id: 5,
        nome: "Macarrão",
        marca: "Tio João",
        unidadeArmazenamento: "Quilograma",
        unidadeCompra: "Pacote",
        estoque: {
          atual: 25,
          baixo: 5,
          medio: 15,
          alto: 25,
        },
        categoria: "Grãos"
      },
      {
        id: 6,
        nome: "Macarrão",
        marca: "Tio João",
        unidadeArmazenamento: "Quilograma",
        unidadeCompra: "Pacote",
        estoque: {
          atual: 25,
          baixo: 5,
          medio: 15,
          alto: 25,
        },
        categoria: "Grãos"
      },
    ];

    const filteredItems = mockItems.filter(item =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.marca && item.marca.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setItems(filteredItems);
    setTotalItems(filteredItems.length);
    setCurrentPage(1);
  }, [searchTerm]);

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

  const handleDeleteItem = (item) => {
    if (window.confirm(`Tem certeza que deseja excluir o item "${item.nome}"?`)) {
      setItems(prevItems => prevItems.filter(i => i.id !== item.id));
      setTotalItems(prev => prev - 1);
    }
  };

  const handleSaveItem = (itemData) => {
    if (selectedItem) {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedItem.id ? { ...item, ...itemData } : item
        )
      );
    } else {
      const newItem = {
        ...itemData,
        id: Date.now(),
        categoria: itemData.categoria || "Outros"
      };
      setItems(prevItems => [newItem, ...prevItems]);
      setTotalItems(prev => prev + 1);
    }
    setIsFormModalOpen(false);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <CardHeader title="Itens" subtitle="Gerencie os itens do seu restaurante" onNewClick={handleNewItem} buttonTitle="Novo Item" />

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