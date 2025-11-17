import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { fetchIfoodCatalog, suggestCatalogMappings } from "./ifoodCatalogService";

/**
 * Get all item mappings for iFood integration
 * Maps iFood item IDs/externalCodes to MesaFacil cardapio item IDs
 */
export const getIfoodItemMappings = async (idRestaurante) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood-item-mappings");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        return {};
    }
    
    return docSnap.data().mappings || {};
};

/**
 * Save item mapping
 * @param {string} idRestaurante - Restaurant ID
 * @param {string} ifoodItemId - iFood item ID or externalCode
 * @param {string} mesaFacilItemId - MesaFacil cardapio item ID
 */
export const saveIfoodItemMapping = async (idRestaurante, ifoodItemId, mesaFacilItemId) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood-item-mappings");
    
    // Get current mappings
    const currentMappings = await getIfoodItemMappings(idRestaurante);
    
    // Update with new mapping
    await setDoc(docRef, {
        mappings: {
            ...currentMappings,
            [ifoodItemId]: mesaFacilItemId,
        },
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Save multiple item mappings at once
 */
export const saveIfoodItemMappings = async (idRestaurante, mappings) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood-item-mappings");
    
    await setDoc(docRef, {
        mappings,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Remove item mapping
 */
export const removeIfoodItemMapping = async (idRestaurante, ifoodItemId) => {
    const docRef = doc(db, "restaurantes", idRestaurante, "integrations", "ifood-item-mappings");
    
    // Get current mappings
    const currentMappings = await getIfoodItemMappings(idRestaurante);
    
    // Remove the mapping
    delete currentMappings[ifoodItemId];
    
    await setDoc(docRef, {
        mappings: currentMappings,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Get MesaFacil item ID for an iFood item
 * Returns null if no mapping exists
 */
export const getMappedMesaFacilItem = async (idRestaurante, ifoodItemId) => {
    const mappings = await getIfoodItemMappings(idRestaurante);
    return mappings[ifoodItemId] || null;
};

/**
 * Get all unique iFood items from existing orders
 * Useful for showing which items need to be mapped
 * LEGACY: Use getIfoodCatalogItems for complete catalog
 */
export const getIfoodItemsFromOrders = async (idRestaurante) => {
    const ordersRef = collection(db, "restaurantes", idRestaurante, "ifoodOrders");
    const snapshot = await getDocs(ordersRef);
    
    const itemsMap = new Map();
    
    snapshot.docs.forEach(doc => {
        const order = doc.data();
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const itemId = item.externalCode || item.id;
                if (itemId && !itemsMap.has(itemId)) {
                    itemsMap.set(itemId, {
                        id: itemId,
                        name: item.name,
                        externalCode: item.externalCode,
                        ifoodId: item.id,
                        price: item.unitPrice || item.price || 0,
                        // Count occurrences
                        orderCount: 1,
                        source: 'orders', // Flag to identify source
                    });
                } else if (itemId) {
                    const existing = itemsMap.get(itemId);
                    itemsMap.set(itemId, {
                        ...existing,
                        orderCount: existing.orderCount + 1,
                    });
                }
            });
        }
    });
    
    return Array.from(itemsMap.values()).sort((a, b) => b.orderCount - a.orderCount);
};

/**
 * Get iFood items from the merchant catalog via API
 * This is the preferred method as it gets ALL items, not just ordered ones
 */
export const getIfoodCatalogItems = async (idRestaurante) => {
    try {
        console.log("Fetching iFood catalog from API...");
        const catalogResponse = await fetchIfoodCatalog(idRestaurante);
        
        console.log("Catalog response:", catalogResponse);
        
        if (!catalogResponse.success || !catalogResponse.catalog) {
            throw new Error("Failed to fetch catalog from iFood");
        }
        
        const { items } = catalogResponse.catalog;
        
        console.log(`Successfully fetched ${items.length} items from iFood catalog`);
        
        // Transform to match the expected format
        return items.map(item => ({
            id: item.externalCode || item.id,
            name: item.name,
            externalCode: item.externalCode,
            ifoodId: item.id,
            price: item.price,
            description: item.description,
            categoryName: item.categoryName,
            available: item.available,
            logoUrl: item.logoUrl,
            optionGroups: item.optionGroups,
            source: 'catalog', // Flag to identify source
            orderCount: 0, // Not from orders
        }));
    } catch (error) {
        console.error("Error fetching iFood catalog:", error);
        console.warn("Falling back to order-based items");
        
        // Provide more context in the error
        if (error.message?.includes('CORS')) {
            console.error("CORS error - the Cloud Function may not be deployed correctly");
        } else if (error.message?.includes('internal')) {
            console.error("Internal error - check Cloud Function logs");
        }
        
        // Fallback to order-based items if catalog fetch fails
        return await getIfoodItemsFromOrders(idRestaurante);
    }
};

/**
 * Get iFood items - tries catalog first, falls back to orders
 */
export const getIfoodItems = async (idRestaurante) => {
    try {
        // Try catalog first
        const catalogItems = await getIfoodCatalogItems(idRestaurante);
        if (catalogItems.length > 0) {
            return catalogItems;
        }
    } catch (error) {
        console.warn("Catalog fetch failed, using orders:", error);
    }
    
    // Fallback to orders
    return await getIfoodItemsFromOrders(idRestaurante);
};

/**
 * Get MesaFacil cardapio items
 */
export const getMesaFacilCardapioItems = async (idRestaurante) => {
    const cardapioRef = collection(db, "restaurantes", idRestaurante, "cardapio");
    const snapshot = await getDocs(cardapioRef);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
};

/**
 * Auto-suggest mappings based on name similarity
 * Uses advanced algorithm from catalogService if available
 */
export const suggestItemMappings = async (idRestaurante) => {
    const ifoodItems = await getIfoodItems(idRestaurante);
    const mesaFacilItems = await getMesaFacilCardapioItems(idRestaurante);
    
    // Use advanced catalog-based suggestions if items are from catalog
    if (ifoodItems.length > 0 && ifoodItems[0].source === 'catalog') {
        return suggestCatalogMappings(ifoodItems, mesaFacilItems);
    }
    
    // Fallback to simple name-based matching for order-based items
    const suggestions = {};
    
    ifoodItems.forEach(ifoodItem => {
        const ifoodName = (ifoodItem.name || "").toLowerCase().trim();
        
        // Find best match
        let bestMatch = null;
        let highestScore = 0;
        
        mesaFacilItems.forEach(mfItem => {
            const mfName = (mfItem.nome || "").toLowerCase().trim();
            
            // Simple scoring: exact match (100), contains (80), similar (60)
            let score = 0;
            
            if (ifoodName === mfName) {
                score = 100;
            } else if (ifoodName.includes(mfName) || mfName.includes(ifoodName)) {
                score = 80;
            } else {
                // Check word overlap
                const ifoodWords = ifoodName.split(/\s+/);
                const mfWords = mfName.split(/\s+/);
                const commonWords = ifoodWords.filter(word => mfWords.includes(word));
                if (commonWords.length > 0) {
                    score = 60 * (commonWords.length / Math.max(ifoodWords.length, mfWords.length));
                }
            }
            
            if (score > highestScore && score >= 60) {
                highestScore = score;
                bestMatch = {
                    mesaFacilItemId: mfItem.id,
                    mesaFacilItemName: mfItem.nome,
                    confidence: score,
                };
            }
        });
        
        if (bestMatch) {
            suggestions[ifoodItem.id] = bestMatch;
        }
    });
    
    return suggestions;
};
