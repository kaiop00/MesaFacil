import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModalWithHeader from '@/components/BaseModalWithHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  getWhatsAppConfig, 
  updateWhatsAppConfig, 
  createWhatsAppTable 
} from '@/features/config/services/whatsappService';
import WhatsAppLinkGenerator from '@/components/WhatsAppLinkGenerator';

/**
 * Modal para configurar pedidos via WhatsApp
 * Ao ativar, cria uma mesa virtual "WhatsApp" para receber os pedidos
 */
const WhatsAppConfigModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation('common');
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (isOpen && idRestaurante) {
      loadConfig();
    }
  }, [isOpen, idRestaurante]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await getWhatsAppConfig(idRestaurante);
      setEnabled(config?.enabled || false);
      setShowIntro(!config?.enabled); // Mostra intro se nunca foi ativado
    } catch (error) {
      console.error('Erro ao carregar configuração WhatsApp:', error);
      notify('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Se está ativando pela primeira vez, cria a mesa WhatsApp
      if (!enabled) {
        await createWhatsAppTable(idRestaurante);
        notify('Mesa WhatsApp criada com sucesso! 🎉', 'success');
      }

      // Atualiza configuração
      await updateWhatsAppConfig(idRestaurante, { enabled: !enabled });
      setEnabled(!enabled);
      
      notify(
        !enabled 
          ? 'Pedidos via WhatsApp ativados com sucesso!'
          : 'Pedidos via WhatsApp desativados',
        'success'
      );
      
      if (!enabled) {
        setShowIntro(false);
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      notify(
        error.message || 'Erro ao salvar configurações', 
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Pedidos via WhatsApp"
    >
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {showIntro && !enabled && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">💬</span>
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">
                      Ative o cardápio para WhatsApp
                    </h3>
                    <p className="text-sm text-green-800 mb-3 leading-relaxed">
                      Ao ativar, você poderá compartilhar um link especial do seu cardápio 
                      que coleta automaticamente os dados do cliente (nome, endereço, telefone) 
                      e marca o pedido como "Pagamento na Entrega".
                    </p>
                    <ul className="text-sm text-green-800 space-y-1 mb-3">
                      <li>✅ Mesa virtual "Mesa WA" será criada</li>
                      <li>✅ Link personalizado do cardápio</li>
                      <li>✅ Coleta automática de dados do cliente</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle de ativação */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Cardápio para WhatsApp
                </h4>
                <p className="text-sm text-gray-600">
                  {enabled 
                    ? 'Mesa do WhatsApp ativa e recebendo pedidos' 
                    : 'Pedidos via WhatsApp desativados'}
                </p>
              </div>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className={`
                  relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  ${enabled ? 'bg-green-500' : 'bg-gray-300'}
                  ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span
                  className={`
                    inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                    ${enabled ? 'translate-x-7' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Gerador de link - só aparece quando ativado */}
            {enabled && (
              <>
                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Compartilhe o Link do Cardápio
                  </h4>
                  <WhatsAppLinkGenerator />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <span>📊</span>
                    Como Funciona
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>Copie o link acima e compartilhe via WhatsApp com seus clientes</li>
                    <li>Cliente acessa o <strong>cardápio digital</strong> e escolhe os itens</li>
                    <li>Adiciona os itens ao carrinho e vai para a sacola</li>
                    <li>No checkout, preenche automaticamente nome, CPF, telefone e endereço de entrega</li>
                    <li>Você visualiza todos os dados necessários para a entrega</li>
                  </ol>
                </div>
              </>
            )}

            {/* Informações sobre a mesa virtual */}
            {enabled && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  Mesa Virtual
                </h4>
                <p className="text-sm text-gray-600">
                  Uma mesa especial "WhatsApp" foi criada para receber os pedidos. 
                  Você pode visualizá-la no painel de pedidos junto com as outras mesas.
                  Ela funciona de forma similar à mesa do iFood.
                </p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </BaseModalWithHeader>
  );
};

export default WhatsAppConfigModal;
