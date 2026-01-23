/* eslint-env node */
/* eslint-disable no-undef */
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// iFood API configuration
const IFOOD_API_BASE_URL = "https://merchant-api.ifood.com.br";

// Define secrets for distributed app credentials
const ifoodClientId = defineSecret("IFOOD_CLIENT_ID");
const ifoodClientSecret = defineSecret("IFOOD_CLIENT_SECRET");

/**
 * Refresh access token if expired
 */
async function refreshAccessTokenIfNeeded(idRestaurante, docRef, currentData) {
  const now = new Date();
  const expiryDate = currentData.accessTokenExpiry?.toDate();
  
  // Refresh if token expires in less than 5 minutes
  if (!expiryDate || expiryDate <= new Date(now.getTime() + 5 * 60 * 1000)) {
    logger.info("Access token expired or expiring soon, refreshing...", {idRestaurante});
    
    const refreshToken = currentData.refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    
    // Request new access token
    const requestBody = [
      `grantType=refresh_token`,
      `clientId=${encodeURIComponent(ifoodClientId.value())}`,
      `clientSecret=${encodeURIComponent(ifoodClientSecret.value())}`,
      `refreshToken=${encodeURIComponent(refreshToken)}`,
    ].join('&');
    
    const response = await fetch(`${IFOOD_API_BASE_URL}/authentication/v1.0/oauth/token`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Connection": "keep-alive",
        "Origin": "https://portal.ifood.com.br",
        "Referer": "https://portal.ifood.com.br/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      },
      body: requestBody,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to refresh token", {
        status: response.status,
        error: errorText,
      });
      
      // Mark as needing reauthorization
      await docRef.update({
        needsReauthorization: true,
        enabled: false,
        lastError: `Failed to refresh token: ${response.status}`,
        lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      throw new Error("Failed to refresh access token. Please reauthorize.");
    }
    
    const tokenData = await response.json();
    
    // Update with new tokens
    await docRef.update({
      accessToken: tokenData.accessToken,
      accessTokenExpiry: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + (tokenData.expiresIn * 1000))
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    logger.info("Access token refreshed successfully", {idRestaurante});
    
    return tokenData.accessToken;
  }
  
  return currentData.accessToken;
}

/**
 * Fetch merchant catalog from iFood
 * Returns the complete catalog including menus, categories, and items
 * HTTP version to avoid CORS issues with onCall
 */
exports.ifoodGetCatalog = onRequest(
  {
    secrets: [ifoodClientId, ifoodClientSecret],
    timeoutSeconds: 120,
    cors: true,
  },
  async (req, res) => {
    // Handle CORS preflight
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    try {
      const {idRestaurante} = req.body.data || req.body;

      if (!idRestaurante) {
        return res.status(400).json({error: "idRestaurante is required"});
      }

      logger.info("Fetching iFood catalog", {
        idRestaurante,
      });

      // Get integration data
      const docRef = admin.firestore().doc(`restaurantes/${idRestaurante}/integrations/ifood`);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({error: "iFood integration not found. Please authorize first."});
      }

      const integrationData = docSnap.data();

      if (!integrationData.merchantId) {
        return res.status(400).json({error: "Merchant ID not found. Please reauthorize with iFood."});
      }

      // Refresh token if needed
      const accessToken = await refreshAccessTokenIfNeeded(idRestaurante, docRef, integrationData);

      // Step 1: List available catalogs for the merchant
      logger.info("Step 1: Listing catalogs", {
        merchantId: integrationData.merchantId,
      });

      const catalogsResponse = await fetch(
        `${IFOOD_API_BASE_URL}/catalog/v2.0/merchants/${integrationData.merchantId}/catalogs`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; MesaFacil/1.0)",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
          },
        }
      );

      if (!catalogsResponse.ok) {
        const errorText = await catalogsResponse.text();
        logger.error("Failed to list catalogs", {
          status: catalogsResponse.status,
          error: errorText,
        });
        return res.status(500).json({
          error: `Failed to list catalogs: ${catalogsResponse.status}`,
          details: errorText,
        });
      }

      const catalogsList = await catalogsResponse.json();
      logger.info("Catalogs listed successfully", {
        originalObjct: catalogsList,
        catalogsCount: catalogsList.length,
        catalogs: catalogsList.map(c => ({
          id: c.catalogId,
          context: c.context,
          status: c.status,
        })),
      });

      if (!catalogsList || catalogsList.length === 0) {
        return res.status(404).json({
          error: "No catalogs found for this merchant",
        });
      }

      // Use the first available catalog (usually DEFAULT)
      const catalog = catalogsList.find(c => c.status === "AVAILABLE") || catalogsList[0];
      const catalogId = catalog.catalogId;

      logger.info("Selected catalog", {
        catalogId,
        context: catalog.context,
        status: catalog.status,
      });

      // Step 2: Fetch categories (without items)
      logger.info("Step 2: Fetching categories", {
        catalogId,
      });

      const categoriesResponse = await fetch(
        `${IFOOD_API_BASE_URL}/catalog/v2.0/merchants/${integrationData.merchantId}/catalogs/${catalogId}/categories`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; MesaFacil/1.0)",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
          },
        }
      );

      if (!categoriesResponse.ok) {
        const errorText = await categoriesResponse.text();
        logger.error("Failed to fetch categories", {
          status: categoriesResponse.status,
          error: errorText,
        });
        return res.status(500).json({
          error: `Failed to fetch categories: ${categoriesResponse.status}`,
          details: errorText,
        });
      }

      const categories = await categoriesResponse.json();
      logger.info("Categories fetched successfully", {
        categoriesCount: categories.length,
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
        })),
      });

      // Step 3: Fetch items for each category
      logger.info("Step 3: Fetching items for each category");
      
      const catalogData = await fetchItemsForCategories(
        integrationData.merchantId,
        categories,
        accessToken
      );

      // Parse and structure the catalog data
      const parsedCatalog = parseCatalogData(catalogData);

      logger.info("Catalog parsed successfully", {
        idRestaurante,
        totalItems: parsedCatalog.totalItems,
        totalCategories: parsedCatalog.totalCategories,
      });

      return res.status(200).json({
        success: true,
        catalog: parsedCatalog,
        rawCatalog: catalogData, // Include raw data for debugging
        fetchedAt: new Date().toISOString(),
      });

    } catch (error) {
      logger.error("Error in ifoodFetchCatalog", {error: error.message, stack: error.stack});
      return res.status(500).json({error: error.message});
    }
  }
);

/**
 * Fetch items for each category
 * This is a separate step required by iFood API
 */
async function fetchItemsForCategories(merchantId, categories, accessToken) {
  const categoriesWithItems = [];
  
  for (const category of categories) {
    try {
      logger.info("Fetching items for category", {
        categoryId: category.id,
        categoryName: category.name,
      });
      
      const itemsResponse = await fetch(
        `${IFOOD_API_BASE_URL}/catalog/v2.0/merchants/${merchantId}/categories/${category.id}/items`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; MesaFacil/1.0)",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
          },
        }
      );
      
      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        logger.error("Failed to fetch items for category", {
          categoryId: category.id,
          categoryName: category.name,
          status: itemsResponse.status,
          error: errorText,
        });
        
        // Continue with next category even if one fails
        categoriesWithItems.push({
          ...category,
          items: [],
          error: `Failed to fetch items: ${itemsResponse.status}`,
        });
        continue;
      }
      
      const categoryData = await itemsResponse.json();
      
      logger.info("Items fetched for category", {
        categoryId: category.id,
        categoryName: category.name,
        itemsCount: categoryData.items?.length || 0,
      });
      
      // Merge category info with items data
      categoriesWithItems.push({
        ...category,
        items: categoryData.items || [],
        products: categoryData.products || [],
        optionGroups: categoryData.optionGroups || [],
        options: categoryData.options || [],
      });
      
    } catch (error) {
      logger.error("Error fetching items for category", {
        categoryId: category.id,
        categoryName: category.name,
        error: error.message,
      });
      
      categoriesWithItems.push({
        ...category,
        items: [],
        error: error.message,
      });
    }
  }
  
  return categoriesWithItems;
}

/**
 * Parse catalog data into a standardized format
 * Data structure from iFood API after fetching categories and their items separately
 */
function parseCatalogData(categoriesData) {
  const items = [];
  const categories = [];
  const products = [];
  const optionGroups = [];
  const options = [];
  
  try {
    if (!Array.isArray(categoriesData)) {
      logger.warn("catalogData is not an array", {type: typeof categoriesData});
      return {
        items: [],
        categories: [],
        products: [],
        optionGroups: [],
        options: [],
        totalItems: 0,
        totalCategories: 0,
        parseError: "Invalid data format",
      };
    }
    
    // Process each category
    categoriesData.forEach((category, categoryIndex) => {
      const categoryId = category.id;
      const categoryName = category.name || "Sem categoria";
      
      // Add category info
      categories.push({
        id: categoryId,
        name: categoryName,
        available: category.status === "AVAILABLE",
        sequence: category.sequence || categoryIndex,
        index: category.index || categoryIndex,
        template: category.template || "DEFAULT",
        error: category.error || null,
      });
      
      // Collect products from this category
      if (category.products && Array.isArray(category.products)) {
        category.products.forEach(product => {
          products.push({
            id: product.id,
            externalCode: product.externalCode || "",
            name: product.name || "",
            description: product.description || "",
            additionalInformation: product.additionalInformation || "",
            imagePath: product.imagePath || "",
            ean: product.ean || null,
            serving: product.serving || "SERVES_1",
            dietaryRestrictions: product.dietaryRestrictions || [],
            quantity: product.quantity || null,
            optionGroups: product.optionGroups || [],
          });
        });
      }
      
      // Collect option groups from this category
      if (category.optionGroups && Array.isArray(category.optionGroups)) {
        category.optionGroups.forEach(group => {
          optionGroups.push({
            id: group.id,
            name: group.name || "",
            externalCode: group.externalCode || "",
            status: group.status || "AVAILABLE",
            index: group.index || 0,
            optionGroupType: group.optionGroupType || "DEFAULT",
            optionIds: group.optionIds || [],
          });
        });
      }
      
      // Collect options from this category
      if (category.options && Array.isArray(category.options)) {
        category.options.forEach(option => {
          options.push({
            id: option.id,
            status: option.status || "AVAILABLE",
            index: option.index || 0,
            productId: option.productId || "",
            price: {
              value: option.price?.value || 0,
              originalValue: option.price?.originalValue || option.price?.value || 0,
            },
            externalCode: option.externalCode || "",
            contextModifiers: option.contextModifiers || [],
            fractions: option.fractions || null,
          });
        });
      }
      
      // Get items from this category
      const categoryItems = category.items || [];
      
      categoryItems.forEach((item) => {
        items.push({
          // Basic info
          id: item.id,
          type: item.type || "DEFAULT",
          externalCode: item.externalCode || item.id,
          
          // Category association
          categoryId: categoryId,
          categoryName: categoryName,
          
          // Status and ordering
          status: item.status || "AVAILABLE",
          available: item.status === "AVAILABLE",
          sequence: item.sequence || 0,
          index: item.index || 0,
          
          // Pricing
          price: {
            value: item.price?.value || 0,
            originalValue: item.price?.originalValue || item.price?.value || 0,
          },
          
          // Product reference
          productId: item.productId,
          
          // Scheduling
          shifts: item.shifts || [],
          tags: item.tags || [],
          
          // Context modifiers (different prices/status for different contexts)
          contextModifiers: item.contextModifiers || [],
        });
      });
    });
    
    return {
      items,
      categories,
      products,
      optionGroups,
      options,
      totalItems: items.length,
      totalCategories: categories.length,
      totalProducts: products.length,
      totalOptionGroups: optionGroups.length,
      totalOptions: options.length,
    };
    
  } catch (error) {
    logger.error("Error parsing catalog data", {error: error.message});
    return {
      items: [],
      categories: [],
      products: [],
      optionGroups: [],
      options: [],
      totalItems: 0,
      totalCategories: 0,
      totalProducts: 0,
      totalOptionGroups: 0,
      totalOptions: 0,
      parseError: error.message,
    };
  }
}
