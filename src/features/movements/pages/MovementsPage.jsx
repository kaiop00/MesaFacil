import { useState, useEffect, useCallback } from "react";
import CardHeader from "@/components/CardHeader";
import MovementsTable from "../components/MovementsTable";
import MovementsFormModal from "../components/MovementsFormModal";
import MovementDetailsModal from "../components/MovementDetailsModal";

// Mock data for development
const mockMovements = [
  {
    id: 1,
    nome: "Carne de Boi",
    tipo: "Entrada",
    quantidade: 10,
    saldo: 30,
    itemId: 1,
    unidadeArmazenamento: "Pacote",
    unidadeCompra: "Unidade",
    marca: "Friboi",
    tipoMovimentacao: "entrada",
    qtdAtual: 20,
    qtd: 10,
    novoSaldo: 30,
  },
  {
    id: 2,
    nome: "Frango",
    tipo: "Saída",
    quantidade: 5,
    saldo: 15,
    itemId: 2,
    unidadeArmazenamento: "Kg",
    unidadeCompra: "Kg",
    marca: "Sadia",
    tipoMovimentacao: "saida",
    qtdAtual: 20,
    qtd: 5,
    novoSaldo: 15,
  },
  {
    id: 3,
    nome: "Arroz",
    tipo: "Entrada",
    quantidade: 20,
    saldo: 8,
    itemId: 3,
    unidadeArmazenamento: "Kg",
    unidadeCompra: "Saco",
    marca: "Tio João",
    tipoMovimentacao: "entrada",
    qtdAtual: 0,
    qtd: 20,
    novoSaldo: 8,
    fatorTransformacao: 3,
  },
];

const mockItems = [
  {
    id: 1,
    nome: "Carne de Boi",
    unidadeArmazenamento: "Pacote",
    unidadeCompra: "Unidade",
    saldo: 30,
    marca: "Friboi",
  },
  {
    id: 2,
    nome: "Frango",
    unidadeArmazenamento: "Kg",
    unidadeCompra: "Kg",
    saldo: 15,
    marca: "Sadia",
  },
  {
    id: 3,
    nome: "Arroz",
    unidadeArmazenamento: "Kg",
    unidadeCompra: "Saco",
    saldo: 8,
    marca: "Tio João",
  },
];

const MovementsPage = () => {
  const [allMovements, setAllMovements] = useState([]);
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setAllMovements(mockMovements);
    } catch (err) {
      setError("Erro ao carregar movimentações");
      console.error("Error loading movements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 200));
      setItems(mockItems);
    } catch (err) {
      console.error("Error loading items:", err);
    }
  }, []);

  // Filter and paginate movements based on search and pagination
  useEffect(() => {
    // Filter movements based on search term
    let filteredMovements = allMovements;
    if (searchTerm) {
      filteredMovements = allMovements.filter((movement) =>
        movement.nome.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Simulate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

    setMovements(paginatedMovements);
    setTotalItems(filteredMovements.length);
  }, [allMovements, currentPage, itemsPerPage, searchTerm]);

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
        `Tem certeza que deseja excluir a movimentação "${movement.nome}"?`,
      )
    ) {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Remove from local state
        setAllMovements((prev) => prev.filter((m) => m.id !== movement.id));

        alert("Movimentação excluída com sucesso!");
      } catch (err) {
        setError("Erro ao excluir movimentação");
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (selectedMovement) {
        // Update existing movement
        const updatedMovement = {
          ...selectedMovement,
          ...formData,
          nome:
            items.find((item) => item.id === formData.itemId)?.nome ||
            selectedMovement.nome,
        };

        setAllMovements((prev) =>
          prev.map((m) => (m.id === selectedMovement.id ? updatedMovement : m)),
        );
        alert("Movimentação atualizada com sucesso!");
      } else {
        // Create new movement
        const selectedItem = items.find((item) => item.id === formData.itemId);
        const newMovement = {
          ...formData,
          id: Date.now(),
          nome: selectedItem?.nome || "",
          tipo: formData.tipoMovimentacao,
          quantidade: parseFloat(formData.qtd),
          saldo: parseFloat(formData.novoSaldo),
          marca: selectedItem?.marca || "",
        };

        setAllMovements((prev) => [newMovement, ...prev]);
        alert("Movimentação criada com sucesso!");
      }

      setIsFormModalOpen(false);
      setSelectedMovement(null);
    } catch (err) {
      setError("Erro ao salvar movimentação");
      console.error("Error saving movement:", err);
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
        title="Itens"
        subtitle="Gerencie os itens do seu restaurante"
        onNewClick={handleCreate}
        buttonTitle="Nova movimentação"
      />
        {/* Table */}
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
