import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

/**
 * Hook to listen to real-time iFood Handshake disputes for a restaurant.
 * By default returns only PENDING disputes (those requiring merchant action).
 * @param {string} idRestaurante - Restaurant ID
 * @param {object} options - Options for filtering
 * @param {string} [options.statusFilter] - Filter by specific status (default: "PENDING")
 * @param {boolean} [options.allStatuses] - If true, returns all disputes regardless of status
 * @returns {{ disputes: Array, pendingCount: number, loading: boolean, error: string|null }}
 */
export const useIfoodDisputes = (idRestaurante, options = {}) => {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { statusFilter = 'PENDING', allStatuses = false } = options;

    useEffect(() => {
        if (!idRestaurante) {
            setDisputes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const disputesRef = collection(db, 'restaurantes', idRestaurante, 'ifoodDisputes');

            let q;
            if (allStatuses) {
                q = query(disputesRef, orderBy('createdAt', 'desc'));
            } else {
                q = query(
                    disputesRef,
                    where('status', '==', statusFilter),
                    orderBy('createdAt', 'desc')
                );
            }

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const ifoodDisputes = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    setDisputes(ifoodDisputes);
                    setLoading(false);
                },
                (err) => {
                    console.error('Error listening to iFood disputes:', err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up iFood disputes listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [idRestaurante, statusFilter, allStatuses]);

    const pendingCount = disputes.filter(d => d.status === 'PENDING').length;

    return { disputes, pendingCount, loading, error };
};
