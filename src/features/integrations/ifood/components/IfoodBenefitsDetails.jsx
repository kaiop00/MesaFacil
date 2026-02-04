import PropTypes from "prop-types";
import { formatCurrencyBRL } from "@/utils/ifoodPaymentHelpers";

/**
 * Get sponsor label based on sponsorship type
 * @param {string} sponsorshipType - "IFOOD" or "MERCHANT"
 */
function getSponsorLabel(sponsorshipType) {
    const sponsors = {
        "IFOOD": "iFood",
        "MERCHANT": "Restaurante",
    };
    return sponsors[sponsorshipType] || sponsorshipType || "Desconto";
}

/**
 * Get sponsor badge style based on who is paying
 */
function getSponsorBadgeStyle(sponsorshipType) {
    if (sponsorshipType === "IFOOD") {
        return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-purple-100 text-purple-700 border-purple-200";
}

/**
 * Get target description based on what the benefit applies to
 * @param {string} target - "DELIVERY_FEE", "ITEM", "CART", etc.
 */
function getTargetDescription(target) {
    const targets = {
        "DELIVERY_FEE": "na entrega",
        "DELIVERY": "na entrega",
        "ITEM": "em itens",
        "CART": "no pedido",
        "ORDER": "no pedido",
    };
    return targets[target] || "";
}

/**
 * Extracts benefits array from iFood order data
 * Handles different structures from iFood API
 */
function extractBenefits(benefits, rawData) {
    // If benefits is already an array with items, use it
    if (Array.isArray(benefits) && benefits.length > 0) {
        return benefits;
    }
    
    // Try to get from rawData
    if (rawData?.benefits && Array.isArray(rawData.benefits) && rawData.benefits.length > 0) {
        return rawData.benefits;
    }
    
    return [];
}

/**
 * Component to display iFood discount/coupon details
 * Required for iFood homologation - shows discount value and sponsor (iFood/Merchant)
 */
const IfoodBenefitsDetails = ({ benefits, totalBenefits, rawData }) => {
    // Extract benefits from various possible structures
    const benefitsList = extractBenefits(benefits, rawData);
    
    // Calculate total benefits if not provided
    const totalDiscount = totalBenefits || benefitsList.reduce((sum, b) => sum + (b.value || 0), 0);
    
    // If no benefits and no total discount, don't render
    if (benefitsList.length === 0 && totalDiscount === 0) {
        return null;
    }

    return (
        <div className="mt-2 pt-2 border-t border-orange-200">
            <p className="text-sm font-medium text-orange-800 mb-2">
                🎁 Descontos/Cupons:
            </p>
            
            {benefitsList.length > 0 ? (
                <div className="space-y-2">
                    {benefitsList.map((benefit, index) => {
                        const sponsor = getSponsorLabel(benefit.sponsorshipType);
                        const targetDesc = getTargetDescription(benefit.target);
                        const badgeStyle = getSponsorBadgeStyle(benefit.sponsorshipType);
                        
                        return (
                            <div 
                                key={index} 
                                className="bg-green-50 rounded-md p-2 border border-green-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🏷️</span>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {/* Benefit description */}
                                            {benefit.description && (
                                                <span className="text-sm text-gray-700">
                                                    {benefit.description}
                                                </span>
                                            )}
                                            
                                            {/* Target badge (what the discount applies to) */}
                                            {targetDesc && (
                                                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                                    {targetDesc}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Discount value */}
                                    <span className="text-sm font-semibold text-green-700">
                                        -{formatCurrencyBRL(benefit.value || 0)}
                                    </span>
                                </div>
                                
                                {/* Sponsor badge and sponsorship value */}
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className={`px-2 py-0.5 text-xs rounded border ${badgeStyle}`}>
                                        Pago por: {sponsor}
                                    </span>
                                    
                                    {benefit.sponsorshipValue !== undefined && 
                                     benefit.sponsorshipValue !== benefit.value && (
                                        <span className="text-xs text-gray-500">
                                            (Subsídio: {formatCurrencyBRL(benefit.sponsorshipValue)})
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Total discounts summary */}
                    {benefitsList.length > 1 && (
                        <div className="pt-2 border-t border-green-200 flex justify-between text-sm">
                            <span className="text-gray-600">Total em descontos:</span>
                            <span className="font-semibold text-green-700">
                                -{formatCurrencyBRL(totalDiscount)}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                /* Fallback: Show only total when no detailed benefits available */
                <div className="bg-green-50 rounded-md p-2 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🏷️</span>
                            <span className="text-sm text-gray-700">Desconto aplicado</span>
                        </div>
                        <span className="text-sm font-semibold text-green-700">
                            -{formatCurrencyBRL(totalDiscount)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

IfoodBenefitsDetails.propTypes = {
    benefits: PropTypes.arrayOf(
        PropTypes.shape({
            value: PropTypes.number,
            sponsorshipValue: PropTypes.number,
            target: PropTypes.string,
            sponsorshipType: PropTypes.string,
            description: PropTypes.string,
        })
    ),
    totalBenefits: PropTypes.number,
    rawData: PropTypes.object,
};

IfoodBenefitsDetails.defaultProps = {
    benefits: [],
    totalBenefits: 0,
};

export default IfoodBenefitsDetails;
