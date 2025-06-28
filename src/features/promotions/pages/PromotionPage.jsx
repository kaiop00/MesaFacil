import { useState } from "react";
import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from "@/features/promotions/components/CardPromotionEmpty";
import CardPromotion from "@/features/promotions/components/CardPromotion";
import NewPromotionModal from "@/features/promotions/components/modals/NewPromotionModal";
import { mockPromoItems } from "@/features/promotions/utils/mock";

const PromotionPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promotions, setPromotions] = useState(mockPromoItems);

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSavePromotion = async (formData) => {
    try {

      // TODO: Replace with actual API call
      // const response = await api.post('/promotions', formData);

      // Mock response for now
      const newPromotion = {
        id: Date.now().toString(),
        nome: formData.nome || `Promoção ${promotions.length + 1}`,
        valor: formData.valor,
        itens: formData.itens,
        imagemUrl: '/placeholder-promo.jpg',
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
  };

  const handleDeletePromotion = (id) => {
    console.log(`Promoção ${id} excluída`);
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
            <CardPromotion
              key={promo.id}
              id={promo.id}
              nome={promo.nome}
              imagemUrl={promo.imagemUrl}
              precoOriginal={promo.precoOriginal}
              precoDesconto={promo.precoDesconto}
              onEdit={handleEditPromotion}
              onDelete={handleDeletePromotion}
            />
          ))}
        </div>)
      }

      <NewPromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromotion}
      />
    </div>
  );
};

export default PromotionPage;
