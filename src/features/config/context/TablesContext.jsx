/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth } from '@/contexts/AuthContext';

const TablesContext = createContext([]);

export const TablesProvider = ({ children }) => {
    const {idRestaurante} = useAuth();
    const [tables, setTables] = useState([]);
    
    useEffect(() => {
        if (!idRestaurante) {
            setTables([]);
            return;
        }

        const unsubscribe = onSnapshot(
            collection(db, 'restaurantes', idRestaurante, 'mesas'),
            (snapshot) => {
                const items = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setTables(items);
            }
        );

        return () => unsubscribe();
    }, [idRestaurante]);

    return(
        <TablesContext.Provider value={tables}>
            {children}
        </TablesContext.Provider>
    );
};

export const useTables = () => useContext(TablesContext);
export {TablesContext};
