import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  createWhatsAppTable
} from '@/features/config/services/whatsappService';
import WhatsAppLinkGenerator from '@/components/WhatsAppLinkGenerator';
import DeliveryFeesTable from '@/features/config/components/DeliveryFeesTable';

const WhatsAppPage = () => {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [bairros, setBairros] = useState([]);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await getWhatsAppConfig(idRestaurante);
      setEnabled(config?.enabled || false);
      setBairros(Array.isArray(config?.bairros) ? config.bairros : []);
      setShowIntro(!config?.enabled);
    } catch (error) {
      console.error('Erro ao carregar configuração WhatsApp:', error);
      notify('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  }, [idRestaurante, notify]);

  useEffect(() => {
    if (idRestaurante) {
      loadConfig();
    }
  }, [idRestaurante, loadConfig]);

  const handleToggle = async () => {
    try {
      setSaving(true);

      if (!enabled) {
        await createWhatsAppTable(idRestaurante);
        notify('Mesa WhatsApp criada com sucesso! 🎉', 'success');
      }

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
      notify(error.message || 'Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos via WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure o cardápio digital para receber pedidos via WhatsApp
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Intro banner */}
          {showIntro && !enabled && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">
                    Ative o cardápio para WhatsApp
                  </h3>
                  <p className="text-sm text-green-800 mb-3 leading-relaxed">
                    Ao ativar, você poderá compartilhar um link especial do seu cardápio
                    que coleta automaticamente os dados do cliente (nome, endereço, telefone)
                    e marca o pedido como "Pagamento na Entrega".
                  </p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✅ Mesa virtual "Mesa WA" será criada</li>
                    <li>✅ Link personalizado do cardápio</li>
                    <li>✅ Coleta automática de dados do cliente</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
              onClick={handleToggle}
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

          {/* Content shown when enabled */}
          {enabled && (
            <>
              {/* Taxa de entrega por bairro */}
              <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🚚</span>
                  Taxas de Entrega por Bairro
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Configure os valores de taxa de entrega para cada bairro. Os clientes poderão escolher o bairro de entrega e o valor será calculado automaticamente.
                </p>
                <DeliveryFeesTable 
                  idRestaurante={idRestaurante}
                  bairros={bairros}
                  onUpdate={setBairros}
                />
              </div>

              {/* Link generator */}
              <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Compartilhe o Link do Cardápio
                </h4>
                <WhatsAppLinkGenerator />
              </div>

              {/* How it works */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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

              {/* Virtual table info */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppPage;
