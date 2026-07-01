import React from 'react';

/**
 * Badge para exibir origem do pedido
 * @param {Object} props
 * @param {string} props.origin - Origem: 'whatsapp', 'ifood', 'mesaconvencional'
 * @param {string} props.size - Tamanho: 'small', 'medium', 'large'
 * @param {string} props.tipoEntrega - Tipo de entrega para WhatsApp: 'delivery', 'retirada'
 */
export function OrderOriginBadge({ origin = 'mesaconvencional', size = 'medium', tipoEntrega = null }) {
  const configs = {
    whatsapp: {
      label: 'WhatsApp',
      icon: '💬',
      bgClass: 'bg-gradient-to-r from-green-500 to-green-600',
      hoverClass: 'hover:shadow-green-500/40'
    },
    // Variação: WhatsApp Delivery
    'whatsapp-delivery': {
      label: 'Delivery',
      icon: '🛵',
      bgClass: 'bg-gradient-to-r from-green-500 to-green-600',
      hoverClass: 'hover:shadow-green-500/40'
    },
    // Variação: WhatsApp Retirada
    'whatsapp-retirada': {
      label: 'Retirada',
      icon: '🏪',
      bgClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
      hoverClass: 'hover:shadow-blue-500/40'
    },
    ifood: {
      label: 'iFood',
      icon: '🍔',
      bgClass: 'bg-gradient-to-r from-red-600 to-red-700',
      hoverClass: 'hover:shadow-red-600/40'
    },
    mesaconvencional: {
      label: 'Mesa',
      icon: '🍽️',
      bgClass: 'bg-gradient-to-r from-gray-500 to-gray-600',
      hoverClass: 'hover:shadow-gray-500/40'
    }
  };

  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-[10px] gap-1',
    medium: 'px-2 py-1 text-xs gap-1',
    large: 'px-3 py-1.5 text-sm gap-1.5'
  };

  // Determina a config correta baseado na origem e tipo de entrega
  let configKey = origin;
  if (origin === 'whatsapp' && tipoEntrega) {
    configKey = `whatsapp-${tipoEntrega}`;
  }

  const config = configs[configKey] || configs[origin] || configs.mesaconvencional;
  const sizeClass = sizeClasses[size] || sizeClasses.medium;

  return (
    <span className={`
      inline-flex max-w-full items-center rounded-full font-semibold text-white shadow-sm
      transition-shadow duration-200 whitespace-normal break-words
      ${config.bgClass} ${config.hoverClass} ${sizeClass}
    `}>
      <span>{config.icon}</span>
      <span className="min-w-0">{config.label}</span>
    </span>
  );
}

export default OrderOriginBadge;
