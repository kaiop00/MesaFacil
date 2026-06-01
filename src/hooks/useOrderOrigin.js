import { useState, useEffect } from 'react';
import { useCliente } from '@/features/cliente/context/ClienteContext';
import { WHATSAPP_TABLE_ID, WHATSAPP_ORDER_ORIGIN } from '@/constants/whatsappConstants';

/**
 * Hook para capturar e gerenciar a origem do pedido
 * Origens possíveis:
 * - "whatsapp": Pedidos feitos na mesa virtual WhatsApp
 * - "ifood": Pedidos da integração iFood
 * - "mesaconvencional": QR Code ou acesso direto (padrão)
 * 
 * @returns {Object} { origin, isWhatsApp, isIfood, isMesaConvencional }
 */
export function useOrderOrigin() {
  const { mesaId } = useCliente();
  const [origin, setOrigin] = useState('mesaconvencional');

  useEffect(() => {
    // Verifica se é a mesa virtual WhatsApp
    if (mesaId === WHATSAPP_TABLE_ID) {
      setOrigin(WHATSAPP_ORDER_ORIGIN);
      sessionStorage.setItem('orderOrigin', WHATSAPP_ORDER_ORIGIN);
      return;
    }

    // Detecta acesso via QR Code (/mesa/...) — trata como pedido realizado pelo cliente
    try {
      const path = (window.location && window.location.pathname) || "";
      if (path && path.includes('/mesa/')) {
        setOrigin('cliente');
        sessionStorage.setItem('orderOrigin', 'cliente');
        return;
      }
    } catch {
      // ignore if window is not available or any error occurs
    }

    // Captura origem da URL (para compatibilidade com iFood ou outros)
    const url = new URL(window.location.href);
    const origemParam = url.searchParams.get('origem');

    if (origemParam) {
      const normalizedOrigin = origemParam.toLowerCase();
      
      // Valida e normaliza origem
      if (['whatsapp', 'ifood', 'mesaconvencional'].includes(normalizedOrigin)) {
        setOrigin(normalizedOrigin);
        sessionStorage.setItem('orderOrigin', normalizedOrigin);
      }
    } else {
      // Verifica se existe origem salva na sessão
      const savedOrigin = sessionStorage.getItem('orderOrigin');
      if (savedOrigin) {
        setOrigin(savedOrigin);
      }
    }
  }, [mesaId]);

  return {
    origin,
    isWhatsApp: origin === 'whatsapp',
    isIfood: origin === 'ifood',
    isMesaConvencional: origin === 'mesaconvencional'
  };
}

/**
 * Limpa a origem salva (útil para reset/logout)
 */
export function clearOrderOrigin() {
  sessionStorage.removeItem('orderOrigin');
}

export default useOrderOrigin;
