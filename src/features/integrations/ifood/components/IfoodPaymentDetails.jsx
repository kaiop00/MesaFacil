import PropTypes from "prop-types";
import {
    formatPaymentInfo,
    getPaymentIcon,
    needsChangeInfo,
    calculateChange,
    isPrepaid,
    isPaymentOnDelivery,
    formatCurrencyBRL,
    getCardBrandLabel,
    getPaymentTypeLabel,
    getChangeFor,
} from "@/utils/ifoodPaymentHelpers";

/**
 * Extracts payment methods array from iFood order data
 * Handles different structures: payments array, payments.methods, or rawData.payments.methods
 */
function extractPaymentMethods(payments, rawData) {
    // If payments is already an array, use it
    if (Array.isArray(payments) && payments.length > 0) {
        return payments;
    }
    
    // If payments has methods property (iFood structure)
    if (payments?.methods && Array.isArray(payments.methods)) {
        return payments.methods;
    }
    
    // Try to get from rawData
    if (rawData?.payments?.methods && Array.isArray(rawData.payments.methods)) {
        return rawData.payments.methods;
    }
    
    return [];
}

/**
 * Component to display iFood payment details
 * Required for iFood homologation - shows card brand, change for cash, etc.
 */
const IfoodPaymentDetails = ({ payments, orderTotal, rawData }) => {
    // Extract payment methods from various possible structures
    const paymentMethods = extractPaymentMethods(payments, rawData);
    
    if (!paymentMethods || paymentMethods.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 pt-2 border-t border-orange-200">
            <p className="text-sm font-medium text-orange-800 mb-2">
                💰 Pagamento:
            </p>
            
            <div className="space-y-2">
                {paymentMethods.map((payment, index) => {
                    const brand = payment.brand || payment.card?.brand;
                    const changeFor = getChangeFor(payment);
                    
                    return (
                        <div 
                            key={index} 
                            className="bg-white rounded-md p-2 border border-orange-100"
                        >
                            {/* Payment method and value */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{getPaymentIcon(payment)}</span>
                                    <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-sm font-medium text-gray-800">
                                            {formatPaymentInfo(payment)}
                                        </span>
                                        
                                        {/* Card brand badge */}
                                        {brand && (
                                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                                {getCardBrandLabel(brand)}
                                            </span>
                                        )}
                                        
                                        {/* Payment type badge (Online/Na entrega) */}
                                        {payment.type && (
                                            <span className={`px-1.5 py-0.5 text-xs rounded ${
                                                payment.type === "ONLINE" 
                                                    ? "bg-green-100 text-green-700" 
                                                    : "bg-orange-100 text-orange-700"
                                            }`}>
                                                {getPaymentTypeLabel(payment.type)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <span className="text-sm font-semibold text-gray-800">
                                    {formatCurrencyBRL(payment.value || 0)}
                                </span>
                            </div>
                            
                            {/* Prepaid indicator */}
                            {isPrepaid(payment) && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-green-700">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                    Pago online
                                </div>
                            )}
                            
                            {/* On delivery indicator for OFFLINE payments */}
                            {isPaymentOnDelivery(payment) && !isPrepaid(payment) && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                                    <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                                    Pagamento na entrega
                                </div>
                            )}
                            
                            {/* Change info for cash payments */}
                            {needsChangeInfo(payment) && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-yellow-800">💵 Troco para:</span>
                                        <span className="font-bold text-yellow-900">
                                            {formatCurrencyBRL(changeFor)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="text-green-700">🔄 Levar troco de:</span>
                                        <span className="font-bold text-green-700">
                                            {formatCurrencyBRL(calculateChange(payment, orderTotal))}
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Collector info (who will receive the payment) */}
                            {payment.collector && (
                                <div className="mt-1 text-xs text-gray-600">
                                    Receber por: {payment.collector}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Total payment summary when multiple methods */}
            {paymentMethods.length > 1 && (
                <div className="mt-2 pt-2 border-t border-orange-100 flex justify-between text-sm">
                    <span className="text-gray-600">Total em pagamentos:</span>
                    <span className="font-semibold text-gray-800">
                        {formatCurrencyBRL(
                            paymentMethods.reduce((sum, p) => sum + (p.value || 0), 0)
                        )}
                    </span>
                </div>
            )}
        </div>
    );
};

IfoodPaymentDetails.propTypes = {
    payments: PropTypes.oneOfType([
        PropTypes.arrayOf(
            PropTypes.shape({
                name: PropTypes.string,
                code: PropTypes.string,
                method: PropTypes.string,
                value: PropTypes.number,
                prepaid: PropTypes.bool,
                type: PropTypes.string,
                brand: PropTypes.string,
                changeFor: PropTypes.number,
                cash: PropTypes.shape({
                    changeFor: PropTypes.number,
                }),
                card: PropTypes.shape({
                    brand: PropTypes.string,
                }),
                collector: PropTypes.string,
            })
        ),
        PropTypes.shape({
            methods: PropTypes.array,
            pending: PropTypes.number,
            prepaid: PropTypes.number,
        }),
    ]),
    orderTotal: PropTypes.number,
    rawData: PropTypes.object,
};

IfoodPaymentDetails.defaultProps = {
    payments: [],
    orderTotal: 0,
};

export default IfoodPaymentDetails;
