import { useEffect, useRef } from 'react';
import { useIfoodOrders } from '@/features/integrations/ifood/hooks/useIfoodOrders';
import { useToast } from '@/hooks/useToast';
import { formatIfoodStatus } from '@/features/integrations/ifood/services/ifoodStatusSyncService';

/**
 * Component that monitors iFood order status changes and shows notifications
 * This runs in the background on the OrderPage
 */
const IfoodStatusMonitor = ({ idRestaurante, enabled = true }) => {
    const { orders, loading } = useIfoodOrders(idRestaurante, { syncedOnly: true });
    const { notify } = useToast();
    const previousStatusesRef = useRef({});
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        if (!enabled) {
            console.log('IfoodStatusMonitor: disabled');
            return;
        }
        
        if (loading) {
            console.log('IfoodStatusMonitor: loading orders...');
            return;
        }

        if (!orders || orders.length === 0) {
            console.log('IfoodStatusMonitor: no orders to monitor');
            // Reset initial load flag when no orders
            isInitialLoadRef.current = true;
            return;
        }

        console.log('IfoodStatusMonitor: monitoring', {
            orderCount: orders.length,
            isInitialLoad: isInitialLoadRef.current,
            previousStatusCount: Object.keys(previousStatusesRef.current).length,
        });

        // On initial load, just store statuses without notifying
        if (isInitialLoadRef.current) {
            console.log('IfoodStatusMonitor: initial load - storing statuses');
            const initialStatuses = {};
            orders.forEach(order => {
                const currentStatus = order.ifoodStatus || order.status;
                initialStatuses[order.id] = currentStatus;
                console.log('  - Order', order.displayId || order.id, ':', currentStatus);
            });
            previousStatusesRef.current = initialStatuses;
            isInitialLoadRef.current = false;
            return;
        }

        // Check for status changes
        let changesDetected = 0;
        orders.forEach(order => {
            const previousStatus = previousStatusesRef.current[order.id];
            const currentStatus = order.ifoodStatus || order.status;

            // If we have a previous status and it's different from current
            if (previousStatus && previousStatus !== currentStatus) {
                changesDetected++;
                
                // Show notification about status change
                const statusText = formatIfoodStatus(currentStatus);
                const orderDisplay = order.displayId || order.ifoodOrderId;

                console.log('IfoodStatusMonitor: status change detected!', {
                    orderId: order.id,
                    displayId: orderDisplay,
                    oldStatus: previousStatus,
                    newStatus: currentStatus,
                    statusText,
                    customerName: order.customer?.name,
                });

                notify(
                    `Pedido iFood #${orderDisplay}: ${statusText}`,
                    getNotificationType(currentStatus)
                );
            }
        });

        console.log('IfoodStatusMonitor: check complete', {
            changesDetected,
            totalOrders: orders.length,
        });

        // Update previous statuses (using ref, doesn't trigger re-render)
        const newStatuses = {};
        orders.forEach(order => {
            newStatuses[order.id] = order.ifoodStatus || order.status;
        });
        previousStatusesRef.current = newStatuses;
    }, [orders, loading, enabled, notify]);

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
