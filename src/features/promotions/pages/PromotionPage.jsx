import mock1 from "../../../assets/images/mock/mock1.png";
import mock2 from "../../../assets/images/mock/mock2.png";
import mock3 from "../../../assets/images/mock/mock3.png";

import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from "@/features/promotions/components/CardPromotionEmpty";
import CardPromotion from "@/features/promotions/components/CardPromotion";
import CardCombo from "@/features/promotions/components/CardCombo";

// Mock de dados para exemplo
export const mockPromoItems = [
  {
    id: 1,
    name: "Encanto da Serra",
    imageUrl: mock1,
    originalPrice: 14.2,
    discountedPrice: 12.2,
    discountPercentage: 20,
  },
  {
    id: 2,
    name: "Carne de Gado Assada",
    imageUrl: mock2,
    originalPrice: 14.2,
    discountedPrice: 12.2,
    discountPercentage: 20,
  },
  {
    id: 3,
    name: "Almoço Executivo",
    imageUrl: mock3,
    originalPrice: 14.2,
    discountedPrice: 12.2,
    discountPercentage: 20,
  },
];

export const mockComboItems = [
  {
    id: 1,
    name: "Combo - Nome do Combo",
    ingredients: "Carne de Gado Assada, Arroz a Grega, Suco",
    price: 48.9,
  },
  {
    id: 2,
    name: "Combo - Nome do Combo",
    ingredients: "Carne de Gado Assada, Arroz a Grega, Suco",
    price: 48.9,
  },
  {
    id: 3,
    name: "Combo - Nome do Combo",
    ingredients: "Carne de Gado Assada, Arroz a Grega, Suco",
    price: 48.9,
  },
];

const PromotionPage = () => {
  // Handlers
  const handleNew = () => {
    alert("Abrir modal de novo pedido");
  };

  const handleOpenPromoOptions = (id) => {
    console.log(`Opções da promoção ${id} abertas`);
    // Abrir modal ou menu aqui
  };

  const handleOpenComboOptions = (id) => {
    console.log(`Opções do combo ${id} abertas`);
    // Abrir modal ou menu aqui
  };

  // Usar apenas dados mock
  const displayPromoItems = mockPromoItems;
  const displayComboItems = mockComboItems;

  const hasPromoItems = displayPromoItems.length > 0;
  const hasComboItems = displayComboItems.length > 0;
  const hasAnyItems = hasPromoItems || hasComboItems;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      <CardHeader
        title="Promoções"
        subtitle="Gerencie as promoções do seu restaurante"
        onNewClick={handleNew}
        buttonTitle="Nova Promoção"
      />

      {!hasAnyItems ? (
        <CardPromotionEmpty />
      ) : (
        <div className="space-y-12">
          {hasPromoItems && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayPromoItems.map((promo) => (
                  <CardPromotion
                    key={promo.id}
                    id={promo.id}
                    name={promo.name}
                    imageUrl={promo.imageUrl}
                    originalPrice={promo.originalPrice}
                    discountedPrice={promo.discountedPrice}
                    discountPercentage={promo.discountPercentage}
                    onOpenOptions={handleOpenPromoOptions}
                  />
                ))}
              </div>
            </div>
          )}

          {hasComboItems && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayComboItems.map((combo) => (
                  <CardCombo
                    key={combo.id}
                    id={combo.id}
                    name={combo.name}
                    ingredients={combo.ingredients}
                    price={combo.price}
                    onOpenOptions={handleOpenComboOptions}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromotionPage;
