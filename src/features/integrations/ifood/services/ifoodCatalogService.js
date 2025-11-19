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
 * Parse iFood catalog to extract all items with product details
 * New structure (correct API flow):
 * - catalog.items[] - all items
 * - catalog.categories[] - category metadata
 * - catalog.products[] - product details (name, description, image, etc.)
 * - catalog.optionGroups[] - option group definitions
 * - catalog.options[] - option definitions with prices
 */
export const parseIfoodCatalogItems = (catalogData) => {
    const items = [];
    
    try {
        // Get the parsed catalog structure
        const catalog = catalogData?.catalog || catalogData;
        
        const catalogItems = catalog?.items || [];
        const products = catalog?.products || [];
        const optionGroups = catalog?.optionGroups || [];
        const options = catalog?.options || [];
        
        // Create lookup maps for faster access
        const productMap = new Map(products.map(p => [p.id, p]));
        const optionGroupMap = new Map(optionGroups.map(og => [og.id, og]));
        const optionMap = new Map(options.map(o => [o.id, o]));
        
        catalogItems.forEach(item => {
            // Get product details
            const product = productMap.get(item.productId);
            
            if (!product) {
                console.warn(`Product not found for item ${item.id}`, { productId: item.productId });
                return;
            }
            
            // Build option groups with full details
            const itemOptionGroups = (product.optionGroups || []).map(productOptGroup => {
                const optionGroup = optionGroupMap.get(productOptGroup.id);
                
                if (!optionGroup) {
                    console.warn(`Option group not found: ${productOptGroup.id}`);
                    return null;
                }
                
                // Get options for this group
                const groupOptions = (optionGroup.optionIds || []).map(optionId => {
                    const option = optionMap.get(optionId);
                    const optionProduct = option ? productMap.get(option.productId) : null;
                    
                    if (!option || !optionProduct) {
                        console.warn(`Option or option product not found: ${optionId}`);
                        return null;
                    }
                    
                    return {
                        id: option.id,
                        name: optionProduct.name,
                        description: optionProduct.description || "",
                        price: option.price?.value || 0,
                        originalPrice: option.price?.originalValue || option.price?.value || 0,
                        externalCode: option.externalCode,
                        status: option.status,
                        available: option.status === "AVAILABLE",
                        imagePath: optionProduct.imagePath || "",
                        ean: optionProduct.ean || null,
                    };
                }).filter(Boolean);
                
                return {
                    id: optionGroup.id,
                    name: optionGroup.name,
                    min: productOptGroup.min || 0,
                    max: productOptGroup.max || 999,
                    externalCode: optionGroup.externalCode,
                    status: optionGroup.status,
                    available: optionGroup.status === "AVAILABLE",
                    options: groupOptions,
                };
            }).filter(Boolean);
            
            // Get the actual price (considering context modifiers)
            let itemPrice = item.price?.value || 0;
            let itemOriginalPrice = item.price?.originalValue || item.price?.value || 0;
            
            // If price is 0, check context modifiers (iFood uses this for different delivery contexts)
            if (itemPrice === 0 && item.contextModifiers && item.contextModifiers.length > 0) {
                // Use the first available context modifier price (usually DEFAULT context)
                const defaultContext = item.contextModifiers.find(cm => cm.catalogContext === 'DEFAULT');
                const firstContext = defaultContext || item.contextModifiers[0];
                
                if (firstContext?.price?.value) {
                    itemPrice = firstContext.price.value;
                    itemOriginalPrice = firstContext.price.originalValue || firstContext.price.value;
                }
            }
            
            // Extract main item info
            const parsedItem = {
                id: item.id,
                externalCode: item.externalCode || "",
                name: product.name,
                description: product.description || "",
                additionalInformation: product.additionalInformation || "",
                price: itemPrice,
                originalPrice: itemOriginalPrice,
                serving: product.serving || "SERVES_1",
                imagePath: product.imagePath || "",
                ean: product.ean || null,
                dietaryRestrictions: product.dietaryRestrictions || [],
                // Category info
                categoryId: item.categoryId,
                categoryName: item.categoryName || "",
                // Availability
                status: item.status,
                available: item.status === "AVAILABLE",
                // Options/modifiers
                optionGroups: itemOptionGroups,
                // Scheduling
                shifts: item.shifts || [],
                // Context modifiers
                contextModifiers: item.contextModifiers || [],
            };
            
            items.push(parsedItem);
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
        const ifoodPrice = ifoodItem.price; // Already in cents from API
        
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
