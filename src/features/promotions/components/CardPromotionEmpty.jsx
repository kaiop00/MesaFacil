const CardPromotionEmpty = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm w-full">
      <div className="flex justify-center mb-4">
        <img
          src="/src/assets/images/promotions/search_outline_II.png"
          alt="Sem promoções"
          className="w-96 h-auto"
        />
      </div>
      <p className="text-center text-gray-500 text-base sm:text-lg md:text-xl">
        Nenhuma promoção ativa no momento, clique em nova promoção
        <br />
        para adicionar.
      </p>
    </div>
  );
};

export default CardPromotionEmpty;
