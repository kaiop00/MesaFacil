import { useState } from "react";

import mock1 from "../../../assets/images/mock/mock1.png";
import mock2 from "../../../assets/images/mock/mock2.png";
import mock3 from "../../../assets/images/mock/mock3.png";

import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from "@/features/promotions/components/CardPromotionEmpty";
import CardPromotion from "@/features/promotions/components/CardPromotion";
import NewPromotionModal from "@/features/promotions/components/modals/NewPromotionModal";

// Mock de dados para exemplo
export const mockPromoItems = [
  {
    id: 1,
    nome: "Encanto da Serra",
    imagemUrl: mock1,
    precoOriginal: 100,
    precoDesconto: 50,
  },
  {
    id: 2,
    nome: "Carne de Gado Assada",
    imagemUrl: mock2,
    precoOriginal: 14.2,
    precoDesconto: 12.2,
  },
  {
    id: 3,
    nome: "Almoço Executivo",
    imagemUrl: mock3,
    precoOriginal: 14.2,
    precoDesconto: 12.2,
  },
  {
    id: 4,
    nome: "Almoço Executivo",
    imagemUrl: mock3,
    precoOriginal: 14.2,
    precoDesconto: 12.2,
  },
];

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
