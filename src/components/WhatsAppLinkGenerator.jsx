import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateWhatsAppTableLink, copyWhatsAppLinkToClipboard } from '@/utils/whatsappMenuLink';
import { useToast } from '@/hooks/useToast';

/**
 * Componente para gerar e compartilhar link da mesa virtual WhatsApp
 * Para ser usado no painel administrativo
 */
export function WhatsAppLinkGenerator() {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  const [showLink, setShowLink] = useState(false);
  
  const menuLink = generateWhatsAppTableLink(idRestaurante);

  const handleCopyLink = async () => {
    const success = await copyWhatsAppLinkToClipboard(menuLink);
    if (success) {
      notify('Link copiado com sucesso! 📋', 'success');
    } else {
      notify('Erro ao copiar link', 'error');
    }
  };

  const handleShowLink = () => {
    setShowLink(!showLink);
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-lime-50 border-2 border-green-500 rounded-xl p-6 my-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">💬</span>
        <h3 className="text-xl font-bold text-green-800">Link para WhatsApp</h3>
      </div>
      
      <p className="text-green-900 text-sm leading-relaxed mb-5">
        Compartilhe este link com seus clientes via WhatsApp. Eles acessarão o <strong>cardápio digital</strong> e poderão fazer pedidos para delivery.
      </p>

      <div className="flex gap-3 mb-4">
        <button 
          onClick={handleShowLink}
          className="flex-1 px-5 py-3 border-2 border-green-700 bg-white text-green-800 rounded-lg text-sm font-semibold transition-all hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0"
        >
          {showLink ? 'Ocultar Link' : 'Ver Link'}
        </button>
        
        <button 
          onClick={handleCopyLink}
          className="flex-1 px-5 py-3 bg-green-500 text-white rounded-lg text-sm font-semibold transition-all hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/30 active:translate-y-0"
        >
          Copiar Link
        </button>
      </div>

      {showLink && (
        <div className="bg-white border border-green-200 rounded-lg p-3 mb-4 overflow-x-auto">
          <code className="block font-mono text-xs text-blue-700 break-all">{menuLink}</code>
        </div>
      )}

      <div className="flex items-start gap-2.5 bg-white/70 backdrop-blur-sm p-3 rounded-lg border-l-4 border-green-500">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0 text-green-700 mt-0.5">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zm0-6H7V4h2v2z"/>
        </svg>
        <p className="text-xs text-green-900 leading-relaxed">
          Este link abre o <strong className="font-bold text-green-950">cardápio</strong> da mesa virtual WhatsApp. 
          Os clientes escolhem os itens, vão para a sacola e preenchem seus dados de entrega. 
          Todos os pedidos serão automaticamente marcados como origem <strong className="font-bold text-green-950">WhatsApp</strong>.
        </p>
      </div>
    </div>
  );
}

export default WhatsAppLinkGenerator;
