import { WHATSAPP_TABLE_ID } from '@/constants/whatsappConstants';

/**
 * Utilitários para geração de links da mesa virtual WhatsApp
 */

/**
 * Gera link da mesa virtual WhatsApp para pedidos delivery
 * O link leva diretamente para o cardápio (MesaPage) da mesa virtual WhatsApp
 * Formato: /mesa/{numero}-{mesaId}?restaurante={idRestaurante}
 * @param {string} idRestaurante - ID do restaurante no Firestore
 * @param {string} baseUrl - URL base (opcional, usa window.location.origin por padrão)
 * @returns {string} URL completa da mesa WhatsApp apontando para o cardápio
 */
export function generateWhatsAppTableLink(idRestaurante, baseUrl = null) {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  // Link aponta para o cardápio (MesaPage), não para /pedido
  // Formato: /mesa/WA-mesa-whatsapp-delivery?restaurante={idRestaurante}
  return `${base}/mesa/WA-${WHATSAPP_TABLE_ID}?restaurante=${idRestaurante}`;
}

/**
 * @deprecated Use generateWhatsAppTableLink em vez disso
 * Mantido para compatibilidade retroativa
 */
export function generateWhatsAppMenuLink(idRestaurante, baseUrl = null) {
  return generateWhatsAppTableLink(idRestaurante, baseUrl);
}

/**
 * Gera mensagem para enviar via WhatsApp
 * @param {string} menuLink - Link do cardápio gerado
 * @param {string} restaurantName - Nome do restaurante
 * @returns {string} Mensagem formatada
 */
export function generateWhatsAppMessage(menuLink, restaurantName) {
  return encodeURIComponent(
    `Olá! 👋\n\n` +
    `Faça seu pedido no *${restaurantName}* através do nosso cardápio digital:\n\n` +
    `${menuLink}\n\n` +
    `Entregamos no conforto da sua casa! 🍽️🏠`
  );
}

/**
 * Gera link completo do WhatsApp para compartilhamento
 * @param {string} phoneNumber - Número do WhatsApp (com DDI, ex: 5511999999999)
 * @param {string} menuLink - Link do cardápio
 * @param {string} restaurantName - Nome do restaurante
 * @returns {string} Link wa.me completo
 */
export function generateWhatsAppShareLink(phoneNumber, menuLink, restaurantName) {
  const message = generateWhatsAppMessage(menuLink, restaurantName);
  return `https://wa.me/${phoneNumber}?text=${message}`;
}

/**
 * Copia link do cardápio WhatsApp para área de transferência
 * @param {string} menuLink - Link do cardápio
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function copyWhatsAppLinkToClipboard(menuLink) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(menuLink);
      return true;
    } else {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = menuLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Erro ao copiar link:', error);
    return false;
  }
}

export default {
  generateWhatsAppMenuLink,
  generateWhatsAppMessage,
  generateWhatsAppShareLink,
  copyWhatsAppLinkToClipboard
};
