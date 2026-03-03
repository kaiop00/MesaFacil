import PropTypes from "prop-types";
import { formatCurrencyBRL } from "@/utils/ifoodPaymentHelpers";

/**
 * Human-readable fee type labels
 */
const FEE_TYPE_LABELS = {
    "RESTAURANT_SERVICE_FEE": "Taxa de serviço",
    "SMALL_ORDER_FEE": "Taxa de pedido pequeno",
    "SMALL_ORDER_FEE_3P": "Taxa de pedido pequeno",
    "TIP": "Gorjeta",
};

/**
 * Liability name labels
 */
const LIABILITY_LABELS = {
    "MARKETPLACE": "iFood",
    "MERCHANT": "Restaurante",
    "CONSUMER": "Cliente",
};

/**
 * Extract additionalFees from the iFood order.
 * Prefers the structured array; falls back to rawData.
 */
function extractFees(additionalFees, rawData) {
    if (Array.isArray(additionalFees) && additionalFees.length > 0) {
        return additionalFees;
    }
    if (Array.isArray(rawData?.additionalFees) && rawData.additionalFees.length > 0) {
        return rawData.additionalFees;
    }
    return [];
}

/**
 * Component to display iFood additional fees
 * Shows fee type, description, value and who is liable
 */
const IfoodAdditionalFeesDetails = ({ additionalFees, totalAdditionalFees, rawData }) => {
    const feesList = extractFees(additionalFees, rawData);
    const total = totalAdditionalFees || feesList.reduce((sum, f) => sum + (f.value || 0), 0);

    if (feesList.length === 0 && !total) {
        return null;
    }

    return (
        <div className="mt-2 pt-2 border-t border-orange-200">
            <p className="text-sm font-medium text-orange-800 mb-2">
                📋 Taxas adicionais:
            </p>

            {feesList.length > 0 ? (
                <div className="space-y-2">
                    {feesList.map((fee, index) => {
                        const typeLabel = FEE_TYPE_LABELS[fee.type] || fee.type || "Taxa";
                        const description = fee.fullDescription || fee.description || "";
                        const liabilities = fee.liabilities || [];

                        return (
                            <div
                                key={index}
                                className="bg-amber-50 rounded-md p-2 border border-amber-200"
                            >
                                {/* Header: label + value */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-lg shrink-0">💰</span>
                                        <span className="text-sm font-medium text-gray-700">
                                            {typeLabel}
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">
                                        {formatCurrencyBRL(fee.value || 0)}
                                    </span>
                                </div>

                                {/* Description */}
                                {description && (
                                    <p className="mt-1 ml-8 text-xs text-gray-500">
                                        {description}
                                    </p>
                                )}

                                {/* Liability breakdown */}
                                {liabilities.length > 0 && (
                                    <div className="mt-1.5 ml-8 flex flex-wrap items-center gap-1.5">
                                        {liabilities.map((liability, lIdx) => (
                                            <span
                                                key={lIdx}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border bg-gray-100 text-gray-600 border-gray-200"
                                            >
                                                {LIABILITY_LABELS[liability.name] || liability.name}
                                                {liability.percentage != null && (
                                                    <span className="font-medium">
                                                        {liability.percentage}%
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Total summary */}
                    {feesList.length > 1 && (
                        <div className="pt-2 border-t border-amber-200 flex justify-between text-sm">
                            <span className="text-gray-600">Total em taxas:</span>
                            <span className="font-semibold text-amber-700">
                                {formatCurrencyBRL(total)}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                /* Fallback: only total value available */
                <div className="bg-amber-50 rounded-md p-2 border border-amber-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💰</span>
                            <span className="text-sm text-gray-700">Taxa adicional</span>
                        </div>
                        <span className="text-sm font-semibold text-amber-700">
                            {formatCurrencyBRL(total)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

IfoodAdditionalFeesDetails.propTypes = {
    additionalFees: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.string,
            description: PropTypes.string,
            fullDescription: PropTypes.string,
            value: PropTypes.number,
            liabilities: PropTypes.arrayOf(
                PropTypes.shape({
                    name: PropTypes.string,
                    percentage: PropTypes.number,
                })
            ),
        })
    ),
    totalAdditionalFees: PropTypes.number,
    rawData: PropTypes.object,
};

IfoodAdditionalFeesDetails.defaultProps = {
    additionalFees: [],
    totalAdditionalFees: 0,
};

export default IfoodAdditionalFeesDetails;
