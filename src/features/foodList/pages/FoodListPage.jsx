import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import FilterBar from "@/features/foodList/components/FilterBar";
import FoodGrid from "@/features/foodList/components/FoodGrid";
import NewFoodModal from "@/features/foodList/components/modals/NewFoodModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { getCategoriaNomes } from "@/features/config/services/CategoriasService";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { usePDFGenerator } from "@/features/foodList/hooks/usePDFGenerator";
import { Download } from "react-coolicons";

const FoodListPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { role, idRestaurante } = useAuth();
  const { notify } = useToast();
  const { items } = useCardapioContext();
  const { generateMenuPDF } = usePDFGenerator();

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
    } catch (error) {
      notify("Erro ao verificar categorias. Tente novamente.", "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      if (!items || items.length === 0) {
        notify("Não há itens no cardápio para gerar o PDF.", "info");
        return;
      }
      
      await generateMenuPDF(items);
      notify("PDF do cardápio gerado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      notify("Erro ao gerar PDF do cardápio.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <FilterBar
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
          />
        </div>
        
        <div className="flex-shrink-0">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || !items || items.length === 0}
            className="flex items-center space-x-2 bg-primary-dynamic text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isGeneratingPDF ? "Gerando PDF..." : "Baixar Cardápio PDF"}
            </span>
          </button>
        </div>
      </div>

      <FoodGrid search={search} filter={filter} />

      <NewFoodModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default FoodListPage;
