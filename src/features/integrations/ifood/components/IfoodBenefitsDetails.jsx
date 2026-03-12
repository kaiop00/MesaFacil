import PropTypes from "prop-types";
import { formatCurrencyBRL } from "@/utils/ifoodPaymentHelpers";

/**
 * Get sponsor label based on sponsorship name/type
 * @param {string} sponsor - "IFOOD" or "MERCHANT"
 */
function getSponsorLabel(sponsor) {
    const sponsors = {
        "IFOOD": "iFood",
        "MERCHANT": "Restaurante",
        "EXTERNAL": "Parceiro externo",
        "CHAIN": "Rede",
    };
    return sponsors[sponsor] || sponsor || "Desconto";
}

/**
 * Get sponsor badge style based on who is paying
 */
function getSponsorBadgeStyle(sponsor) {
    if (sponsor === "IFOOD") {
        return "bg-red-100 text-red-700 border-red-200";
    }
    if (sponsor === "MERCHANT") {
        return "bg-purple-100 text-purple-700 border-purple-200";
    }
    if (sponsor === "EXTERNAL") {
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (sponsor === "CHAIN") {
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
    }
    return "bg-gray-100 text-gray-600 border-gray-200";
}

/**
 * Get target description based on what the benefit applies to
 * @param {string} target - "DELIVERY_FEE", "ITEM", "CART", etc.
 */
function getTargetDescription(target) {
    const targets = {
        "DELIVERY_FEE": "Taxa de entrega",
        "DELIVERY": "Entrega",
        "ITEM": "Item específico",
        "CART": "Pedido",
        "ORDER": "Pedido",
        "PROGRESSIVE_DISCOUNT_ITEM": "Desconto progressivo",
    };
    return targets[target] || target || "";
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
 * Resolve the sponsorship breakdown for a benefit.
 * Prefers the detailed sponsorshipValues array; falls back to flat fields.
 */
function resolveSponsorships(benefit) {
    if (Array.isArray(benefit.sponsorshipValues) && benefit.sponsorshipValues.length > 0) {
        return benefit.sponsorshipValues;
    }
    // Fallback: build single-entry array from legacy flat fields
    if (benefit.sponsorshipType) {
        return [{ name: benefit.sponsorshipType, value: benefit.sponsorshipValue ?? benefit.value ?? 0 }];
    }
    return [];
}

/**
 * Component to display iFood discount/coupon details
 * Required for iFood homologation - shows discount value, sponsors and campaign info
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
                        const targetDesc = getTargetDescription(benefit.target);
                        const sponsorships = resolveSponsorships(benefit);
                        const campaignName = benefit.campaign?.name || benefit.campaign?.description || "";
                        
                        return (
                            <div 
                                key={index} 
                                className="bg-green-50 rounded-md p-2 border border-green-200"
                            >
                                {/* Header: description + value */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-lg shrink-0">🏷️</span>
                                        <div className="flex flex-wrap items-center gap-1 min-w-0">
                                            {benefit.description ? (
                                                <span className="text-sm text-gray-700">
                                                    {benefit.description}
                                                </span>
                                            ) : targetDesc ? (
                                                <span className="text-sm text-gray-700">
                                                    Desconto {targetDesc.toLowerCase()}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-700">
                                                    Desconto aplicado
                                                </span>
                                            )}
                                            
                                            {/* Target badge */}
                                            {targetDesc && (
                                                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                                    {targetDesc}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Discount value */}
                                    <span className="text-sm font-semibold text-green-700 whitespace-nowrap">
                                        -{formatCurrencyBRL(benefit.value || 0)}
                                    </span>
                                </div>

                                {/* Campaign name */}
                                {campaignName && (
                                    <div className="mt-1 ml-8">
                                        <span className="text-xs text-gray-500 italic">
                                            Campanha: {campaignName}
                                        </span>
                                    </div>
                                )}
                                
                                {/* Sponsorship breakdown */}
                                {sponsorships.length > 0 && (
                                    <div className="mt-1.5 ml-8 flex flex-wrap items-center gap-1.5">
                                        {sponsorships.map((sv, svIdx) => {
                                            const badgeStyle = getSponsorBadgeStyle(sv.name);
                                            return (
                                                <div key={svIdx} className="flex flex-col">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${badgeStyle}`}
                                                    >
                                                        {getSponsorLabel(sv.name)}
                                                        {sv.value != null && (
                                                            <span className="font-medium">
                                                                {formatCurrencyBRL(sv.value)}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {sv.description && (
                                                        <span className="text-[10px] text-gray-400 mt-0.5 ml-1">
                                                            {sv.description}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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
            target: PropTypes.string,
            description: PropTypes.string,
            campaign: PropTypes.shape({
                id: PropTypes.string,
                name: PropTypes.string,
                description: PropTypes.string,
            }),
            targetId: PropTypes.string,
            sponsorshipValues: PropTypes.arrayOf(
                PropTypes.shape({
                    name: PropTypes.string,
                    value: PropTypes.number,
                    description: PropTypes.string,
                })
            ),
            // Legacy flat fields
            sponsorshipValue: PropTypes.number,
            sponsorshipType: PropTypes.string,
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
