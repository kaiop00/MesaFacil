import { useState, useEffect } from 'react';
import { Show, Hide, DownloadPackage, TrendingDown } from 'react-coolicons';
import { useTranslation } from 'react-i18next';
import { useIngredientes } from '@/hooks/useIngredientes';

const EstoqueInfo = ({ itensPedido, className = '' }) => {
  const { t } = useTranslation();
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const [consumoIngredientes, setConsumoIngredientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { calcularConsumoIngredientes } = useIngredientes();

  useEffect(() => {
    if (itensPedido && itensPedido.length > 0) {
      carregarConsumo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensPedido]);

  const carregarConsumo = async () => {
    setLoading(true);
    try {
      const consumo = await calcularConsumoIngredientes(itensPedido);
      setConsumoIngredientes(consumo);
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      setConsumoIngredientes([]);
    } finally {
      setLoading(false);
    }
  };

  if (!itensPedido || itensPedido.length === 0) {
    return null;
  }

  const temIngredientes = consumoIngredientes.length > 0;

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DownloadPackage className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              {t("common:stock.impact")}
            </span>
            {loading && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          {temIngredientes && (
            <button
              onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
            >
              {mostrarDetalhes ? (
                <>
                  <Hide className="w-3 h-3" />
                  <span>{t("common:stock.hide")}</span>
                </>
              ) : (
                <>
                  <Show className="w-3 h-3" />
                  <span>{t("common:stock.details")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="text-xs text-gray-500">
            {t("common:stock.calculating")}
          </div>
        ) : !temIngredientes ? (
          <div className="text-xs text-gray-500">
            {t("common:stock.noItems")}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">
              {t("common:stock.willConsume")} <strong>{consumoIngredientes.length}</strong> {' '}
              {consumoIngredientes.length === 1 ? t("common:stock.ingredient") : t("common:stock.ingredients")} {t("common:stock.fromStock")}
            </div>

            <div className="space-y-1">
              {consumoIngredientes.slice(0, mostrarDetalhes ? undefined : 3).map((consumo, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <TrendingDown className="w-3 h-3 text-orange-500" />
                    <span className="text-gray-700">{consumo.itemNome}</span>
                  </div>
                  <span className="font-medium text-orange-600">
                    -{consumo.consumoTotal.toFixed(2)} {consumo.unidade.toLowerCase()}
                  </span>
                </div>
              ))}

              {!mostrarDetalhes && consumoIngredientes.length > 3 && (
                <div className="text-xs text-gray-500 italic">
                  {t("common:stock.andMore")} {consumoIngredientes.length - 3} {' '}
                  {consumoIngredientes.length - 3 === 1 ? t("common:stock.ingredient") : t("common:stock.ingredients")}
                </div>
              )}
            </div>

            {mostrarDetalhes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  {t("common:stock.detailsByDish")}
                </div>
                <div className="space-y-3">
                  {consumoIngredientes.map((consumo, index) => (
                    <div key={index} className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-xs text-gray-700 mb-1">
                        {consumo.itemNome} - {t("common:stock.total")}: {consumo.consumoTotal.toFixed(2)} {consumo.unidade.toLowerCase()}
                      </div>
                      <div className="space-y-1">
                        {consumo.detalhes.map((detalhe, detIndex) => (
                          <div key={detIndex} className="flex justify-between text-xs text-gray-600">
                            <span>
                              {detalhe.cardapioItem} (x{detalhe.quantidade})
                            </span>
                            <span>
                              {detalhe.consumoPorPorcao.toFixed(2)} × {detalhe.quantidade} = {detalhe.consumoTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EstoqueInfo;
