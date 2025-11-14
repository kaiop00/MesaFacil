import { useEffect, useRef } from 'react';
import { useIfoodOrders } from '@/features/integrations/ifood/hooks/useIfoodOrders';
import { useToast } from '@/hooks/useToast';
import { formatIfoodStatus } from '@/features/integrations/ifood/services/ifoodStatusSyncService';

/**
 * Component that monitors iFood order status changes and shows notifications
 * This runs in the background on the OrderPage
 */
const IfoodStatusMonitor = ({ idRestaurante, enabled = true }) => {
    const { orders } = useIfoodOrders(idRestaurante, { syncedOnly: true });
    const { notify } = useToast();
    const previousStatusesRef = useRef({});

    useEffect(() => {
        if (!enabled || !orders || orders.length === 0) {
            return;
        }

        // Check for status changes
        orders.forEach(order => {
            const previousStatus = previousStatusesRef.current[order.id];
            const currentStatus = order.ifoodStatus || order.status;

            // If we have a previous status and it's different from current
            if (previousStatus && previousStatus !== currentStatus) {
                // Show notification about status change
                const statusText = formatIfoodStatus(currentStatus);
                const orderDisplay = order.displayId || order.ifoodOrderId;

                notify(
                    `Pedido iFood #${orderDisplay}: ${statusText}`,
                    getNotificationType(currentStatus)
                );

                // Log the change
                console.log('iFood order status changed:', {
                    orderId: order.id,
                    displayId: orderDisplay,
                    oldStatus: previousStatus,
                    newStatus: currentStatus,
                    customerName: order.customer?.name,
                });
            }
        });

        // Update previous statuses (using ref, doesn't trigger re-render)
        const newStatuses = {};
        orders.forEach(order => {
            newStatuses[order.id] = order.ifoodStatus || order.status;
        });
        previousStatusesRef.current = newStatuses;
    }, [orders, enabled, notify]);

    // This component doesn't render anything
    return null;
};

/**
 * Get notification type based on iFood status
 * @param {string} status - iFood status code
 * @returns {string} - Notification type (success, info, warning, error)
 */
const getNotificationType = (status) => {
    switch (status) {
        case 'CONFIRMED':
            return 'success';
        case 'READY_TO_PICKUP':
            return 'info';
        case 'DISPATCHED':
            return 'info';
        case 'CONCLUDED':
            return 'success';
        case 'CANCELLED':
            return 'warning';
        default:
            return 'info';
    }
};

export default IfoodStatusMonitor;
