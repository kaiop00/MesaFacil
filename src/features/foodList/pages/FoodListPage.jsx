import { useState } from "react";
import { useTranslation } from "react-i18next";
import CardHeader from "@/components/CardHeader";
import FilterBar from "@/features/foodList/components/FilterBar";
import FoodGrid from "@/features/foodList/components/FoodGrid";
import NewFoodModal from "@/features/foodList/components/modals/NewFoodModal";
import LimitCounter from "@/components/LimitCounter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { usePlan } from "@/contexts/PlanContext";
import { getCategoriaNomes } from "@/features/config/services/CategoriasService";
import { useCardapioContext } from "@/features/foodList/context/CardapioContext";
import { usePDFGenerator } from "@/features/foodList/hooks/usePDFGenerator";
import { FEATURE_FLAGS } from "@/constants/planFeatures";
import { Download } from "react-coolicons";

const FoodListPage = () => {
  const { t } = useTranslation('foodList');
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { role, idRestaurante } = useAuth();
  const { notify } = useToast();
  const { items } = useCardapioContext();
  const { generateMenuPDF } = usePDFGenerator();
  const { canAddProduct } = usePlan();

  const handleNew = async () => {
    try {
      // Check if user can add more products
      if (!canAddProduct(items.length)) {
        notify(
          "Você atingiu o limite de produtos do seu plano. Faça upgrade para adicionar mais produtos.",
          "warning"
        );
        return;
      }

      const nomes = await getCategoriaNomes(idRestaurante, { unique: true, sort: true });

      if (!nomes || nomes.length === 0) {
        notify(
          t('page.noCategoriesMessage'),
          "info"
        );
        return; // NÃO abre o modal
      }

      setIsModalOpen(true); // abre modal apenas se tiver categorias
    } catch {
      notify(t('page.categoriesError'), "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      if (!items || items.length === 0) {
        notify(t('page.noItemsForPDF'), "info");
        return;
      }
      
      await generateMenuPDF(items);
      notify(t('page.pdfSuccess'), "success");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      notify(t('page.pdfError'), "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="sm:px-6 md:px-8 mt-10 mb-10 space-y-10">
      {(role.create_menu_items || role === "admin") && (
        <CardHeader
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          onNewClick={handleNew}
          buttonTitle={t('page.newItemButton')}
        />
      )}

      {/* Product Limit Counter */}
      <LimitCounter
        limitType="maxProducts"
        currentCount={items.length}
        label="Produtos no Cardápio"
        featureFlag={FEATURE_FLAGS.UNLIMITED_PRODUCTS}
        showUpgradeLink={true}
      />

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
              {isGeneratingPDF ? t('page.generatingPDF') : t('page.downloadPDFButton')}
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
