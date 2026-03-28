import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import { getPedidosDaMesa, finalizarPedidoEspecifico } from "@/features/order/services/orderService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useToast } from "@/hooks/useToast";
import { useServiceFee } from "@/features/cliente/hooks/useServiceFee";
import { useCoverCharge } from "@/features/cliente/hooks/useCoverCharge";
import { doc, updateDoc, collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
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
    extractIfoodCustomerInfo,
    isIfoodOrder
} from "@/features/integrations/ifood/services/ifoodStatusSyncService";
import { User01, Phone, MapPin, ShoppingBag02, Printer } from "react-coolicons";
import IfoodStatusHistory from "@/features/integrations/ifood/components/IfoodStatusHistory";
import IfoodOrderActions from "@/features/integrations/ifood/components/IfoodOrderActions";
import IfoodScheduledBadge from "@/features/integrations/ifood/components/IfoodScheduledBadge";
import IfoodPaymentDetails from "@/features/integrations/ifood/components/IfoodPaymentDetails";
import IfoodBenefitsDetails from "@/features/integrations/ifood/components/IfoodBenefitsDetails";
import IfoodAdditionalFeesDetails from "@/features/integrations/ifood/components/IfoodAdditionalFeesDetails";
import IfoodCustomerDetails from "@/features/integrations/ifood/components/IfoodCustomerDetails";
import PaymentMethodModal from "@/features/order/components/modals/PaymentMethodModal";
import NfceModal from "@/features/order/components/modals/NfceModal";
import { buscarConfigFiscal } from "@/features/fiscal/services/configFiscalService";
import OrderOriginBadge from "@/features/order/components/OrderOriginBadge";
import { useDetailOrderPrint } from "@/features/order/hooks/useDetailOrderPrint";

const DetailOrderModal = ({ isOpen, onClose, mesaSelecionada, idRestaurante, onMesaUpdate }) => {
    const { t } = useTranslation('order');
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [finalizando, setFinalizando] = useState({}); // { [pedidoId]: boolean }
    const [ifoodOrdersInfo, setIfoodOrdersInfo] = useState({}); // { [pedidoId]: ifoodOrderData }
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pedidoParaFinalizar, setPedidoParaFinalizar] = useState(null);
    const [showNfceModal, setShowNfceModal] = useState(false);
    const [nfcePedidoInfo, setNfcePedidoInfo] = useState(null);
    const [nfceDisponivel, setNfceDisponivel] = useState(false);
    const [numeroPessoas, setNumeroPessoas] = useState(1);
    const { notify } = useToast();
    const { printDetailOrder } = useDetailOrderPrint();
    
    // Calcular orderOrigin a partir da mesa ou do primeiro pedido
    const orderOrigin = useMemo(() => {
        // Verificar se a mesa é WhatsApp
        if (mesaSelecionada?.orderOrigin) {
            return mesaSelecionada.orderOrigin;
        }
        // Verificar se há pedidos com origem
        if (pedidos.length > 0 && pedidos[0]?.orderOrigin) {
            return pedidos[0].orderOrigin;
        }
        return null;
    }, [mesaSelecionada, pedidos]);

    // Calcula tipoEntrega (delivery ou retirada) a partir do primeiro pedido WhatsApp
    const tipoEntrega = useMemo(() => {
        if (pedidos.length > 0 && pedidos[0]?.tipoEntrega) {
            return pedidos[0].tipoEntrega;
        }
        return 'delivery'; // default para delivery
    }, [pedidos]);
    
    const {
        percent: serviceFeePercent,
        loading: serviceFeeLoading,
        isExempt: serviceFeeExempt,
    } = useServiceFee(idRestaurante, { 
        enabled: Boolean(idRestaurante), 
        orderOrigin 
    });
    const {
        enabled: coverChargeEnabled,
        value: coverChargeValue,
        loading: coverChargeLoading,
        isExempt: coverChargeExempt,
    } = useCoverCharge(idRestaurante, { enabled: Boolean(idRestaurante), orderOrigin });

    // Sincroniza numeroPessoas com a mesa selecionada
    useEffect(() => {
        if (mesaSelecionada?.numeroPessoas) {
            setNumeroPessoas(mesaSelecionada.numeroPessoas);
        } else {
            setNumeroPessoas(1);
        }
    }, [mesaSelecionada?.id, mesaSelecionada?.numeroPessoas]);

    // Verifica se é delivery (WhatsApp ou iFood)
    const isDelivery = orderOrigin === 'whatsapp' || orderOrigin === 'ifood';

    // Carrega disponibilidade de NFC-e para mostrar ação manual em pedidos entregues.
    useEffect(() => {
        if (!isOpen || !idRestaurante) {
            setNfceDisponivel(false);
            return;
        }

        const carregarConfigFiscal = async () => {
            try {
                const configFiscal = await buscarConfigFiscal(idRestaurante);
                setNfceDisponivel(Boolean(configFiscal?.ativo && configFiscal?.empresaRegistrada));
            } catch (error) {
                console.warn("Erro ao carregar configuração fiscal:", error);
                setNfceDisponivel(false);
            }
        };

        carregarConfigFiscal();
    }, [isOpen, idRestaurante]);

    // Função para atualizar número de pessoas na mesa
    const handleNumeroPessoasChange = useCallback(async (novoNumero) => {
        if (!idRestaurante || !mesaSelecionada?.id) return;
        
        const numero = Math.max(1, Math.min(99, Math.floor(novoNumero)));
        setNumeroPessoas(numero);
        
        try {
            const mesaDocRef = doc(db, "restaurantes", idRestaurante, "mesas", mesaSelecionada.id);
            await updateDoc(mesaDocRef, { numeroPessoas: numero });
            
            // Notifica o componente pai para atualizar a lista de mesas
            if (typeof onMesaUpdate === 'function') {
                onMesaUpdate({ ...mesaSelecionada, numeroPessoas: numero });
            }
        } catch (error) {
            console.error("Erro ao atualizar número de pessoas:", error);
            notify("Erro ao atualizar número de pessoas", "error");
        }
    }, [idRestaurante, mesaSelecionada, onMesaUpdate, notify]);

    // Ref to track active onSnapshot unsubscribers for iFood order docs
    const ifoodUnsubscribersRef = useRef([]);
    
    // Cleanup iFood listeners helper
    const cleanupIfoodListeners = useCallback(() => {
        ifoodUnsubscribersRef.current.forEach(unsub => unsub());
        ifoodUnsubscribersRef.current = [];
    }, []);

    // Real-time listener for mesa pedidos + iFood order data
    useEffect(() => {
        if (!isOpen || !mesaSelecionada?.id || !idRestaurante) {
            setPedidos([]);
            setIfoodOrdersInfo({});
            cleanupIfoodListeners();
            return;
        }

        setLoading(true);
        cleanupIfoodListeners();

        const isIfood = isIfoodOrder(mesaSelecionada.id);

        // Listen to mesa pedidos in real-time
        const pedidosRef = collection(
            db, "restaurantes", idRestaurante, "mesas", mesaSelecionada.id, "pedidos"
        );
        const pedidosQuery = query(pedidosRef);
        
        const unsubPedidos = onSnapshot(pedidosQuery, (snapshot) => {
            const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPedidos(dados);
            setLoading(false);

            if (!isIfood || dados.length === 0) {
                setIfoodOrdersInfo({});
                cleanupIfoodListeners();
                return;
            }

            // For each pedido that has an ifoodOrderId, set up a real-time listener
            // on the corresponding ifoodOrders/{ifoodOrderId} doc.
            // Only add listeners for NEW pedidos that don't have one yet.
            const currentPedidoIds = new Set(dados.map(p => p.ifoodOrderId).filter(Boolean));
            
            // Build listeners for pedidos we haven't subscribed to yet
            const existingListenerIds = new Set(
                ifoodUnsubscribersRef.current.map(u => u._ifoodOrderId)
            );

            for (const pedido of dados) {
                const ifoodOrderId = pedido.ifoodOrderId;
                if (!ifoodOrderId || existingListenerIds.has(ifoodOrderId)) continue;
                
                const ifoodOrderRef = doc(
                    db, "restaurantes", idRestaurante, "ifoodOrders", ifoodOrderId
                );
                
                const unsub = onSnapshot(ifoodOrderRef, (ifoodSnap) => {
                    if (!ifoodSnap.exists()) return;
                    
                    const ifoodOrder = { id: ifoodSnap.id, ...ifoodSnap.data() };
                    
                    setIfoodOrdersInfo(prev => ({
                        ...prev,
                        [pedido.id]: {
                            ...extractIfoodCustomerInfo(ifoodOrder),
                            statusHistory: pedido.ifoodStatusHistory || ifoodOrder.ifoodStatusHistory || [],
                            fullOrder: ifoodOrder,
                            // Use the most authoritative ifoodStatus:
                            // prefer the ifoodOrders doc (updated by actions + polling) 
                            ifoodStatus: ifoodOrder.ifoodStatus || ifoodOrder.status || pedido.ifoodStatus,
                        }
                    }));
                });
                
                // Tag the unsubscriber so we can track which orders we're listening to
                unsub._ifoodOrderId = ifoodOrderId;
                ifoodUnsubscribersRef.current.push(unsub);
            }

            // Also update ifoodOrdersInfo from mesa pedido data (ifoodStatus, statusHistory)
            // This ensures the UI reflects mesa pedido changes even before ifoodOrders listener fires
            setIfoodOrdersInfo(prev => {
                const updated = { ...prev };
                for (const pedido of dados) {
                    if (updated[pedido.id]) {
                        // Merge fresh statusHistory and ifoodStatus from mesa pedido
                        updated[pedido.id] = {
                            ...updated[pedido.id],
                            statusHistory: pedido.ifoodStatusHistory || updated[pedido.id].statusHistory || [],
                            ifoodStatus: updated[pedido.id].fullOrder?.ifoodStatus 
                                || pedido.ifoodStatus 
                                || updated[pedido.id].ifoodStatus,
                        };
                    }
                }
                return updated;
            });
        }, (err) => {
            console.error("❌ Erro ao escutar pedidos:", err);
            setPedidos([]);
            setIfoodOrdersInfo({});
            setLoading(false);
        });

        return () => {
            unsubPedidos();
            cleanupIfoodListeners();
        };
    }, [isOpen, mesaSelecionada?.id, idRestaurante, cleanupIfoodListeners]);

    const handleOpenPaymentModal = (pedidoId) => {
        setPedidoParaFinalizar(pedidoId);
        setShowPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setPedidoParaFinalizar(null);
    };

    const handleOpenNfceModal = useCallback((pedidoId) => {
        if (!mesaSelecionada?.id) return;

        setNfcePedidoInfo({
            mesaId: mesaSelecionada.id,
            pedidoId,
        });
        setShowNfceModal(true);
    }, [mesaSelecionada?.id]);

    const handleConfirmPayment = async (dadosPagamento) => {
        if (!idRestaurante || !mesaSelecionada?.id || !pedidoParaFinalizar) return;
        const pedidoIdFinalizado = pedidoParaFinalizar;
        
        setFinalizando(prev => ({ ...prev, [pedidoParaFinalizar]: true }));
        try {
            await finalizarPedidoEspecifico(
                idRestaurante, 
                mesaSelecionada.id, 
                pedidoIdFinalizado,
                dadosPagamento
            );
            notify(t('messages.success.paymentConfirmed'), "success");
            
            // Recarregar a lista
            const dados = await getPedidosDaMesa(idRestaurante, mesaSelecionada.id);
            setPedidos(dados || []);
            
            // Fechar modal de pagamento
            handleClosePaymentModal();

            // Verificar se NFC-e está ativo e oferecer emissão
            try {
                const configFiscal = await buscarConfigFiscal(idRestaurante);
                if (configFiscal?.ativo && configFiscal?.empresaRegistrada) {
                    setNfcePedidoInfo({
                        mesaId: mesaSelecionada.id,
                        pedidoId: pedidoIdFinalizado,
                    });
                    setShowNfceModal(true);
                } else {
                    notify(t('nfce.hints.configRequiredAfterFinish'), "warning");
                }
            } catch (fiscalErr) {
                // Não bloquear o fluxo se houver erro ao verificar config fiscal
                console.warn("Erro ao verificar config fiscal:", fiscalErr);
                notify(t('nfce.hints.checkConfigError'), "warning");
            }
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
    // Usa o estado local numeroPessoas para o cálculo do couvert
    const valorCouvert = useMemo(
        () => computeCoverChargeAmount(coverChargeEnabled, coverChargeValue, numeroPessoas),
        [coverChargeEnabled, coverChargeValue, numeroPessoas]
    );
    // Calcula a taxa de entrega embutida nos pedidos (para exibição)
    const valorTaxaEntregaEmbutida = useMemo(
        () => pedidos.reduce((acc, pedido) => {
            if (pedido.taxaEntrega?.aplicada && pedido.taxaEntrega?.valor > 0) {
                return acc + Number(pedido.taxaEntrega.valor);
            }
            return acc;
        }, 0),
        [pedidos]
    );
    
    // Total com serviço - NÃO adiciona taxa de entrega pois já está embutida no pedido.total
    const totalComServico = useMemo(
        () => computeTotalWithService(
            totalSemTaxa,
            percentNormalized,
            DEFAULT_SERVICE_FEE_PERCENT,
            valorCouvert,
            0 // Taxa de entrega já está incluída no total dos pedidos
        ),
        [totalSemTaxa, percentNormalized, valorCouvert]
    );
    const formattedPercent = percentNormalized.toLocaleString("pt-BR", {
        minimumFractionDigits: percentNormalized % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
    const serviceLabel = serviceFeeExempt
        ? "Taxa de serviço"
        : percentNormalized > 0
        ? `Taxa de serviço (${formattedPercent}%)`
        : "Taxa de serviço";
    const serviceValueLabel = serviceFeeLoading
        ? t("page.loading")
        : serviceFeeExempt
            ? "Isento"
            : percentNormalized > 0
            ? formatCurrency(valorServico)
            : "Isento";
    const coverLabel = t("cliente:payment.summary.coverCharge");
    const coverValueLabel = coverChargeLoading
        ? t("page.loading")
        : valorCouvert > 0
            ? formatCurrency(valorCouvert)
            : t("cliente:payment.summary.coverChargeNotApplied");
    // Label para taxa de entrega (mostra valor embutido nos pedidos)
    const deliveryFeeLabel = "Taxa de entrega";
    const deliveryFeeValueLabel = valorTaxaEntregaEmbutida > 0
        ? `${formatCurrency(valorTaxaEntregaEmbutida)} (já inclusa)`
        : "Não aplicável";
    const totalComServicoLabel = serviceFeeLoading
        ? t("page.loading")
        : formatCurrency(totalComServico);

    // Calcula o total do pedido específico que está sendo finalizado
    const totalPedidoParaFinalizar = useMemo(() => {
        if (!pedidoParaFinalizar) return 0;
        const pedido = pedidos.find(p => p.id === pedidoParaFinalizar);
        return pedido?.total || 0;
    }, [pedidoParaFinalizar, pedidos]);

    // Handler para imprimir comanda
    const handlePrintComanda = useCallback(() => {
        printDetailOrder({
            mesaNumero: mesaSelecionada?.numero || "-",
            pedidos,
            totalSemTaxa,
            serviceFeePercent: percentNormalized,
            valorServico,
            serviceFeeExempt,
            coverChargeEnabled,
            coverChargeValue,
            numeroPessoas,
            valorCouvert,
            totalComServico,
        });
    }, [printDetailOrder, mesaSelecionada, pedidos, totalSemTaxa, percentNormalized, valorServico, serviceFeeExempt, coverChargeEnabled, coverChargeValue, numeroPessoas, valorCouvert, totalComServico]);

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
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-sm text-gray-800">
                                        {t('modals.orderDetail.title')} Nº {pedido.id}
                                    </p>
                                    {pedido.orderOrigin && (
                                        <OrderOriginBadge 
                                            origin={pedido.orderOrigin} 
                                            size="small" 
                                            tipoEntrega={pedido.tipoEntrega}
                                        />
                                    )}
                                    {pedido.nfceStatus === "autorizado" && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                                            NFC-e ✓
                                        </span>
                                    )}
                                    {pedido.nfceStatus === "rejeitado" && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                            NFC-e ✗
                                        </span>
                                    )}
                                </div>
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

                        {/* WhatsApp Order Client Information */}
                        {pedido.orderOrigin === 'whatsapp' && pedido.cliente && (
                            <div className={`${pedido.tipoEntrega === 'retirada' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-3 space-y-2`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{pedido.tipoEntrega === 'retirada' ? '🏪' : '🛵'}</span>
                                    <span className={`font-semibold ${pedido.tipoEntrega === 'retirada' ? 'text-blue-900' : 'text-green-900'}`}>
                                        {pedido.tipoEntrega === 'retirada' ? 'Pedido WhatsApp - Retirada' : 'Pedido WhatsApp - Entrega'}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    {pedido.cliente.nome && (
                                        <div className="flex items-start gap-2">
                                            <User01 className={`${pedido.tipoEntrega === 'retirada' ? 'text-blue-600' : 'text-green-600'} mt-0.5`} size={16} />
                                            <div>
                                                <span className="text-gray-600">Cliente: </span>
                                                <span className="font-medium">{pedido.cliente.nome}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {pedido.cliente.telefone && (
                                        <div className="flex items-start gap-2">
                                            <Phone className={`${pedido.tipoEntrega === 'retirada' ? 'text-blue-600' : 'text-green-600'} mt-0.5`} size={16} />
                                            <div>
                                                <span className="text-gray-600">Telefone: </span>
                                                <span className="font-medium">{pedido.cliente.telefone}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Endereço estruturado - apenas para delivery */}
                                    {pedido.tipoEntrega !== 'retirada' && pedido.cliente.enderecoDetalhado ? (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="text-green-600 mt-0.5" size={16} />
                                            <div className="flex-1">
                                                <span className="text-gray-600">Endereço: </span>
                                                <div className="font-medium">
                                                    <p>
                                                        {pedido.cliente.enderecoDetalhado.rua}
                                                        {pedido.cliente.enderecoDetalhado.numero && `, ${pedido.cliente.enderecoDetalhado.numero}`}
                                                        {pedido.cliente.enderecoDetalhado.complemento && ` - ${pedido.cliente.enderecoDetalhado.complemento}`}
                                                    </p>
                                                    <p className="text-gray-700">
                                                        {pedido.cliente.enderecoDetalhado.bairro}
                                                        {pedido.cliente.enderecoDetalhado.cidade && `, ${pedido.cliente.enderecoDetalhado.cidade}`}
                                                    </p>
                                                    {pedido.cliente.enderecoDetalhado.pontoReferencia && (
                                                        <p className="text-xs text-gray-500 mt-1 italic">
                                                            📍 Ref: {pedido.cliente.enderecoDetalhado.pontoReferencia}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : pedido.tipoEntrega !== 'retirada' && pedido.cliente.endereco && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="text-green-600 mt-0.5" size={16} />
                                            <div>
                                                <span className="text-gray-600">Endereço: </span>
                                                <span className="font-medium">{pedido.cliente.endereco}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mensagem de retirada */}
                                    {pedido.tipoEntrega === 'retirada' && (
                                        <div className="flex items-start gap-2 p-2 bg-blue-100 rounded-lg">
                                            <span className="text-blue-600 mt-0.5">📍</span>
                                            <div className="text-blue-800">
                                                <span className="font-medium">Cliente retirará no local</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {pedido.formaPagamento && (
                                        <div className={`mt-1 pt-2 border-t ${pedido.tipoEntrega === 'retirada' ? 'border-blue-200' : 'border-green-200'}`}>
                                            <span className="text-gray-600">Pagamento: </span>
                                            <span className={`font-semibold ${pedido.tipoEntrega === 'retirada' ? 'text-blue-700' : 'text-green-700'}`}>
                                                {pedido.formaPagamento === 'dinheiro' 
                                                    ? `Dinheiro (${pedido.tipoEntrega === 'retirada' ? 'no local' : 'na entrega'})` 
                                                    : pedido.formaPagamento === 'credito'
                                                        ? 'Cartão de Crédito'
                                                        : pedido.formaPagamento === 'debito'
                                                            ? 'Cartão de Débito'
                                                            : pedido.formaPagamento === 'pix'
                                                                ? 'PIX'
                                                                : pedido.formaPagamento}
                                            </span>
                                        </div>
                                    )}

                                    {/* Informações de troco */}
                                    {pedido.troco?.precisaTroco && (
                                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-yellow-800">💵 Troco para:</span>
                                                <span className="font-bold text-yellow-900">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.troco.valorPagamento || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mt-1">
                                                <span className="text-green-800">🔄 Levar troco de:</span>
                                                <span className="font-bold text-green-700">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.troco.valorTroco || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                    {/* Order Type Badge */}
                                    {ifoodOrdersInfo[pedido.id].fullOrder?.orderType === "TAKEOUT" && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                            🏪 Retirada
                                        </span>
                                    )}
                                </div>
                                
                                {/* Scheduled Order Alert - Prominent Display */}
                                {ifoodOrdersInfo[pedido.id].fullOrder && (
                                    <IfoodScheduledBadge
                                        isScheduled={ifoodOrdersInfo[pedido.id].fullOrder.isScheduled}
                                        scheduledFor={ifoodOrdersInfo[pedido.id].fullOrder.scheduledFor}
                                        scheduledForEnd={ifoodOrdersInfo[pedido.id].fullOrder.scheduledForEnd}
                                        schedule={ifoodOrdersInfo[pedido.id].fullOrder.schedule}
                                        orderTiming={ifoodOrdersInfo[pedido.id].fullOrder.orderTiming}
                                        variant="card"
                                    />
                                )}
                                
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    {/* Complete Customer Details (all iFood consumer data) */}
                                    <IfoodCustomerDetails
                                        customerInfo={ifoodOrdersInfo[pedido.id]}
                                        orderType={ifoodOrdersInfo[pedido.id].fullOrder?.orderType || "DELIVERY"}
                                    />
                                </div>
                                
                                {/* iFood Payment Details */}
                                {ifoodOrdersInfo[pedido.id].fullOrder && (
                                    <IfoodPaymentDetails
                                        payments={ifoodOrdersInfo[pedido.id].fullOrder.payments}
                                        orderTotal={ifoodOrdersInfo[pedido.id].fullOrder.total?.orderAmount || 0}
                                        rawData={ifoodOrdersInfo[pedido.id].fullOrder.rawData}
                                    />
                                )}
                                
                                {/* iFood Benefits/Coupons Details */}
                                {ifoodOrdersInfo[pedido.id].fullOrder && (
                                    <IfoodBenefitsDetails
                                        benefits={ifoodOrdersInfo[pedido.id].fullOrder.benefits}
                                        totalBenefits={ifoodOrdersInfo[pedido.id].fullOrder.total?.benefits || 0}
                                        rawData={ifoodOrdersInfo[pedido.id].fullOrder.rawData}
                                    />
                                )}

                                {/* iFood Additional Fees Details */}
                                {ifoodOrdersInfo[pedido.id].fullOrder && (
                                    <IfoodAdditionalFeesDetails
                                        additionalFees={ifoodOrdersInfo[pedido.id].fullOrder.additionalFees}
                                        totalAdditionalFees={ifoodOrdersInfo[pedido.id].fullOrder.total?.additionalFees || 0}
                                        rawData={ifoodOrdersInfo[pedido.id].fullOrder.rawData}
                                    />
                                )}
                                
                                {/* iFood Status History */}
                                {ifoodOrdersInfo[pedido.id].statusHistory && 
                                 ifoodOrdersInfo[pedido.id].statusHistory.length > 0 && (
                                    <IfoodStatusHistory 
                                        statusHistory={ifoodOrdersInfo[pedido.id].statusHistory}
                                        currentStatus={ifoodOrdersInfo[pedido.id].ifoodStatus}
                                    />
                                )}
                                
                                {/* iFood Order Actions */}
                                {ifoodOrdersInfo[pedido.id].fullOrder && (
                                    <IfoodOrderActions
                                        idRestaurante={idRestaurante}
                                        ifoodOrderId={ifoodOrdersInfo[pedido.id].fullOrder.ifoodOrderId}
                                        currentStatus={ifoodOrdersInfo[pedido.id].ifoodStatus}
                                        orderType={ifoodOrdersInfo[pedido.id].fullOrder.orderType || "DELIVERY"}
                                        onActionComplete={() => {
                                            // No manual reload needed — real-time listeners on
                                            // ifoodOrders and mesa pedidos auto-update the UI.
                                            // The action Cloud Function updates both collections,
                                            // and our onSnapshot listeners pick up the changes.
                                        }}
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

                        {/* Exibição do total com taxa de entrega individual quando aplicável */}
                        <div className="space-y-1">
                            {pedido.taxaEntrega?.aplicada && pedido.taxaEntrega?.valor > 0 ? (
                                <>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal:</span>
                                        <span>
                                            {formatCurrency(
                                                Number(pedido.total || 0) - Number(pedido.taxaEntrega.valor || 0)
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Taxa de entrega:</span>
                                        <span>{formatCurrency(pedido.taxaEntrega.valor)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-200">
                                        <span>{t('modals.orderDetail.total')}:</span>
                                        <span>{formatCurrency(pedido.total || 0)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between font-semibold">
                                    <span>{t('modals.orderDetail.total')}:</span>
                                    <span className="text-gray-800">
                                        {formatCurrency(
                                            Number(
                                                pedido.total ??
                                                (pedido.items?.reduce(
                                                    (sum, item) =>
                                                        sum + (item.price || 0) * (item.quantity || 1),
                                                    0
                                                ) || 0)
                                            )
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Observations - hide for iFood orders since IfoodCustomerDetails already shows all info */}
                        {pedido.observacoes && !ifoodOrdersInfo[pedido.id] && (
                            <p>{t('modals.orderDetail.observations')}: {pedido.observacoes}</p>
                        )}

                        {(pedido.status === 'andamento' || pedido.status === 'entregue') && (
                            <div className="space-y-2">
                                {pedido.status === 'andamento' && nfceDisponivel && (
                                    <p className="text-xs text-emerald-700 text-right">
                                        {t('nfce.hints.availableAfterFinish')}
                                    </p>
                                )}
                                <div className="flex justify-end gap-2">
                                {pedido.status === 'entregue' && nfceDisponivel && pedido.nfceStatus !== "autorizado" && (
                                    <button
                                        onClick={() => handleOpenNfceModal(pedido.id)}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                                    >
                                        {pedido.nfceStatus === "rejeitado"
                                            ? t('modals.orderDetail.buttons.retryNfce')
                                            : t('modals.orderDetail.buttons.emitNfce')}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleOpenPaymentModal(pedido.id)}
                                    disabled={!!finalizando[pedido.id]}
                                    className="px-4 py-2 bg-primary-dynamic text-white rounded disabled:bg-gray-300 cursor-pointer"
                                >
                                    {finalizando[pedido.id] ? t('page.loading') : t('modals.orderDetail.buttons.finishOrder')}
                                </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!loading && pedidos.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-lg bg-slate-50 p-4 space-y-3 text-gray-900">
                    {/* Seletor de número de pessoas - apenas para mesas convencionais com couvert ativo */}
                    {!isDelivery && coverChargeEnabled && (
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                            <span className="text-sm font-medium text-gray-700">
                                👥 Pessoas na mesa
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleNumeroPessoasChange(numeroPessoas - 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold disabled:opacity-50 transition-colors"
                                    disabled={numeroPessoas <= 1}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={numeroPessoas}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1 && val <= 99) {
                                            handleNumeroPessoasChange(val);
                                        }
                                    }}
                                    className="w-14 text-center text-base font-semibold border border-gray-300 rounded-md py-1"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleNumeroPessoasChange(numeroPessoas + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold disabled:opacity-50 transition-colors"
                                    disabled={numeroPessoas >= 99}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between font-semibold">
                        <span>Valor sem taxa</span>
                        <span>{formatCurrency(totalSemTaxa)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span>{serviceLabel}</span>
                        <span>{serviceValueLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span>{coverLabel}{!isDelivery && coverChargeEnabled && numeroPessoas > 1 ? ` (${numeroPessoas}x)` : ''}</span>
                        <span>{coverValueLabel}</span>
                    </div>
                    {/* Taxa de entrega - mostra quando há taxa embutida nos pedidos */}
                    {valorTaxaEntregaEmbutida > 0 && (
                        <div className="flex justify-between text-sm font-medium text-gray-500">
                            <span>🚚 {deliveryFeeLabel}</span>
                            <span>{deliveryFeeValueLabel}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold">
                        <span>Total com taxa</span>
                        <span>{totalComServicoLabel}</span>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
                {!loading && pedidos.length > 0 && !isDelivery && (
                    <button
                        onClick={handlePrintComanda}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-300 rounded hover:bg-amber-100 text-amber-600 font-semibold cursor-pointer"
                    >
                        <Printer size={18} />
                        {t('modals.orderDetail.buttons.print') || 'Imprimir'}
                    </button>
                )}
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
                totalValue={totalPedidoParaFinalizar}
                loading={!!finalizando[pedidoParaFinalizar]}
                nfceDisponivel={nfceDisponivel}
            />

            {/* Modal de NFC-e */}
            <NfceModal
                isOpen={showNfceModal}
                onClose={() => {
                    setShowNfceModal(false);
                    setNfcePedidoInfo(null);
                }}
                idRestaurante={idRestaurante}
                mesaId={nfcePedidoInfo?.mesaId}
                pedidoId={nfcePedidoInfo?.pedidoId}
            />
        </BaseModalWithHeader>
    );
};

export default DetailOrderModal;
