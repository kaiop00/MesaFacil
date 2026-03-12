import PropTypes from "prop-types";
import { User01, Phone, MapPin, UserCardId } from "react-coolicons";

/**
 * Formats a CPF number (000.000.000-00) or CNPJ (00.000.000/0000-00)
 */
function formatDocument(documentNumber) {
    if (!documentNumber) return "";
    const digits = documentNumber.replace(/\D/g, "");
    if (digits.length === 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    if (digits.length === 14) {
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return documentNumber;
}

/**
 * Returns a user-friendly label for the document type
 */
function getDocumentTypeLabel(documentType) {
    if (!documentType) return "";
    const types = {
        CPF: "CPF",
        CNPJ: "CNPJ",
        idEstrangeiro: "ID Estrangeiro",
    };
    return types[documentType] || documentType;
}

/**
 * Formats a delivery address object into readable parts
 */
function formatDeliveryAddress(deliveryAddress) {
    if (!deliveryAddress) return null;

    const line1Parts = [
        deliveryAddress.streetName,
        deliveryAddress.streetNumber ? `, ${deliveryAddress.streetNumber}` : "",
        deliveryAddress.complement ? ` - ${deliveryAddress.complement}` : "",
    ];

    const line2Parts = [
        deliveryAddress.neighborhood,
        deliveryAddress.city ? `, ${deliveryAddress.city}` : "",
        deliveryAddress.state ? ` - ${deliveryAddress.state}` : "",
    ];

    const postalCode = deliveryAddress.postalCode && deliveryAddress.postalCode !== "00000000"
        ? deliveryAddress.postalCode.replace(/(\d{5})(\d{3})/, "$1-$2")
        : null;

    return {
        line1: line1Parts.join("").trim(),
        line2: line2Parts.join("").trim(),
        postalCode,
        reference: deliveryAddress.reference || null,
        coordinates: deliveryAddress.coordinates || null,
    };
}

/**
 * Component to display complete iFood customer information
 * Shows all consumer data from iFood Order Details API:
 * - Name, phone (with 0800 localizer), document (CPF/CNPJ/foreign ID)
 * - Order count on merchant, segmentation
 * - Delivery address (structured), delivery observations
 * - Takeout info, pickup code
 * - Extra info from order
 */
const IfoodCustomerDetails = ({ customerInfo, orderType }) => {
    if (!customerInfo) return null;

    const isTakeout = orderType === "TAKEOUT";
    const isDelivery = orderType === "DELIVERY";
    const formattedAddress = formatDeliveryAddress(customerInfo.deliveryAddress);

    return (
        <div className="space-y-3">
            {/* Customer Identity */}
            <div className="grid grid-cols-1 gap-2 text-sm">
                {/* Customer Name */}
                {customerInfo.name && (
                    <div className="flex items-start gap-2">
                        <User01 className="text-orange-600 mt-0.5 shrink-0" size={16} />
                        <div>
                            <span className="text-gray-600">Cliente: </span>
                            <span className="font-medium">{customerInfo.name}</span>
                        </div>
                    </div>
                )}

                {/* Phone */}
                {customerInfo.phone && (
                    <div className="flex items-start gap-2">
                        <Phone className="text-orange-600 mt-0.5 shrink-0" size={16} />
                        <div className="flex-1">
                            <span className="text-gray-600">Telefone: </span>
                            <span className="font-medium">{customerInfo.phone}</span>
                            {/* 0800 Localizer */}
                            {customerInfo.phoneLocalizer && (
                                <div className="mt-1 text-xs text-gray-500">
                                    <span>Localizador 0800: </span>
                                    <span className="font-mono font-medium text-gray-700">
                                        {customerInfo.phoneLocalizer}
                                    </span>
                                    {customerInfo.phoneLocalizerExpiration && (
                                        <span className="ml-1 text-gray-400">
                                            (expira: {new Date(customerInfo.phoneLocalizerExpiration).toLocaleString("pt-BR")})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Document Number (CPF/CNPJ) */}
                {customerInfo.documentNumber && (
                    <div className="flex items-start gap-2">
                        <UserCardId className="text-orange-600 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-gray-600">
                                {customerInfo.documentType
                                    ? `${getDocumentTypeLabel(customerInfo.documentType)}: `
                                    : "Documento: "}
                            </span>
                            <span className="font-medium font-mono">
                                {formatDocument(customerInfo.documentNumber)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Orders Count on Merchant */}
                {customerInfo.ordersCountOnMerchant != null && customerInfo.ordersCountOnMerchant > 0 && (
                    <div className="flex items-start gap-2">
                        <span className="text-orange-600 mt-0.5 shrink-0 text-base">🛒</span>
                        <div>
                            <span className="text-gray-600">Pedidos na loja: </span>
                            <span className="font-semibold text-orange-700">
                                {customerInfo.ordersCountOnMerchant}
                            </span>
                            {customerInfo.ordersCountOnMerchant === 1 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                    Novo cliente! 🎉
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Delivery Address - only for DELIVERY orders */}
            {isDelivery && formattedAddress && formattedAddress.line1 && (
                <div className="pt-2 border-t border-orange-200">
                    <div className="flex items-start gap-2 text-sm">
                        <MapPin className="text-orange-600 mt-0.5 shrink-0" size={16} />
                        <div className="flex-1">
                            <span className="text-gray-600">Endereço: </span>
                            <div className="font-medium mt-0.5">
                                <p>{formattedAddress.line1}</p>
                                {formattedAddress.line2 && (
                                    <p className="text-gray-700">{formattedAddress.line2}</p>
                                )}
                                {formattedAddress.postalCode && (
                                    <p className="text-gray-500 text-xs">CEP: {formattedAddress.postalCode}</p>
                                )}
                                {formattedAddress.reference && (
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                        📍 Ref: {formattedAddress.reference}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Delivered by */}
                    {customerInfo.deliveredBy && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <span>🚚</span>
                            <span>
                                Entrega por: {" "}
                                <span className="font-medium">
                                    {customerInfo.deliveredBy === "IFOOD"
                                        ? "Logística iFood"
                                        : customerInfo.deliveredBy === "MERCHANT"
                                            ? "Entrega própria"
                                            : customerInfo.deliveredBy}
                                </span>
                            </span>
                            {customerInfo.deliveryDescription && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                                    {customerInfo.deliveryDescription}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Pickup Code (for delivery - entregador) */}
                    {customerInfo.pickupCode && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                            <span>🔑</span>
                            <span className="text-gray-600">Código de coleta:</span>
                            <span className="font-mono font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">
                                {customerInfo.pickupCode}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Delivery/Takeout address fallback (simple string) */}
            {isDelivery && !formattedAddress?.line1 && customerInfo.address && (
                <div className="pt-2 border-t border-orange-200">
                    <div className="flex items-start gap-2 text-sm">
                        <MapPin className="text-orange-600 mt-0.5 shrink-0" size={16} />
                        <div>
                            <span className="text-gray-600">Endereço: </span>
                            <span className="font-medium">{customerInfo.address}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Takeout info */}
            {isTakeout && (
                <div className="pt-2 border-t border-orange-200">
                    <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg text-sm">
                        <span className="text-purple-600 mt-0.5">🏪</span>
                        <div className="flex-1">
                            <span className="font-medium text-purple-800">
                                Pedido para retirada
                            </span>
                            {customerInfo.takeout?.mode === "PICKUP_AREA" && (
                                <p className="text-xs text-purple-600 mt-0.5">
                                    🅿️ Cliente aguarda em vaga do estacionamento
                                </p>
                            )}
                            {customerInfo.takeout?.observations && (
                                <p className="text-xs text-gray-600 mt-0.5 italic">
                                    {customerInfo.takeout.observations}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Display ID (Código do pedido) - prominent for TAKEOUT */}
            {isTakeout && customerInfo.displayId && (
                <div className="flex items-center justify-center p-2 bg-orange-100 rounded-lg">
                    <div className="text-center">
                        <p className="text-xs text-orange-700 mb-0.5">Código de coleta</p>
                        <p className="text-2xl font-mono font-bold text-orange-900 tracking-wider">
                            {customerInfo.displayId}
                        </p>
                    </div>
                </div>
            )}

            {/* Observations */}
            {customerInfo.observations && (
                <div className="pt-2 border-t border-orange-200">
                    <div className="flex items-start gap-2 text-sm">
                        <span className="text-orange-600 mt-0.5 shrink-0">📝</span>
                        <div>
                            <span className="text-gray-600">Observações: </span>
                            <span className="text-gray-800 italic">{customerInfo.observations}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Extra Info from order */}
            {customerInfo.extraInfo && (
                <div className="flex items-start gap-2 text-sm">
                    <span className="text-orange-600 mt-0.5 shrink-0">ℹ️</span>
                    <div>
                        <span className="text-gray-600">Info adicional: </span>
                        <span className="text-gray-800 font-medium">{customerInfo.extraInfo}</span>
                    </div>
                </div>
            )}

            {/* Status */}
            {customerInfo.ifoodStatus && (
                <div className="pt-2 border-t border-orange-200">
                    <span className="text-sm text-gray-600">Status iFood: </span>
                    <span className="text-sm font-semibold text-orange-700">
                        {formatIfoodStatusLabel(customerInfo.ifoodStatus)}
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Map iFood status to user-friendly text (inline for this component)
 */
function formatIfoodStatusLabel(status) {
    const statusMap = {
        PLACED: "Pedido Recebido",
        CONFIRMED: "Confirmado",
        READY_TO_PICKUP: "Pronto para Retirada",
        DISPATCHED: "Saiu para Entrega",
        CONCLUDED: "Concluído",
        CANCELLED: "Cancelado",
    };
    return statusMap[status] || status;
}

IfoodCustomerDetails.propTypes = {
    customerInfo: PropTypes.shape({
        name: PropTypes.string,
        phone: PropTypes.string,
        phoneLocalizer: PropTypes.string,
        phoneLocalizerExpiration: PropTypes.string,
        documentNumber: PropTypes.string,
        documentType: PropTypes.string,
        ordersCountOnMerchant: PropTypes.number,
        segmentation: PropTypes.string,
        displayId: PropTypes.string,
        orderType: PropTypes.string,
        address: PropTypes.string,
        deliveryAddress: PropTypes.object,
        deliveredBy: PropTypes.string,
        deliveryMode: PropTypes.string,
        deliveryDescription: PropTypes.string,
        pickupCode: PropTypes.string,
        observations: PropTypes.string,
        takeout: PropTypes.object,
        ifoodStatus: PropTypes.string,
        salesChannel: PropTypes.string,
        createdAt: PropTypes.string,
        extraInfo: PropTypes.string,
    }),
    orderType: PropTypes.string,
};

IfoodCustomerDetails.defaultProps = {
    customerInfo: null,
    orderType: "DELIVERY",
};

export default IfoodCustomerDetails;
