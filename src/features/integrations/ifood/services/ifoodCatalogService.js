import { auth } from "@/config/firebaseConfig";

/**
 * Fetch merchant catalog from iFood API
 * This Cloud Function is needed because it requires the access token
 * which is stored securely in Firestore and managed server-side
 */
export const fetchIfoodCatalog = async (idRestaurante) => {
    console.log("Calling ifoodGetCatalog function with:", { idRestaurante });
    console.log("Current user:", auth.currentUser?.uid);
    console.log("User email:", auth.currentUser?.email);
    
    if (!auth.currentUser) {
        throw new Error("User must be authenticated to fetch catalog");
    }
    
    const functionUrl = `${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL}/ifoodGetCatalog`;
    
    console.log("Calling function URL:", functionUrl);
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: { idRestaurante }
            }),
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Response error:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log("Function call successful:", result);
        return result;
    } catch (error) {
        console.error("Error calling ifoodGetCatalog:", error);
        console.error("Error message:", error.message);
        throw error;
    }
};

/**
 * Parse iFood catalog to extract all items
 * iFood catalog structure:
 * - merchant
 *   - menus[]
 *     - catalogSections[]
 *       - items[]
 */
export const parseIfoodCatalogItems = (catalogData) => {
    const items = [];
    
    try {
        // Navigate through the catalog structure
        const menus = catalogData?.catalogSections || catalogData?.menus || [];
        
        menus.forEach(menu => {
            const sections = menu.catalogSections || menu.items || [];
            
            sections.forEach(section => {
                const sectionItems = section.items || [];
                
                sectionItems.forEach(item => {
                    // Extract main item info
                    const parsedItem = {
                        id: item.id,
                        externalCode: item.externalCode || item.code,
                        name: item.name,
                        description: item.description || "",
                        price: item.price?.value || item.originalPrice || 0,
                        serving: item.serving || "SERVES_1",
                        logoUrl: item.logoUrl || item.imageUrl || "",
                        ean: item.ean || null,
                        // Category info
                        categoryName: section.name || menu.name || "",
                        menuName: menu.name || "",
                        // Availability
                        available: item.status !== "UNAVAILABLE",
                        // Options/modifiers
                        optionGroups: item.optionGroups || [],
                    };
                    
                    items.push(parsedItem);
                });
            });
        });
        
        return items;
    } catch (error) {
        console.error("Error parsing iFood catalog:", error);
        return [];
    }
};

/**
 * Compare and suggest mappings between iFood catalog and MesaFacil cardapio
 * More sophisticated than order-based mapping
 */
export const suggestCatalogMappings = (ifoodItems, mesaFacilItems) => {
    const suggestions = {};
    
    ifoodItems.forEach(ifoodItem => {
        const ifoodName = (ifoodItem.name || "").toLowerCase().trim();
        const ifoodPrice = ifoodItem.price;
        
        let bestMatch = null;
        let highestScore = 0;
        
        mesaFacilItems.forEach(mfItem => {
            const mfName = (mfItem.nome || "").toLowerCase().trim();
            const mfPrice = (mfItem.preco || 0) * 100; // Convert to cents
            
            let score = 0;
            
            // 1. Name matching (0-100 points)
            if (ifoodName === mfName) {
                score += 100;
            } else if (ifoodName.includes(mfName) || mfName.includes(ifoodName)) {
                score += 80;
            } else {
                // Check word overlap
                const ifoodWords = ifoodName.split(/\s+/);
                const mfWords = mfName.split(/\s+/);
                const commonWords = ifoodWords.filter(word => 
                    word.length > 3 && mfWords.includes(word)
                );
                if (commonWords.length > 0) {
                    score += 60 * (commonWords.length / Math.max(ifoodWords.length, mfWords.length));
                }
            }
            
            // 2. Price matching (0-30 points)
            const priceDiff = Math.abs(ifoodPrice - mfPrice);
            if (priceDiff === 0) {
                score += 30;
            } else if (priceDiff < 500) { // Less than R$ 5 difference
                score += 20;
            } else if (priceDiff < 1000) { // Less than R$ 10 difference
                score += 10;
            }
            
            // 3. Category matching (0-20 points)
            if (mfItem.categorias && Array.isArray(mfItem.categorias)) {
                const mfCategories = mfItem.categorias.map(c => c.toLowerCase());
                const ifoodCategory = (ifoodItem.categoryName || "").toLowerCase();
                
                if (mfCategories.some(cat => ifoodCategory.includes(cat) || cat.includes(ifoodCategory))) {
                    score += 20;
                }
            }
            
            // Update best match if this score is higher
            if (score > highestScore && score >= 70) { // Minimum 70% confidence
                highestScore = score;
                bestMatch = {
                    mesaFacilItemId: mfItem.id,
                    mesaFacilItemName: mfItem.nome,
                    confidence: Math.round(score),
                    priceDiff: Math.abs(ifoodPrice - mfPrice) / 100,
                };
            }
        });
        
        if (bestMatch) {
            suggestions[ifoodItem.externalCode || ifoodItem.id] = bestMatch;
        }
    });
    
    return suggestions;
};
