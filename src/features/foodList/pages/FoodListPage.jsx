import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import FilterBar from "@/features/foodList/components/FilterBar";
import FoodGrid from "@/features/foodList/components/FoodGrid";
import NewFoodModal from "@/features/foodList/components/modals/NewFoodModal";

const FoodListPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="mt-15">
      <CardHeader
        title="Cardápio"
        subtitle="Gerencie o cardápio da sua loja"
        onNewClick={handleNew}
        buttonTitle="Novo Item"
      />

      <FilterBar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />

      <FoodGrid />

      <NewFoodModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default FoodListPage;
