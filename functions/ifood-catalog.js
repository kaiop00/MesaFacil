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
        "User-Agent": "MesaFacil/1.0",
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
            "User-Agent": "MesaFacil/1.0",
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

      // Step 2: Fetch categories and items from the catalog
      logger.info("Step 2: Fetching categories and items", {
        catalogId,
      });

      const categoriesResponse = await fetch(
        `${IFOOD_API_BASE_URL}/catalog/v2.0/merchants/${integrationData.merchantId}/catalogs/${catalogId}/categories?include_items=true`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "User-Agent": "MesaFacil/1.0",
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

      const catalogData = await categoriesResponse.json();
      logger.info("Categories fetched successfully", {
        categoriesCount: catalogData.length,
        originalObject: catalogData,
      });

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
 * Parse catalog data into a standardized format
 * Following iFood API structure: categories with items
 */
function parseCatalogData(categoriesData) {
  const items = [];
  const categories = [];
  
  try {
    if (!Array.isArray(categoriesData)) {
      logger.warn("catalogData is not an array", {type: typeof categoriesData});
      return {
        items: [],
        categories: [],
        totalItems: 0,
        totalCategories: 0,
        parseError: "Invalid data format",
      };
    }
    
    // Process each category
    categoriesData.forEach((category, categoryIndex) => {
      const categoryId = category.id;
      const categoryName = category.name || "Sem categoria";
      
      categories.push({
        id: categoryId,
        name: categoryName,
        available: category.status === "AVAILABLE",
        sequence: category.sequence || categoryIndex,
        index: category.index || categoryIndex,
        template: category.template || "DEFAULT",
      });
      
      // Get items from this category
      const categoryItems = category.items || [];
      
      categoryItems.forEach((item) => {
        items.push({
          // Basic info
          id: item.id,
          externalCode: item.externalCode || item.id,
          name: item.name || "Item sem nome",
          description: item.description || "",
          
          // Pricing
          price: item.price?.value || 0,
          originalPrice: item.price?.originalValue || item.price?.value || 0,
          
          // Product info
          productId: item.productId,
          
          // Category association
          categoryId: categoryId,
          categoryName: categoryName,
          
          // Status and ordering
          available: item.status === "AVAILABLE",
          sequence: item.sequence || 0,
          index: item.index || 0,
          
          // Media
          imagePath: item.imagePath || "",
          
          // Additional details
          serving: item.serving || "SERVES_1",
          ean: item.ean || null,
          dietaryRestrictions: item.dietaryRestrictions || [],
          
          // Scheduling
          shifts: item.shifts || [],
          
          // Option groups (complementos)
          optionGroups: (item.optionGroups || []).map(group => ({
            id: group.id,
            name: group.name,
            min: group.min || 0,
            max: group.max || 999,
            sequence: group.sequence || 0,
            status: group.status || "AVAILABLE",
            // Options will be populated if available in the response
            options: (group.options || []).map(opt => ({
              id: opt.id,
              name: opt.name,
              description: opt.description || "",
              price: opt.price?.value || 0,
              externalCode: opt.externalCode || opt.id,
              status: opt.status || "AVAILABLE",
              sequence: opt.sequence || 0,
            })),
          })),
          
          // Context modifiers (different prices/status for different contexts)
          contextModifiers: item.contextModifiers || [],
        });
      });
    });
    
    return {
      items,
      categories,
      totalItems: items.length,
      totalCategories: categories.length,
    };
    
  } catch (error) {
    logger.error("Error parsing catalog data", {error: error.message});
    return {
      items: [],
      categories: [],
      totalItems: 0,
      totalCategories: 0,
      parseError: error.message,
    };
  }
}
