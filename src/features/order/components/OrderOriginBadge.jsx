import React from 'react';

/**
 * Badge para exibir origem do pedido
 * @param {Object} props
 * @param {string} props.origin - Origem: 'whatsapp', 'ifood', 'mesaconvencional'
 * @param {string} props.size - Tamanho: 'small', 'medium', 'large'
 */
export function OrderOriginBadge({ origin = 'mesaconvencional', size = 'medium' }) {
  const configs = {
    whatsapp: {
      label: 'WhatsApp',
      icon: '💬',
      bgClass: 'bg-gradient-to-r from-green-500 to-green-600',
      hoverClass: 'hover:shadow-green-500/40'
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

  const config = configs[origin] || configs.mesaconvencional;
  const sizeClass = sizeClasses[size] || sizeClasses.medium;

  return (
    <span className={`
      inline-flex items-center rounded-full font-semibold text-white shadow-sm
      transition-shadow duration-200 whitespace-nowrap
      ${config.bgClass} ${config.hoverClass} ${sizeClass}
    `}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

export default OrderOriginBadge;
