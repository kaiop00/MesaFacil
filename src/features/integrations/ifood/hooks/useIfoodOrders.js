import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

/**
 * Hook to listen to real-time iFood orders for a restaurant
 * @param {string} idRestaurante - Restaurant ID
 * @param {object} options - Options for filtering
 * @returns {object} - { orders, loading, error }
 */
export const useIfoodOrders = (idRestaurante, options = {}) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Extract options to avoid dependency issues
    const { statusFilter, syncedOnly, pendingOnly } = options;

    useEffect(() => {
        if (!idRestaurante) {
            setOrders([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const ordersRef = collection(db, 'restaurantes', idRestaurante, 'ifoodOrders');
            
            // Build query with optional filters
            let q = query(ordersRef, orderBy('createdAt', 'desc'));
            
            if (statusFilter) {
                q = query(ordersRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
            }
            
            if (syncedOnly) {
                q = query(ordersRef, where('mesaFacilOrderId', '!=', null), orderBy('mesaFacilOrderId'), orderBy('createdAt', 'desc'));
            }
            
            if (pendingOnly) {
                q = query(ordersRef, where('mesaFacilOrderId', '==', null), orderBy('createdAt', 'desc'));
            }

            // Real-time listener
            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const ifoodOrders = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    
                    console.log('iFood orders updated:', {
                        count: ifoodOrders.length,
                        syncedOnly,
                        pendingOnly,
                        orders: ifoodOrders.map(o => ({
                            id: o.id,
                            displayId: o.displayId,
                            status: o.ifoodStatus || o.status,
                            mesaFacilOrderId: o.mesaFacilOrderId,
                        })),
                    });
                    
                    setOrders(ifoodOrders);
                    setLoading(false);
                },
                (err) => {
                    console.error('Error listening to iFood orders:', err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up iFood orders listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [idRestaurante, statusFilter, syncedOnly, pendingOnly]);

    return { orders, loading, error };
};

/**
 * Hook to get a single iFood order by ID with real-time updates
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} ifoodOrderId - iFood order ID
 * @returns {object} - { order, loading, error }
 */
export const useIfoodOrder = (idRestaurante, ifoodOrderId) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!idRestaurante || !ifoodOrderId) {
            setOrder(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const orderRef = doc(db, 'restaurantes', idRestaurante, 'ifoodOrders', ifoodOrderId);

            const unsubscribe = onSnapshot(
                orderRef,
                (snapshot) => {
                    if (snapshot.exists()) {
                        setOrder({ id: snapshot.id, ...snapshot.data() });
                    } else {
                        setOrder(null);
                    }
                    setLoading(false);
                },
                (err) => {
                    console.error('Error listening to iFood order:', err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up iFood order listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [idRestaurante, ifoodOrderId]);

    return { order, loading, error };
};

/**
 * Get iFood order statistics
 * @param {Array} orders - Array of iFood orders
 * @returns {object} - Statistics object
 */
export const getIfoodOrdersStats = (orders) => {
    const stats = {
        total: orders.length,
        synced: 0,
        pending: 0,
        errors: 0,
        byStatus: {},
    };

    orders.forEach(order => {
        // Count synced orders
        if (order.mesaFacilOrderId) {
            stats.synced++;
        }
        
        // Count pending (not synced and no error)
        if (!order.mesaFacilOrderId && !order.syncError) {
            stats.pending++;
        }
        
        // Count errors
        if (order.syncError) {
            stats.errors++;
        }
        
        // Count by status
        const status = order.status || 'UNKNOWN';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    return stats;
};
