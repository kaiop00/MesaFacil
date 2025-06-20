import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import FilterBar from "@/features/foodList/components/FilterBar";
import FoodGrid from "@/features/foodList/components/FoodGrid";
import NewFoodModal from "@/features/foodList/components/modals/NewFoodModal";
import { useAuth } from "@/contexts/AuthContext";

const FoodListPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="sm:px-6 md:px-8 mt-10 mb-10 space-y-10">
      {role === "admin" && <CardHeader
        title="Cardápio"
        subtitle="Gerencie o cardápio da sua loja"
        onNewClick={handleNew}
        buttonTitle="Novo Item"
      />}

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
