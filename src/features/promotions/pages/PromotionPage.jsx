import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from '@/features/promotions/components/CardPromotionEmpty';

const PromotionPage = () => {
  const handleNew = () => {
    alert("Abrir modal de novo pedido");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      <CardHeader
        title="Promoções"
        subtitle="Gerencie as promoções do seu restaurante"
        onNewClick={handleNew}
        buttonTitle="Nova Promoção"
      />

      <CardPromotionEmpty/>
    </div>
  );
};

export default PromotionPage;
