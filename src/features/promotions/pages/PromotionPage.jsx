import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from "@/features/promotions/components/CardPromotionEmpty";
import CardPromotion from "@/features/promotions/components/CardPromotion";
import NewPromotionModal from "@/features/promotions/components/modals/NewPromotionModal";
import { mockPromoItems } from "@/features/promotions/utils/mock";

const PromotionPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handlers
  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenPromoOptions = (id) => {
    console.log(`Opções da promoção ${id} abertas`);
    // Abrir modal ou menu aqui
  };

  // Usar apenas dados mock
  const displayPromoItems = mockPromoItems;

  const hasPromoItems = displayPromoItems.length > 0;

  return (
    <div className="sm:px-6 md:px-8 mt-10 mb-10 space-y-10">
      <CardHeader
        title="Promoções"
        subtitle="Gerencie as promoções do seu restaurante"
        onNewClick={handleNew}
        buttonTitle="Nova Promoção"
      />

      {!hasPromoItems ? (
        <CardPromotionEmpty />
      ) : (
        <div className="">
          <div>
            <div className="font-inter grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {displayPromoItems.map((promo) => (
                <CardPromotion
                  key={promo.id}
                  id={promo.id}
                  nome={promo.nome}
                  imagemUrl={promo.imagemUrl}
                  precoOriginal={promo.precoOriginal}
                  precoDesconto={promo.precoDesconto}
                  abrirOpcoes={handleOpenPromoOptions}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <NewPromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      ></NewPromotionModal>
    </div>
  );
};

export default PromotionPage;
