import { useTranslation } from 'react-i18next';
import illustration from '@/assets/images/promotions/search_outline_II.png';

const CardPromotionEmpty = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm w-full">
      <div className="flex justify-center mb-4">
        <img
          src={illustration}
          alt={t('promotions:empty.altText')}
          className="w-96 h-auto"
        />
      </div>
      <p className="text-center text-gray-500 text-base sm:text-lg md:text-xl whitespace-pre-line">
        {t('promotions:empty.subtitle')}
      </p>
    </div>
  );
};

export default CardPromotionEmpty;
