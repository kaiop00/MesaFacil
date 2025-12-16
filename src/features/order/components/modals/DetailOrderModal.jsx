import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import { getPedidosDaMesa, finalizarPedidoEspecifico } from "@/features/order/services/orderService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useToast } from "@/hooks/useToast";
import { useServiceFee } from "@/features/cliente/hooks/useServiceFee";
import { useCoverCharge } from "@/features/cliente/hooks/useCoverCharge";
import {
    computeTotalPedidos,
    computeServiceFeeAmount,
    computeTotalWithService,
    computeCoverChargeAmount,
    normalizeServicePercentage,
    DEFAULT_SERVICE_FEE_PERCENT,
    formatCurrency,
} from "@/features/cliente/utils/pedidos";
import { 
    getIfoodOrderForMesaFacilOrder, 
    extractIfoodCustomerInfo,
    formatIfoodStatus,
    isIfoodOrder
} from "@/features/integrations/ifood/services/ifoodStatusSyncService";
import { User01, Phone, MapPin, ShoppingBag02 } from "react-coolicons";
import IfoodStatusHistory from "@/features/integrations/ifood/components/IfoodStatusHistory";
import PaymentMethodModal from "@/features/order/components/modals/PaymentMethodModal";

const DetailOrderModal = ({ isOpen, onClose, mesaSelecionada, idRestaurante }) => {
    const { t } = useTranslation('order');
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [finalizando, setFinalizando] = useState({}); // { [pedidoId]: boolean }
    const [ifoodOrdersInfo, setIfoodOrdersInfo] = useState({}); // { [pedidoId]: ifoodOrderData }
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pedidoParaFinalizar, setPedidoParaFinalizar] = useState(null);
    const { notify } = useToast();
    const {
        percent: serviceFeePercent,
        loading: serviceFeeLoading,
    } = useServiceFee(idRestaurante, { enabled: Boolean(idRestaurante) });
    const {
        enabled: coverChargeEnabled,
        value: coverChargeValue,
        loading: coverChargeLoading,
    } = useCoverCharge(idRestaurante, { enabled: Boolean(idRestaurante) });

    useEffect(() => {
        const fetchPedidos = async () => {
            if (isOpen && mesaSelecionada?.id && idRestaurante) {
                setLoading(true);
                try {
                    const dados = await getPedidosDaMesa(idRestaurante, mesaSelecionada.id);
                    setPedidos(dados || []);
                    
                    // If this is an iFood table, fetch iFood order information
                    if (isIfoodOrder(mesaSelecionada.id) && dados && dados.length > 0) {
                        const ifoodInfoMap = {};
                        
                        for (const pedido of dados) {
                            try {
                                const ifoodOrder = await getIfoodOrderForMesaFacilOrder(idRestaurante, pedido.id);
                                if (ifoodOrder) {
                                    // Store both customer info and full order data for history
                                    ifoodInfoMap[pedido.id] = {
                                        ...extractIfoodCustomerInfo(ifoodOrder),
                                        statusHistory: pedido.ifoodStatusHistory || [],
                                        fullOrder: ifoodOrder
                                    };
                                }
                            } catch (error) {
                                console.error('Error fetching iFood order info:', error);
                            }
                        }
                        
                        setIfoodOrdersInfo(ifoodInfoMap);
                    } else {
                        setIfoodOrdersInfo({});
                    }
                } catch (error) {
                    console.error("❌ Erro ao buscar pedidos:", error);
                    setPedidos([]);
                    setIfoodOrdersInfo({});
                } finally {
                    setLoading(false);
                }
            } else {
                setPedidos([]);
                setIfoodOrdersInfo({});
            }
        };

        fetchPedidos();
    }, [isOpen, mesaSelecionada, idRestaurante]);

    const handleOpenPaymentModal = (pedidoId) => {
        setPedidoParaFinalizar(pedidoId);
        setShowPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setPedidoParaFinalizar(null);
    };

    const handleConfirmPayment = async (dadosPagamento) => {
        if (!idRestaurante || !mesaSelecionada?.id || !pedidoParaFinalizar) return;
        
        setFinalizando(prev => ({ ...prev, [pedidoParaFinalizar]: true }));
        try {
            await finalizarPedidoEspecifico(
                idRestaurante, 
                mesaSelecionada.id, 
                pedidoParaFinalizar,
                dadosPagamento
            );
            notify(t('messages.success.paymentConfirmed'), "success");
            
            // Recarregar a lista
            const dados = await getPedidosDaMesa(idRestaurante, mesaSelecionada.id);
            setPedidos(dados || []);
            
            // Fechar modal de pagamento
            handleClosePaymentModal();
        } catch (error) {
            console.error("Erro ao finalizar pedido:", error);
            notify(t('messages.error.finishOrder'), "error");
        } finally {
            setFinalizando(prev => ({ ...prev, [pedidoParaFinalizar]: false }));
        }
    };

    const totalSemTaxa = useMemo(() => computeTotalPedidos(pedidos), [pedidos]);
    const percentNormalized = useMemo(
        () => normalizeServicePercentage(serviceFeePercent, DEFAULT_SERVICE_FEE_PERCENT),
        [serviceFeePercent]
    );
    const valorServico = useMemo(
        () => computeServiceFeeAmount(totalSemTaxa, percentNormalized, DEFAULT_SERVICE_FEE_PERCENT),
        [totalSemTaxa, percentNormalized]
    );
    const valorCouvert = useMemo(
        () => computeCoverChargeAmount(coverChargeEnabled, coverChargeValue),
        [coverChargeEnabled, coverChargeValue]
    );
    const totalComServico = useMemo(
        () => computeTotalWithService(
            totalSemTaxa,
            percentNormalized,
            DEFAULT_SERVICE_FEE_PERCENT,
            valorCouvert
        ),
        [totalSemTaxa, percentNormalized, valorCouvert]
    );
    const formattedPercent = percentNormalized.toLocaleString("pt-BR", {
        minimumFractionDigits: percentNormalized % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
    const serviceLabel = percentNormalized > 0
        ? `Taxa de serviço (${formattedPercent}%)`
        : "Taxa de serviço";
    const serviceValueLabel = serviceFeeLoading
        ? t("page.loading")
        : percentNormalized > 0
            ? formatCurrency(valorServico)
            : "Isento";
    const coverLabel = t("cliente:payment.summary.coverCharge");
    const coverValueLabel = coverChargeLoading
        ? t("page.loading")
        : valorCouvert > 0
            ? formatCurrency(valorCouvert)
            : t("cliente:payment.summary.coverChargeNotApplied");
    const totalComServicoLabel = serviceFeeLoading
        ? t("page.loading")
        : formatCurrency(totalComServico);

    return (
        <BaseModalWithHeader
            isOpen={!!isOpen}
            onClose={onClose}
            title={`${t('modals.orderDetail.title')} ${t('tables.tableLetter', { letter: mesaSelecionada?.numero || "-" })}`}
            subTitle="Relação de pedidos dessa mesa"
        >
            <div className="space-y-6 font-inter">
                {loading && (
                    <div className="flex flex-col justify-center items-center gap-2 py-4">
                        <p className="text-center text-gray-500">{t('page.loading')}</p>
                        <LoadingSpinnerDynamic size={10}/>
                    </div>
                )}

                {!loading && pedidos.length === 0 && (
                    <p className="text-center text-gray-500">{t('modals.orderDetail.noItems')}</p>
                )}

                {!loading && pedidos.map((pedido) => (
                    <div
                        key={pedido.id}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-sm text-gray-800">
                                    {t('modals.orderDetail.title')} Nº {pedido.id}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Criado em:{" "}
                                    {pedido.criadoEm?.toDate
                                        ? pedido.criadoEm.toDate().toLocaleString()
                                        : "-"}
                                </p>
                                <p className="text-xs text-gray-500 italic">
                                    {t('modals.orderDetail.status')}: {pedido.status || "-"}
                                </p>
                            </div>
                        </div>

                        {/* iFood Order Information */}
                        {ifoodOrdersInfo[pedido.id] && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShoppingBag02 className="text-orange-600" size={20} />
                                    <span className="font-semibold text-orange-900">Pedido iFood</span>
                                    {ifoodOrdersInfo[pedido.id].displayId && (
                                        <span className="text-sm text-orange-700">
                                            #{ifoodOrdersInfo[pedido.id].displayId}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    {ifoodOrdersInfo[pedido.id].name && (
                                        <div className="flex items-start gap-2">
                                            <User01 className="text-orange-600 mt-0.5" size={16} />
                                            <div>
                                                <span className="text-gray-600">Cliente: </span>
                                                <span className="font-medium">{ifoodOrdersInfo[pedido.id].name}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {ifoodOrdersInfo[pedido.id].phone && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="text-orange-600 mt-0.5" size={16} />
                                            <div>
                                                <span className="text-gray-600">Telefone: </span>
                                                <span className="font-medium">{ifoodOrdersInfo[pedido.id].phone}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {ifoodOrdersInfo[pedido.id].address && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="text-orange-600 mt-0.5" size={16} />
                                            <div>
                                                <span className="text-gray-600">Endereço: </span>
                                                <span className="font-medium">{ifoodOrdersInfo[pedido.id].address}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {ifoodOrdersInfo[pedido.id].ifoodStatus && (
                                        <div className="mt-1 pt-2 border-t border-orange-200">
                                            <span className="text-gray-600">Status iFood: </span>
                                            <span className="font-semibold text-orange-700">
                                                {formatIfoodStatus(ifoodOrdersInfo[pedido.id].ifoodStatus)}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {ifoodOrdersInfo[pedido.id].observations && (
                                        <div className="mt-1 pt-2 border-t border-orange-200">
                                            <span className="text-gray-600">Observações: </span>
                                            <span className="text-gray-800 italic">{ifoodOrdersInfo[pedido.id].observations}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* iFood Status History */}
                                {ifoodOrdersInfo[pedido.id].statusHistory && 
                                 ifoodOrdersInfo[pedido.id].statusHistory.length > 0 && (
                                    <IfoodStatusHistory 
                                        statusHistory={ifoodOrdersInfo[pedido.id].statusHistory}
                                        currentStatus={ifoodOrdersInfo[pedido.id].ifoodStatus}
                                    />
                                )}
                            </div>
                        )}

                        <OrderItemsList
                            items={pedido.items || []}
                            updateItemQuantity={() => { }} // Desativado
                            removeItem={() => { }}         // Desativado
                            readOnly                       // Flag de só leitura
                        />

                        <div>
                            <p className="font-semibold text-sm">{t('modals.orderDetail.total')}</p>
                            <p className="text-gray-800 font-bold">
                                R$
                                {
                                    Number(
                                        pedido.total ??
                                        (
                                            pedido.items?.reduce(
                                                (sum, item) =>
                                                    sum + (item.price || 0) * (item.quantity || 1),
                                                0
                                            )
                                        )
                                    ).toFixed(2)
                                }
                            </p>
                        </div>
                        <p>{t('modals.orderDetail.observations')}: {pedido.observacoes}</p>

                        {pedido.status === 'andamento' && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleOpenPaymentModal(pedido.id)}
                                    disabled={!!finalizando[pedido.id]}
                                    className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                                >
                                    {finalizando[pedido.id] ? t('page.loading') : t('modals.orderDetail.buttons.finishOrder')}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!loading && pedidos.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-lg bg-slate-50 p-4 space-y-2 text-gray-900">
                    <div className="flex justify-between font-semibold">
                        <span>Valor sem taxa</span>
                        <span>{formatCurrency(totalSemTaxa)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span>{serviceLabel}</span>
                        <span>{serviceValueLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span>{coverLabel}</span>
                        <span>{coverValueLabel}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span>Total com taxa</span>
                        <span>{totalComServicoLabel}</span>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-[#334155] font-semibold cursor-pointer"
                >
                    {t('modals.orderDetail.buttons.close')}
                </button>
            </div>

            {/* Modal de Forma de Pagamento */}
            <PaymentMethodModal
                isOpen={showPaymentModal}
                onClose={handleClosePaymentModal}
                onConfirm={handleConfirmPayment}
                mesaNumero={mesaSelecionada?.numero}
                totalValue={totalComServico}
                loading={!!finalizando[pedidoParaFinalizar]}
            />
        </BaseModalWithHeader>
    );
};

export default DetailOrderModal;
