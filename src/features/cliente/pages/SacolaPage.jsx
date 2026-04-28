import { useRef, useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCarrinho } from "../context/CarrinhoContext";
import CardCarrinho from "../components/CardCarrinho";
import CarrinhoFooter from "../layout/CarrinhoFooter";
import { createPedido } from "@/features/order/services/orderService";
import { useCliente } from "../context/ClienteContext";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { useOrderOrigin } from "@/hooks/useOrderOrigin";
import ClientDataForm from "../components/ClientDataForm";
import { useDeliveryFee } from "../hooks/useDeliveryFee";
import { computeDeliveryFeeAmount, formatCurrency } from "../utils/pedidos";

export default function SacolaPage() {
    const { t } = useTranslation("cliente");
    const { notify } = useToast();
    const { mesaId, idRestaurante } = useCliente();
    const navigate = useNavigate();
    const location = useLocation();
    const { slug } = useParams();
    const {
        carrinhoItems,
        limparCarrinho,
        total,
        incrementarQuantidadeCarrinho,
        decrementarQuantidadeCarrinho,
        orderOrigin,
        setOrderOrigin,
        clientData,
        setClientData,
    } = useCarrinho();
    const observacoesRef = useRef();
    const [loading, setLoading] = useState(false);
    const { origin, isWhatsApp } = useOrderOrigin();
    const [clientFormData, setClientFormData] = useState(null);
    const [isClientFormValid, setIsClientFormValid] = useState(false);
    const [formaPagamento, setFormaPagamento] = useState('dinheiro');
    const [precisaTroco, setPrecisaTroco] = useState(false);
    const [valorPagamento, setValorPagamento] = useState('');
    const [tipoEntrega, setTipoEntrega] = useState('delivery'); // 'delivery' ou 'retirada'
    const isRetirada = tipoEntrega === 'retirada';

    // Hook para taxa de entrega por bairro (somente para WhatsApp delivery)
    const {
        bairros,
        selectedBairro,
        setSelectedBairro,
        loading: deliveryFeeLoading,
        isApplicable: deliveryFeeApplicable,
        getDeliveryFeeValue,
    } = useDeliveryFee(idRestaurante, {
        enabled: Boolean(idRestaurante) && isWhatsApp,
        orderOrigin: origin,
        tipoEntrega
    });

    // Calcula o valor da taxa de entrega baseado no bairro selecionado
    const valorTaxaEntrega = useMemo(
        () => computeDeliveryFeeAmount(deliveryFeeApplicable, getDeliveryFeeValue()),
        [deliveryFeeApplicable, getDeliveryFeeValue]
    );

    // Total com taxa de entrega
    const totalComTaxaEntrega = useMemo(
        () => total + valorTaxaEntrega,
        [total, valorTaxaEntrega]
    );

    // Calcula o troco automaticamente (baseado no total com taxa)
    const valorTroco = precisaTroco && valorPagamento 
        ? Math.max(0, parseFloat(valorPagamento.replace(',', '.')) - totalComTaxaEntrega)
        : 0;

    // Sincroniza origem do pedido
    useEffect(() => {
        setOrderOrigin(origin);
    }, [origin, setOrderOrigin]);

    const handleClientDataChange = (data, isValid) => {
        setClientFormData(data);
        setIsClientFormValid(isValid);
    };

    async function handleSubmit(e) {
        e.preventDefault();

        if (carrinhoItems.length === 0) {
            console.warn("Carrinho vazio. Nada foi enviado.");
            return;
        }

        // Valida dados do cliente para pedidos WhatsApp
        // Para retirada, validação é mais simples (sem endereço)
        if (isWhatsApp && !isClientFormValid) {
            notify(isRetirada 
                ? "Por favor, preencha seus dados para retirada" 
                : "Por favor, preencha todos os dados de entrega", 
                "error"
            );
            return;
        }

        // Valida seleção de bairro para delivery
        if (isWhatsApp && tipoEntrega === 'delivery' && !selectedBairro) {
            notify("Por favor, selecione um bairro para entrega", "error");
            return;
        }

        setLoading(true);
        try {
            const observacoes = (observacoesRef.current?.value || "").trim();
            
            // Prepara dados extras para pedidos WhatsApp
            const extraData = isWhatsApp ? {
                orderOrigin: 'whatsapp',
                tipoEntrega: tipoEntrega, // 'delivery' ou 'retirada'
                cliente: {
                    nome: clientFormData?.nome || '',
                    cpf: clientFormData?.cpf || '', // Mantém CPF formatado
                    // Para retirada, não precisa de endereço
                    endereco: isRetirada ? '' : (clientFormData?.endereco || ''),
                    enderecoDetalhado: isRetirada ? null : (clientFormData?.enderecoDetalhado || null),
                    telefone: clientFormData?.telefone || '', // Mantém telefone formatado
                },
                formaPagamento: formaPagamento,
                // Dados de troco (apenas para dinheiro)
                troco: formaPagamento === 'dinheiro' && precisaTroco ? {
                    precisaTroco: true,
                    valorPagamento: parseFloat(valorPagamento.replace(',', '.')) || 0,
                    valorTroco: valorTroco
                } : null,
                // Taxa de entrega (apenas para delivery)
                taxaEntrega: tipoEntrega === 'delivery' ? {
                    valor: valorTaxaEntrega,
                    aplicada: deliveryFeeApplicable && valorTaxaEntrega > 0,
                    bairro: selectedBairro?.nome || ''
                } : null
            } : {
                orderOrigin: orderOrigin
            };

            await createPedido(
                idRestaurante,
                mesaId,
                carrinhoItems,
                totalComTaxaEntrega, // Usa o total com a taxa de entrega
                observacoes,
                extraData
            );
            notify(t("sacola.orderSent"), "success");
            limparCarrinho();
            const search = location.search || "";
            const target = slug ? `/mesa/${slug}/pedido${search}` : `../pedido${search}`;
            navigate(target, { replace: true });
        } catch (error) {
            console.error("Erro ao enviar pedido: ", error);
            notify(t("sacola.orderError"), "error");
        } finally {
            setLoading(false);
        }
    }

    const vazio = carrinhoItems.length === 0;

    return (
        <div className="flex flex-col p-4 gap-4 pb-48 md:px-6 lg:px-8 max-w-6xl mx-auto">
            <h1 className="text-lg font-semibold md:text-xl">{t("sacola.title")}</h1>

            {vazio ? (
                <p className="text-sm text-gray-600">
                    {t("sacola.empty")}
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* GRID RESPONSIVO: 1 (mobile), 2 (tablet e desktop) */}
                    <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                        {carrinhoItems.map((item) => (
                            <CardCarrinho
                                key={item.id}
                                item={item}
                                onIncrement={() => incrementarQuantidadeCarrinho(item.id)}
                                onDecrement={() => decrementarQuantidadeCarrinho(item.id)}
                            />
                        ))}
                    </div>

                    {/* Seção WhatsApp: Tipo de entrega, dados e pagamento */}
                    {isWhatsApp && (
                        <>
                            {/* Seletor de Tipo de Entrega (Delivery ou Retirada) */}
                            <div className="flex flex-col gap-3 p-4 border border-gray-300 rounded-md bg-gray-50">
                                <label className="text-sm font-medium text-gray-700">
                                    Como deseja receber seu pedido?
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTipoEntrega('delivery')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                            tipoEntrega === 'delivery'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl">🛵</span>
                                        <span className="font-semibold text-sm">Delivery</span>
                                        <span className="text-xs text-center">Receba em casa</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTipoEntrega('retirada')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                            tipoEntrega === 'retirada'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl">🏪</span>
                                        <span className="font-semibold text-sm">Retirada</span>
                                        <span className="text-xs text-center">Retire no local</span>
                                    </button>
                                </div>
                            </div>

                            {/* Formulário de dados do cliente */}
                            <ClientDataForm 
                                onDataChange={handleClientDataChange}
                                isRequired={true}
                                isRetirada={isRetirada}
                                bairros={bairros}
                                selectedBairro={selectedBairro}
                                setSelectedBairro={setSelectedBairro}
                                deliveryFeeLoading={deliveryFeeLoading}
                                tipoEntrega={tipoEntrega}
                            />
                            
                            {/* Seletor de Forma de Pagamento */}
                            <div className="flex flex-col gap-2 p-4 border border-gray-300 rounded-md bg-gray-50">
                                <label className="text-sm font-medium text-gray-700">
                                    Forma de Pagamento {isRetirada ? '(no local)' : '(na entrega)'}
                                </label>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="formaPagamento"
                                            value="pix"
                                            checked={formaPagamento === 'pix'}
                                            onChange={(e) => setFormaPagamento(e.target.value)}
                                            className="w-4 h-4 text-[#D9A23B] focus:ring-[#D9A23B]"
                                        />
                                        <span className="text-sm">PIX</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="formaPagamento"
                                            value="dinheiro"
                                            checked={formaPagamento === 'dinheiro'}
                                            onChange={(e) => {
                                                setFormaPagamento(e.target.value);
                                            }}
                                            className="w-4 h-4 text-[#D9A23B] focus:ring-[#D9A23B]"
                                        />
                                        <span className="text-sm">Dinheiro</span>
                                    </label>

                                    {/* Seção de troco - apenas para dinheiro */}
                                    {formaPagamento === 'dinheiro' && (
                                        <div className="ml-6 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={precisaTroco}
                                                    onChange={(e) => {
                                                        setPrecisaTroco(e.target.checked);
                                                        if (!e.target.checked) setValorPagamento('');
                                                    }}
                                                    className="w-4 h-4 text-[#D9A23B] focus:ring-[#D9A23B] rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Precisa de troco?</span>
                                            </label>

                                            {precisaTroco && (
                                                <div className="mt-3 space-y-2">
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">
                                                            Vai pagar com quanto?
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={valorPagamento}
                                                                onChange={(e) => {
                                                                    // Permite apenas números e vírgula/ponto
                                                                    const value = e.target.value.replace(/[^0-9,.]/, '');
                                                                    setValorPagamento(value);
                                                                }}
                                                                placeholder="0,00"
                                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:border-[#D9A23B] focus:ring-[#D9A23B] focus:outline-none focus:ring-2 focus:ring-opacity-20"
                                                            />
                                                        </div>
                                                    </div>

                                                    {valorPagamento && parseFloat(valorPagamento.replace(',', '.')) >= total && (
                                                        <div className="flex justify-between items-center p-2 bg-green-100 border border-green-300 rounded text-sm">
                                                            <span className="text-green-800 font-medium">Troco:</span>
                                                            <span className="text-green-800 font-bold">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTroco)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {valorPagamento && parseFloat(valorPagamento.replace(',', '.')) < total && (
                                                        <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                                                            O valor deve ser maior ou igual ao total do pedido
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="formaPagamento"
                                            value="credito"
                                            checked={formaPagamento === 'credito'}
                                            onChange={(e) => setFormaPagamento(e.target.value)}
                                            className="w-4 h-4 text-[#D9A23B] focus:ring-[#D9A23B]"
                                        />
                                        <span className="text-sm">Cartão de crédito</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="formaPagamento"
                                            value="debito"
                                            checked={formaPagamento === 'debito'}
                                            onChange={(e) => setFormaPagamento(e.target.value)}
                                            className="w-4 h-4 text-[#D9A23B] focus:ring-[#D9A23B]"
                                        />
                                        <span className="text-sm">Cartão de débito</span>
                                    </label>
                                </div>
                            </div>

                            {/* Resumo com Taxa de Entrega - apenas para delivery */}
                            {tipoEntrega === 'delivery' && (
                                <div className="p-4 border border-gray-300 rounded-md bg-gray-50 space-y-2">
                                    <p className="text-sm font-medium text-gray-700">Resumo do Pedido</p>
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                    {selectedBairro && (
                                        <div className="flex justify-between text-sm">
                                            <span>Taxa de entrega ({selectedBairro.nome})</span>
                                            <span>
                                                {deliveryFeeLoading 
                                                    ? 'Carregando...' 
                                                    : valorTaxaEntrega > 0 
                                                        ? formatCurrency(valorTaxaEntrega)
                                                        : 'Grátis'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                                        <span>Total</span>
                                        <span>{formatCurrency(totalComTaxaEntrega)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="observacoes"
                            className="text-sm font-medium text-gray-700"
                        >
                            {t("sacola.observations")}
                        </label>
                        <textarea
                            id="observacoes"
                            ref={observacoesRef}
                            rows={3}
                            placeholder={t("sacola.observationsPlaceholder")}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={vazio || loading || (isWhatsApp && !isClientFormValid)}
                        className="
              w-full bg-[#D9A23B] text-white rounded p-3 text-center font-medium
              hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center
            "
                    >
                        {loading ? <LoadingSpinner /> : (
                            isWhatsApp 
                                ? (isRetirada ? 'Enviar Pedido (Retirada no Local)' : 'Enviar Pedido (Pagamento na Entrega)') 
                                : t("sacola.confirmOrder")
                        )}
                    </button>
                </form>
            )}

            <CarrinhoFooter />
        </div>
    );
}
