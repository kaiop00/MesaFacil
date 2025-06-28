import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from "@/features/promotions/components/CardPromotionEmpty";
import CardPromotion from "@/features/promotions/components/CardPromotion";
import NewPromotionModal from "@/features/promotions/components/modals/NewPromotionModal";
import PromotionDetailsModal from "@/features/promotions/components/modals/PromotionDetailsModal";
import { mockPromoItems } from "@/features/promotions/utils/mock";

const PromotionPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [promotions, setPromotions] = useState(mockPromoItems);

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePromotionClick = (promotion) => {
    setSelectedPromotion(promotion);
  };

  const handleCloseDetails = () => {
    setSelectedPromotion(null);
  };

  const handleSavePromotion = async (formData) => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.post('/promotions', formData);

      // Mock response for now
      const newPromotion = {
        id: Date.now().toString(),
        nome: formData.nome || `Promoção ${promotions.length + 1}`,
        imagemUrl: formData.imagemUrl || '/placeholder-promo.jpg',
        precoOriginal: formData.precoOriginal,
        precoDesconto: formData.precoDesconto,
        itens: formData.itens || [],
        dataCriacao: new Date().toISOString(),
      };

      setPromotions(prev => [newPromotion, ...prev]);
      return Promise.resolve(newPromotion);
    } catch (error) {
      console.error('Error creating promotion:', error);
      throw error;
    }
  };

  const handleEditPromotion = (id) => {
    console.log(`Promoção ${id} editada`);
    // TODO: Implement edit functionality
  };

  const handleDeletePromotion = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta promoção?')) {
      setPromotions(prev => prev.filter(promo => promo.id !== id));
    }
  };

  const hasPromoItems = promotions.length > 0;

  return (
    <div className="sm:px-6 md:px-8 mt-10 mb-10 space-y-10">
      <CardHeader
        title="Promoções"
        subtitle="Gerencie as promoções do seu restaurante"
        onNewClick={handleNew}
        buttonTitle="Nova Promoção"
      />

      {!hasPromoItems
        ? (<CardPromotionEmpty />)
        : (<div className="font-inter grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {promotions.map((promo) => (
            <div 
              key={promo.id}
              className="cursor-pointer"
              onClick={() => handlePromotionClick(promo)}
            >
              <CardPromotion
                id={promo.id}
                nome={promo.nome}
                imagemUrl={promo.imagemUrl}
                precoOriginal={promo.precoOriginal}
                precoDesconto={promo.precoDesconto}
                onEdit={(e) => {
                  e.stopPropagation();
                  handleEditPromotion(promo.id);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  handleDeletePromotion(promo.id);
                }}
              />
            </div>
          ))}
        </div>)}

      <NewPromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromotion}
      />

      <PromotionDetailsModal
        isOpen={!!selectedPromotion}
        onClose={handleCloseDetails}
        promotion={selectedPromotion}
      />
    </div>
  );
};

export default PromotionPage;
