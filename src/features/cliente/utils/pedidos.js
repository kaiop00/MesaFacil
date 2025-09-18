import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

export function formatCurrency(value) {
    const numeric = typeof value === "number" ? value : 0;
    return currencyFormatter.format(numeric);
}

export function formatTimestamp(timestamp) {
    if (!timestamp) return null;
    try {
        const date = timestamp instanceof Date
            ? timestamp
            : typeof timestamp.toDate === "function"
                ? timestamp.toDate()
                : new Date(timestamp);

        if (Number.isNaN(date?.getTime())) {
            return null;
        }

        return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
        return null;
    }
}

export function computeSubtotal(items = []) {
    return items.reduce((acc, item) => {
        const price = item.price ?? item.valor ?? 0;
        const quantity = item.quantity ?? item.quantidade ?? 1;
        return acc + price * quantity;
    }, 0);
}

export function computeTotalPedidos(pedidos = []) {
    return pedidos.reduce(
        (acc, pedido) => acc + (typeof pedido.total === "number" ? pedido.total : computeSubtotal(pedido.items)),
        0
    );
}

