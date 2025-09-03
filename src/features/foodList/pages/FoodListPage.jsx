import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import FilterBar from "@/features/foodList/components/FilterBar";
import FoodGrid from "@/features/foodList/components/FoodGrid";
import NewFoodModal from "@/features/foodList/components/modals/NewFoodModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { getCategoriaNomes } from "@/features/config/services/CategoriasService";

const FoodListPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role, idRestaurante } = useAuth();
  const { notify } = useToast();

  const handleNew = async () => {
    try {
      const nomes = await getCategoriaNomes(idRestaurante, { unique: true, sort: true });

      if (!nomes || nomes.length === 0) {
        notify(
          "Você ainda não possui categorias. Cadastre em Configurações > Categorias antes de adicionar itens.",
          "info"
        );
        return; // NÃO abre o modal
      }

      setIsModalOpen(true); // abre modal apenas se tiver categorias
    } catch (err) {
      notify("Erro ao verificar categorias. Tente novamente.", "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="sm:px-6 md:px-8 mt-10 mb-10 space-y-10">
      {(role.create_menu_items || role === "admin") && (
        <CardHeader
          title="Cardápio"
          subtitle="Gerencie o cardápio da sua loja"
          onNewClick={handleNew}
          buttonTitle="Novo Item"
        />
      )}

      <FilterBar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />

      <FoodGrid search={search} filter={filter} />

      <NewFoodModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default FoodListPage;
