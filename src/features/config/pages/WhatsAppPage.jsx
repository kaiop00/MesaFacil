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

const WhatsAppPage = () => {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [taxaEntrega, setTaxaEntrega] = useState('');
  const [taxasPorBairro, setTaxasPorBairro] = useState([]);
  const [novoBairro, setNovoBairro] = useState('');
  const [novoValorBairro, setNovoValorBairro] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await getWhatsAppConfig(idRestaurante);
      setEnabled(config?.enabled || false);
      setTaxaEntrega(config?.taxaEntrega?.toString() || '');
      setTaxasPorBairro(Array.isArray(config?.taxasPorBairro) ? config.taxasPorBairro : []);
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

  const handleSaveTaxaEntrega = async () => {
    try {
      setSaving(true);
      const valor = parseFloat(taxaEntrega.replace(',', '.')) || 0;
      await updateWhatsAppConfig(idRestaurante, { taxaEntrega: valor });
      notify('Taxa de entrega atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar taxa de entrega:', error);
      notify('Erro ao salvar taxa de entrega', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTaxaBairro = () => {
    const bairro = novoBairro.trim();
    const valor = parseFloat(novoValorBairro.replace(',', '.'));

    if (!bairro) {
      notify('Informe o bairro', 'error');
      return;
    }

    if (Number.isNaN(valor) || valor < 0) {
      notify('Informe um valor válido para o bairro', 'error');
      return;
    }

    const alreadyExists = taxasPorBairro.some(
      (item) => item.bairro?.trim().toLowerCase() === bairro.toLowerCase()
    );

    if (alreadyExists) {
      notify('Esse bairro já foi adicionado', 'error');
      return;
    }

    setTaxasPorBairro((prev) => [...prev, { bairro, valor }]);
    setNovoBairro('');
    setNovoValorBairro('');
  };

  const handleRemoveTaxaBairro = (bairroToRemove) => {
    setTaxasPorBairro((prev) => prev.filter((item) => item.bairro !== bairroToRemove));
  };

  const handleSaveTaxasPorBairro = async () => {
    try {
      setSaving(true);
      const payload = taxasPorBairro
        .map((item) => ({
          bairro: (item?.bairro || '').trim(),
          valor: parseFloat(String(item?.valor).replace(',', '.')) || 0
        }))
        .filter((item) => item.bairro);

      await updateWhatsAppConfig(idRestaurante, { taxasPorBairro: payload });
      notify('Taxas por bairro atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar taxas por bairro:', error);
      notify('Erro ao salvar taxas por bairro', 'error');
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
              {/* Taxa de entrega */}
              <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🚚</span>
                  Taxa de Entrega
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Defina uma taxa fixa para pedidos de delivery. A taxa será exibida no resumo do pedido e na comanda impressa.
                </p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="taxaEntrega" className="block text-sm font-medium text-gray-700 mb-1">
                      Valor da taxa (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        id="taxaEntrega"
                        type="text"
                        value={taxaEntrega}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.,]/g, '');
                          setTaxaEntrega(value);
                        }}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe 0 ou vazio para não cobrar taxa de entrega
                    </p>
                  </div>
                  <button
                    onClick={handleSaveTaxaEntrega}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h5 className="font-medium text-gray-900 mb-2">Taxa por Bairro</h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Cadastre bairros com valores fixos. Quando houver bairros cadastrados, o cliente seleciona no checkout e o valor é aplicado automaticamente.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3 mb-4">
                    <input
                      type="text"
                      value={novoBairro}
                      onChange={(e) => setNovoBairro(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={novoValorBairro}
                        onChange={(e) => setNovoValorBairro(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTaxaBairro}
                      className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Bairro</th>
                          <th className="text-left px-4 py-2 font-medium">Valor</th>
                          <th className="text-right px-4 py-2 font-medium">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxasPorBairro.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-gray-500">
                              Nenhum bairro cadastrado.
                            </td>
                          </tr>
                        ) : (
                          taxasPorBairro.map((item) => (
                            <tr key={item.bairro} className="border-t border-gray-100">
                              <td className="px-4 py-2 text-gray-800">{item.bairro}</td>
                              <td className="px-4 py-2 text-gray-800">R$ {(Number(item.valor) || 0).toFixed(2).replace('.', ',')}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTaxaBairro(item.bairro)}
                                  className="text-red-600 hover:text-red-700 font-medium"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTaxasPorBairro}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Salvando...' : 'Salvar bairros'}
                    </button>
                  </div>
                </div>
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
