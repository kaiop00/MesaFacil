import { ShoppingBag02 } from "react-coolicons";
import { useIfoodOrders } from "@/features/integrations/ifood/hooks/useIfoodOrders";

/**
 * Badge to display iFood orders count and status
 * Shows in the OrderPage header
 */
const IfoodOrdersBadge = ({ idRestaurante }) => {
    const { orders, loading } = useIfoodOrders(idRestaurante, { syncedOnly: false });
    
    if (loading) {
        return null;
    }
    
    // Count active orders (not concluded or cancelled)
    const activeOrders = orders.filter(order => 
        order.status !== 'CONCLUDED' && 
        order.status !== 'CANCELLED'
    );
    
    // Count pending sync orders
    const pendingSync = orders.filter(order => 
        !order.mesaFacilOrderId && 
        !order.syncError &&
        order.status !== 'CANCELLED'
    );
    
    if (activeOrders.length === 0) {
        return null;
    }
    
    return (
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <ShoppingBag02 className="text-orange-600" size={20} />
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-orange-900">
                    {activeOrders.length} {activeOrders.length === 1 ? 'pedido' : 'pedidos'} iFood
                </span>
                {pendingSync.length > 0 && (
                    <span className="text-xs text-orange-600">
                        {pendingSync.length} aguardando sincronização
                    </span>
                )}
            </div>
        </div>
    );
};

export default IfoodOrdersBadge;
