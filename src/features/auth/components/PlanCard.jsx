import { useState } from 'react';

export default function PlanCard({ 
  plan, 
  isSelected, 
  onSelect,
  isPopular = false,
  isDisabled = false,
  disabledReason = null
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = () => {
    if (isDisabled) return;
    onSelect();
  };

  return (
    <div 
      className={`
        relative border-2 rounded-xl p-6 transition-all duration-300 transform
        ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
        ${isSelected 
          ? 'border-orange-500 bg-orange-50 shadow-lg scale-105' 
          : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
        }
        ${isHovered && !isDisabled ? 'scale-105' : ''}
      `}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Mais Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {plan.name}
        </h3>
        
        <div className="mb-4">
          <span className="text-3xl font-bold text-orange-600">
            {plan.price === 0 ? 'Gratuito' : `R$ ${plan.price.toFixed(2)}`}
          </span>
          {plan.duration && (
            <span className="text-gray-600 text-sm block">
              {plan.duration}
            </span>
          )}
        </div>

        {plan.discount && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm inline-block mb-4">
            {plan.discount}
          </div>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          Funcionalidades:
        </h4>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
              <svg 
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  feature.included ? 'text-green-500' : 'text-gray-400'
                }`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                {feature.included ? (
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                )}
              </svg>
              <span className={feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {plan.limitations && plan.limitations.length > 0 && (
        <div className="space-y-2 mb-6">
          <h4 className="font-semibold text-red-600 text-sm uppercase tracking-wide">
            Limitações:
          </h4>
          <ul className="space-y-1">
            {plan.limitations.map((limitation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-red-500">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isDisabled && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {disabledReason || 'Plano indisponível no momento.'}
        </div>
      )}

      <button
        disabled={isDisabled}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200
          ${isDisabled
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : isSelected
            ? 'bg-orange-500 text-white shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-orange-500 hover:text-white'
          }
        `}
      >
        {isDisabled ? 'Indisponível' : isSelected ? 'Selecionado' : 'Selecionar Plano'}
      </button>
    </div>
  );
}