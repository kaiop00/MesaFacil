/**
 * Helper functions for formatting and displaying iFood payment information
 * Required for iFood homologation - display card brand, change for cash, etc.
 * 
 * iFood payment structure:
 * {
 *   pending: number,
 *   prepaid: number,
 *   methods: [{
 *     method: "CASH" | "CREDIT" | "DEBIT" | "PIX" | etc,
 *     type: "ONLINE" | "OFFLINE",
 *     value: number,
 *     prepaid: boolean,
 *     currency: string,
 *     cash?: { changeFor: number },
 *     card?: { brand: string }
 *   }]
 * }
 */

/**
 * Payment method labels in Portuguese
 */
const PAYMENT_METHOD_LABELS = {
    "CASH": "Dinheiro",
    "CREDIT": "Cartão de Crédito",
    "DEBIT": "Cartão de Débito",
    "PIX": "PIX",
    "MEAL_VOUCHER": "Vale Refeição",
    "FOOD_VOUCHER": "Vale Alimentação",
    "VOUCHER": "Vale",
    "DIGITAL_WALLET": "Carteira Digital",
    "CREDIT_CARD": "Cartão de Crédito",
    "DEBIT_CARD": "Cartão de Débito",
    "IFOOD_VOUCHER": "Vale iFood",
    "MERCHANT_CREDIT": "Crédito da Loja",
};

/**
 * Card brand display names
 */
const CARD_BRAND_LABELS = {
    "VISA": "Visa",
    "MASTERCARD": "Mastercard",
    "MASTER": "Mastercard",
    "ELO": "Elo",
    "AMEX": "American Express",
    "AMERICAN_EXPRESS": "American Express",
    "HIPERCARD": "Hipercard",
    "DINERS": "Diners Club",
    "DINERS_CLUB": "Diners Club",
    "HIPER": "Hiper",
    "AURA": "Aura",
    "ALELO": "Alelo",
    "VR": "VR",
    "SODEXO": "Sodexo",
    "TICKET": "Ticket",
};

/**
 * Formats payment information for display
 * @param {Object} payment - Payment object from iFood
 * @returns {string} - Formatted payment description
 */
export function formatPaymentInfo(payment) {
    if (!payment) return "Pagamento não especificado";

    const parts = [];

    // Get payment method - try different fields
    const method = (payment.method || payment.code || payment.name || "").toUpperCase();
    const methodLabel = PAYMENT_METHOD_LABELS[method] || payment.name || method || "Pagamento";
    parts.push(methodLabel);

    // Card brand (for card payments)
    const brand = payment.brand || payment.card?.brand;
    if (brand) {
        const brandLabel = CARD_BRAND_LABELS[brand.toUpperCase()] || brand;
        parts.push(`(${brandLabel})`);
    }

    return parts.join(" ");
}

/**
 * Get the payment method label in Portuguese
 * @param {string} method - Payment method code
 * @returns {string} - Localized label
 */
export function getPaymentMethodLabel(method) {
    if (!method) return "";
    return PAYMENT_METHOD_LABELS[method.toUpperCase()] || method;
}

/**
 * Get the payment type label in Portuguese
 * @param {string} type - Payment type code (ONLINE/OFFLINE)
 * @returns {string} - Localized label
 */
export function getPaymentTypeLabel(type) {
    if (!type) return "";
    const labels = {
        "ONLINE": "Online",
        "OFFLINE": "Na entrega",
    };
    return labels[type.toUpperCase()] || type;
}

/**
 * Get the card brand label
 * @param {string} brand - Card brand code
 * @returns {string} - Formatted brand name
 */
export function getCardBrandLabel(brand) {
    if (!brand) return "";
    return CARD_BRAND_LABELS[brand.toUpperCase()] || brand;
}

/**
 * Calculates change amount for cash payments
 * @param {Object} payment - Payment object
 * @param {number} orderTotal - Order total amount
 * @returns {number} - Change amount
 */
export function calculateChange(payment, orderTotal) {
    if (!payment) return 0;

    // Check if it's a cash payment
    const method = (payment.method || payment.code || "").toUpperCase();
    const isCash = method === "CASH" || method === "DIN";

    if (isCash) {
        // changeFor can be in payment.changeFor or payment.cash.changeFor
        const changeFor = payment.changeFor || payment.cash?.changeFor || 0;
        if (changeFor > 0 && changeFor > orderTotal) {
            return changeFor - orderTotal;
        }
    }

    return 0;
}

/**
 * Checks if change information should be displayed
 * @param {Object} payment - Payment object
 * @returns {boolean} - True if change info should be shown
 */
export function needsChangeInfo(payment) {
    if (!payment) return false;

    // Check if it's a cash payment with changeFor value
    const method = (payment.method || payment.code || "").toUpperCase();
    const isCash = method === "CASH" || method === "DIN";

    // changeFor can be in payment.changeFor or payment.cash.changeFor
    const changeFor = payment.changeFor || payment.cash?.changeFor || 0;

    return isCash && changeFor > 0;
}

/**
 * Get the changeFor value from payment object
 * @param {Object} payment - Payment object
 * @returns {number} - changeFor value
 */
export function getChangeFor(payment) {
    if (!payment) return 0;
    return payment.changeFor || payment.cash?.changeFor || 0;
}

/**
 * Checks if payment is prepaid (already paid online)
 * @param {Object} payment - Payment object
 * @returns {boolean} - True if prepaid
 */
export function isPrepaid(payment) {
    return payment?.prepaid === true;
}

/**
 * Checks if payment is on delivery (cash or card on delivery)
 * @param {Object} payment - Payment object
 * @returns {boolean} - True if payment is on delivery
 */
export function isPaymentOnDelivery(payment) {
    if (!payment) return false;
    // OFFLINE type means payment on delivery
    return payment.type === "OFFLINE" || !payment.prepaid;
}

/**
 * Get icon for payment method
 * @param {Object} payment - Payment object
 * @returns {string} - Emoji icon for the payment method
 */
export function getPaymentIcon(payment) {
    if (!payment) return "💳";

    const method = (payment.method || payment.code || "").toUpperCase();
    const name = (payment.name || "").toLowerCase();

    if (method === "CASH" || method === "DIN" || name.includes("dinheiro")) {
        return "💵";
    }
    if (method === "PIX" || name.includes("pix")) {
        return "📱";
    }
    if (method === "CREDIT" || method === "CREDIT_CARD" || name.includes("crédito")) {
        return "💳";
    }
    if (method === "DEBIT" || method === "DEBIT_CARD" || name.includes("débito")) {
        return "💳";
    }
    if (method.includes("VOUCHER") || name.includes("vale")) {
        return "🎫";
    }

    return "💳";
}

/**
 * Format currency value to Brazilian Real
 * @param {number} value - Value in cents or full value
 * @param {boolean} isCents - If true, value is in cents
 * @returns {string} - Formatted currency string
 */
export function formatCurrencyBRL(value, isCents = false) {
    const amount = isCents ? value / 100 : value;
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(amount);
}

/**
 * Get payment summary for an order
 * @param {Array} payments - Array of payment objects
 * @param {number} orderTotal - Order total amount
 * @returns {Object} - Payment summary
 */
export function getPaymentSummary(payments, orderTotal) {
    if (!payments || payments.length === 0) {
        return {
            hasPayments: false,
            totalPaid: 0,
            hasCashPayment: false,
            hasCardPayment: false,
            hasOnlinePayment: false,
            changeRequired: 0,
        };
    }

    let totalPaid = 0;
    let hasCashPayment = false;
    let hasCardPayment = false;
    let hasOnlinePayment = false;
    let changeRequired = 0;

    for (const payment of payments) {
        totalPaid += payment.value || 0;

        const code = (payment.code || payment.type || "").toUpperCase();
        const name = (payment.name || "").toLowerCase();

        if (code === "CASH" || code === "DIN" || name.includes("dinheiro")) {
            hasCashPayment = true;
            if (payment.changeFor > 0) {
                changeRequired = Math.max(changeRequired, calculateChange(payment, orderTotal));
            }
        } else if (code === "CREDIT" || code === "DEBIT" || name.includes("cartão")) {
            hasCardPayment = true;
        }

        if (payment.prepaid) {
            hasOnlinePayment = true;
        }
    }

    return {
        hasPayments: true,
        totalPaid,
        hasCashPayment,
        hasCardPayment,
        hasOnlinePayment,
        changeRequired,
    };
}
