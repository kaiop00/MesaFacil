/* eslint-env node */
/* eslint-disable no-undef */
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Define secrets for Nuvem Fiscal credentials (global MesaFácil account)
const nuvemFiscalClientId = defineSecret("NUVEM_FISCAL_CLIENT_ID");
const nuvemFiscalClientSecret = defineSecret("NUVEM_FISCAL_CLIENT_SECRET");
const nuvemFiscalEnvironment = defineSecret("NUVEM_FISCAL_ENVIRONMENT");

// Nuvem Fiscal API endpoints
const AUTH_URL = "https://auth.nuvemfiscal.com.br/oauth/token";
const DEFAULT_API_BASE_HOMOLOGACAO = "https://api.sandbox.nuvemfiscal.com.br";
const DEFAULT_API_BASE_PRODUCAO = "https://api.nuvemfiscal.com.br";

// Map of UF to cUF (IBGE code)
const UF_TO_CUF = {
  AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32,
  GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41,
  PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42,
  SP: 35, SE: 28, TO: 17,
};

// Map formaPagamento -> tPag (NFC-e payment type codes)
const FORMA_PAGAMENTO_MAP = {
  dinheiro: "01",
  debito: "04",
  credito: "03",
  pix: "17",
  voucher: "15",
  ifood: "99",
};

const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 30 * 1000;
const tokenCache = new Map();

const NFCE_ALLOWED_ENVIRONMENTS = ["homologacao", "producao"];

function getNuvemFiscalEnvironment() {
  const rawEnv = (
    process.env.NUVEM_FISCAL_ENVIRONMENT ||
    nuvemFiscalEnvironment.value() ||
    "homologacao"
  );
  const env = String(rawEnv).trim().toLowerCase();
  if (!NFCE_ALLOWED_ENVIRONMENTS.includes(env)) {
    throw new Error(
      `Invalid NUVEM_FISCAL_ENVIRONMENT '${env}'. Use 'homologacao' or 'producao'.`,
    );
  }
  return env;
}

function getNuvemFiscalApiBaseUrl() {
  const customBaseUrl = process.env.NUVEM_FISCAL_API_BASE_URL;
  if (customBaseUrl) {
    return customBaseUrl.replace(/\/+$/, "");
  }

  return getNuvemFiscalEnvironment() === "producao"
    ? DEFAULT_API_BASE_PRODUCAO
    : DEFAULT_API_BASE_HOMOLOGACAO;
}

async function validateRestaurantAccess(request, idRestaurante, requiredPermissions = []) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication is required");
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User profile not found");
  }

  const userData = userDoc.data() || {};
  if (userData.idRestaurante !== idRestaurante) {
    throw new HttpsError("permission-denied", "User does not belong to this restaurant");
  }

  const role = userData.role;
  if (role === "admin") {
    return {uid, role};
  }

  if (!role || typeof role !== "object") {
    throw new HttpsError("permission-denied", "Insufficient permissions");
  }

  if (requiredPermissions.length > 0) {
    const hasAnyPermission = requiredPermissions.some((permission) => role[permission] === true);
    if (!hasAnyPermission) {
      throw new HttpsError("permission-denied", "Insufficient permissions for NFC-e operation");
    }
  }

  return {uid, role};
}

/**
 * Helper to get Nuvem Fiscal credentials
 */
function getNuvemFiscalCredentials() {
  // For local dev, use .env
  const clientId = process.env.NUVEM_FISCAL_CLIENT_ID || nuvemFiscalClientId.value();
  const clientSecret = process.env.NUVEM_FISCAL_CLIENT_SECRET || nuvemFiscalClientSecret.value();

  if (!clientId || !clientSecret) {
    throw new Error("Nuvem Fiscal credentials not configured");
  }
  return {clientId, clientSecret};
}

/**
 * Obtain OAuth2 access token from Nuvem Fiscal
 * @param {string} scope - OAuth2 scope (e.g. "empresa nfce")
 * @returns {Promise<string>} access_token
 */
async function getAccessToken(scope = "empresa nfce cep") {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > (Date.now() + TOKEN_EXPIRY_SAFETY_WINDOW_MS)) {
    return cached.token;
  }

  const {clientId, clientSecret} = getNuvemFiscalCredentials();

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", scope);

  const maxAttempts = 3;
  let lastStatus = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      const expiresInSec = Number(data.expires_in || 3600);
      tokenCache.set(scope, {
        token: data.access_token,
        expiresAt: Date.now() + (expiresInSec * 1000),
      });
      return data.access_token;
    }

    lastStatus = response.status;
    const errorBody = await response.text();
    logger.error("Nuvem Fiscal auth error", {
      url: AUTH_URL,
      method: "POST",
      scope,
      status: response.status,
      attempt,
      responseDetail: errorBody,
    });

    const isRetriable = response.status === 429 || response.status >= 500;
    if (!isRetriable || attempt === maxAttempts) {
      break;
    }

    await sleep(attempt * 1000);
  }

  throw new Error(`Nuvem Fiscal authentication failed: ${lastStatus || "unknown"}`);
}

function mapNuvemFiscalErrorToHttps(err, fallbackMessage) {
  const message = err?.message || "";

  if (/authentication failed:\s*429/i.test(message) || /API error 429/.test(message)) {
    return new HttpsError(
      "resource-exhausted",
      "Nuvem Fiscal está limitando requisições no momento. Tente novamente em alguns segundos.",
    );
  }

  if (/authentication failed:\s*401/i.test(message) || /API error 401/.test(message)) {
    return new HttpsError(
      "failed-precondition",
      "Credenciais da Nuvem Fiscal inválidas ou expiradas.",
    );
  }

  return new HttpsError("internal", `${fallbackMessage}: ${message}`);
}

/**
 * Make an authenticated API call to Nuvem Fiscal
 */
async function nuvemFiscalRequest(method, path, token, body = null) {
  const url = `${getNuvemFiscalApiBaseUrl()}${path}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let errorDetail = "";
    if (contentType.includes("application/json")) {
      const errorJson = await response.json();
      errorDetail = JSON.stringify(errorJson);
    } else {
      errorDetail = await response.text();
    }
    logger.error("Nuvem Fiscal API error", {
      method,
      path,
      url,
      status: response.status,
      requestBody: body ?? null,
      responseDetail: errorDetail,
    });
    throw new Error(`Nuvem Fiscal API error ${response.status}: ${errorDetail}`);
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function nuvemFiscalRequestWithFallback(method, paths, token, body = null) {
  let lastError = null;

  for (const path of paths) {
    try {
      return await nuvemFiscalRequest(method, path, token, body);
    } catch (error) {
      lastError = error;
      const notFound = /API error 404/.test(error.message || "");
      if (!notFound) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Nuvem Fiscal request failed");
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateOrderByNfceId(idRestaurante, nfceId, payload) {
  if (!nfceId) return;

  const restauranteRef = db.collection("restaurantes").doc(idRestaurante);
  const [mesaPedidosSnap, historicoSnap] = await Promise.all([
    db.collectionGroup("pedidos").where("nfceId", "==", nfceId).limit(10).get(),
    restauranteRef.collection("historicoPedidos").where("nfceId", "==", nfceId).limit(10).get(),
  ]);

  const updates = [];
  mesaPedidosSnap.forEach((docSnap) => {
    const parentRestauranteId = docSnap.ref.parent.parent?.parent?.parent?.id;
    if (parentRestauranteId === idRestaurante) {
      updates.push(docSnap.ref.set(payload, {merge: true}));
    }
  });

  historicoSnap.forEach((docSnap) => {
    updates.push(docSnap.ref.set(payload, {merge: true}));
  });

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

/**
 * Validates company fields required by POST/PUT /empresas.
 * @param {object} configFiscal
 * @returns {{cnpjDigits: string, endereco: object}}
 */
function validateEmpresaConfig(configFiscal) {
  const endereco = configFiscal?.endereco || {};
  const cnpjDigits = (configFiscal?.cnpj || "").replace(/\D/g, "");
  const cepDigits = (endereco.cep || "").replace(/\D/g, "");

  const missingFields = [];
  if (cnpjDigits.length !== 14) missingFields.push("cnpj");
  if (!configFiscal?.razaoSocial) missingFields.push("razaoSocial");
  if (!configFiscal?.email) missingFields.push("email");
  if (!endereco.logradouro) missingFields.push("endereco.logradouro");
  if (!endereco.numero) missingFields.push("endereco.numero");
  if (!endereco.bairro) missingFields.push("endereco.bairro");
  if (!endereco.codigoMunicipio) missingFields.push("endereco.codigoMunicipio");
  if (!endereco.uf) missingFields.push("endereco.uf");
  if (cepDigits.length !== 8) missingFields.push("endereco.cep");

  if (missingFields.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      `Dados da empresa incompletos para cadastro na Nuvem Fiscal: ${missingFields.join(", ")}`,
    );
  }

  return {cnpjDigits, endereco};
}

/**
 * Validates fields required by PUT /empresas/{cpf_cnpj}/nfce.
 * @param {object} configFiscal
 * @returns {{idCsc: number, csc: string}}
 */
function validateNfceConfig(configFiscal) {
  const idCsc = parseInt(configFiscal?.nfce?.idCsc, 10);
  const csc = configFiscal?.nfce?.csc || "";

  const missingFields = [];
  if (!Number.isInteger(idCsc) || idCsc <= 0) missingFields.push("nfce.idCsc");
  if (!csc.trim()) missingFields.push("nfce.csc");

  if (missingFields.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      `Configuração de NFC-e incompleta: ${missingFields.join(", ")}`,
    );
  }

  return {idCsc, csc: csc.trim()};
}

// ============================================================================
// FUNCTION: nfceRegistrarEmpresa
// Registers/updates the restaurant as an "empresa" in Nuvem Fiscal
// ============================================================================
exports.nfceRegistrarEmpresa = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    logger.info("Registering empresa for restaurant", {idRestaurante, uid});

    // Read configFiscal from Firestore
    const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
    if (!restDoc.exists) {
      throw new HttpsError("not-found", "Restaurant not found");
    }
    const configFiscal = restDoc.data()?.configFiscal;
    if (!configFiscal) {
      throw new HttpsError("failed-precondition", "Configuração fiscal não encontrada");
    }

    try {
      const {cnpjDigits, endereco} = validateEmpresaConfig(configFiscal);
      const token = await getAccessToken("empresa");

      // Build empresa payload
      const empresaPayload = {
        cpf_cnpj: cnpjDigits,
        nome_razao_social: configFiscal.razaoSocial,
        nome_fantasia: configFiscal.nomeFantasia || configFiscal.razaoSocial,
        inscricao_estadual: configFiscal.inscricaoEstadual || "",
        inscricao_municipal: configFiscal.inscricaoMunicipal || "",
        fone: configFiscal.fone || "",
        email: configFiscal.email || "",
        endereco: {
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento || undefined,
          bairro: endereco.bairro,
          codigo_municipio: endereco.codigoMunicipio,
          cidade: endereco.municipio,
          uf: endereco.uf,
          cep: endereco.cep?.replace(/\D/g, ""),
          codigo_pais: "1058",
          pais: "Brasil",
        },
      };

      // Try to create the empresa; if it already exists (409), update it
      try {
        await nuvemFiscalRequest("POST", "/empresas", token, empresaPayload);
        logger.info("Empresa created in Nuvem Fiscal", {cnpj: cnpjDigits});
      } catch (err) {
        if (err.message.includes("409") || err.message.includes("already")) {
          // Empresa already exists, update it
          await nuvemFiscalRequest("PUT", `/empresas/${cnpjDigits}`, token, empresaPayload);
          logger.info("Empresa updated in Nuvem Fiscal", {cnpj: cnpjDigits});
        } else {
          throw err;
        }
      }

      // Update Firestore
      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          empresaRegistrada: true,
        },
      }, {merge: true});

      return {success: true, message: "Empresa registrada/atualizada com sucesso"};
    } catch (err) {
      logger.error("Error registering empresa", {error: err.message, idRestaurante});
      throw new HttpsError("internal", `Erro ao registrar empresa: ${err.message}`);
    }
  },
);

// ============================================================================
// FUNCTION: nfceConfigurarEmpresa
// Configures NFC-e settings for an already registered company
// ============================================================================
exports.nfceConfigurarEmpresa = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    logger.info("Configuring NFC-e for restaurant", {idRestaurante, uid});

    const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
    if (!restDoc.exists) {
      throw new HttpsError("not-found", "Restaurant not found");
    }

    const configFiscal = restDoc.data()?.configFiscal;
    if (!configFiscal) {
      throw new HttpsError("failed-precondition", "Configuração fiscal não encontrada");
    }

    if (!configFiscal.empresaRegistrada && !configFiscal.ativo) {
      throw new HttpsError(
        "failed-precondition",
        "Cadastre a empresa na Nuvem Fiscal antes de configurar NFC-e",
      );
    }

    try {
      const {cnpjDigits} = validateEmpresaConfig(configFiscal);
      const {idCsc, csc} = validateNfceConfig(configFiscal);
      const token = await getAccessToken("empresa nfce");

      const nfceConfig = {
        ambiente: getNuvemFiscalEnvironment(),
        sefaz: {
          id_csc: idCsc,
          csc,
        },
      };

      await nuvemFiscalRequest("PUT", `/empresas/${cnpjDigits}/nfce`, token, nfceConfig);
      logger.info("NFC-e config set for empresa", {cnpj: cnpjDigits});

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          ativo: true,
        },
      }, {merge: true});

      return {success: true, message: "Configuração de NFC-e salva com sucesso"};
    } catch (err) {
      logger.error("Error configuring NFC-e", {error: err.message, idRestaurante});
      throw new HttpsError("internal", `Erro ao configurar NFC-e: ${err.message}`);
    }
  },
);

// ============================================================================
// FUNCTION: nfceEmitir
// Emits an NFC-e for a specific order
// ============================================================================
exports.nfceEmitir = onCall(
  {
    secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment],
    maxInstances: 10,
    timeoutSeconds: 60,
  },
  async (request) => {
    const {idRestaurante, mesaId, pedidoId, cpfConsumidor} = request.data;

    if (!idRestaurante || !mesaId || !pedidoId) {
      throw new HttpsError("invalid-argument", "idRestaurante, mesaId, and pedidoId are required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_orders", "view_fiscal"]);

    logger.info("Emitting NFC-e", {idRestaurante, mesaId, pedidoId, uid});

    // 1. Read restaurant config and order data.
    // Orders may have already moved to historicoPedidos after checkout.
    const pedidoMesaRef = db.collection("restaurantes").doc(idRestaurante)
      .collection("mesas").doc(mesaId)
      .collection("pedidos").doc(pedidoId);
    const pedidoHistoricoRef = db.collection("restaurantes").doc(idRestaurante)
      .collection("historicoPedidos").doc(pedidoId);

    const [restSnap, pedidoMesaSnap, pedidoHistoricoSnap] = await Promise.all([
      db.collection("restaurantes").doc(idRestaurante).get(),
      pedidoMesaRef.get(),
      pedidoHistoricoRef.get(),
    ]);

    if (!restSnap.exists) {
      throw new HttpsError("not-found", "Restaurant not found");
    }
    if (!pedidoMesaSnap.exists && !pedidoHistoricoSnap.exists) {
      throw new HttpsError("not-found", "Pedido not found");
    }

    const configFiscal = restSnap.data()?.configFiscal;
    if (!configFiscal?.ativo) {
      throw new HttpsError("failed-precondition", "Configuração fiscal não ativa");
    }

    const pedidoSnap = pedidoMesaSnap.exists ? pedidoMesaSnap : pedidoHistoricoSnap;
    const pedidoOrigem = pedidoMesaSnap.exists ? "mesa" : "historico";
    const pedido = {id: pedidoSnap.id, ...pedidoSnap.data()};
    logger.info("Pedido loaded for NFC-e", {pedidoId, pedidoOrigem});
    if (!pedido.items || pedido.items.length === 0) {
      throw new HttpsError("failed-precondition", "Pedido sem itens");
    }

    // Check if NFC-e was already emitted
    if (pedido.nfceStatus === "autorizado") {
      return {
        success: true,
        nfceId: pedido.nfceId || null,
        chaveAcesso: pedido.chaveAcesso || null,
        nfceStatus: "autorizado",
        numero: pedido.nfceNumero || null,
        alreadyEmitted: true,
      };
    }

    if ((pedido.nfceStatus === "processando" || pedido.nfceStatus === "pendente") && pedido.nfceId) {
      return {
        success: false,
        nfceId: pedido.nfceId,
        chaveAcesso: pedido.chaveAcesso || null,
        nfceStatus: pedido.nfceStatus,
        error: "NFC-e ainda em processamento. Consulte o status novamente em instantes.",
      };
    }

    const cnpj = configFiscal.cnpj.replace(/\D/g, "");
    const endereco = configFiscal.endereco || {};
    const cUF = UF_TO_CUF[endereco.uf];
    if (!cUF) {
      throw new HttpsError("failed-precondition", `UF inválida: ${endereco.uf}`);
    }

    // NCM default
    const ncmPadrao = configFiscal.ncmPadrao || "21069090";

    // 2. Get next number atomically
    const restRef = db.collection("restaurantes").doc(idRestaurante);
    let nNF;
    await db.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(restRef);
      const freshConfig = freshSnap.data()?.configFiscal;
      nNF = freshConfig?.nfce?.proximoNumero || 1;
      transaction.update(restRef, {
        "configFiscal.nfce.proximoNumero": nNF + 1,
      });
    });

    // 3. Calculate totals
    // Incorporate taxaEntrega proportionally into item prices
    const taxaEntrega = (pedido.taxaEntrega?.aplicada && pedido.taxaEntrega?.valor > 0)
      ? Number(pedido.taxaEntrega.valor)
      : 0;

    const subtotalPedido = pedido.items.reduce((sum, item) => {
      return sum + (Number(item.price) * Number(item.quantity || 1));
    }, 0);

    const fatorTaxa = subtotalPedido > 0 ? (subtotalPedido + taxaEntrega) / subtotalPedido : 1;

    // 4. Build det (items array)
    const det = pedido.items.map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price) * fatorTaxa;
      const vUnCom = Math.round(unitPrice * 100) / 100;
      const vProd = Math.round(vUnCom * quantity * 100) / 100;

      return {
        nItem: index + 1,
        prod: {
          cProd: item.id || String(index + 1),
          cEAN: "SEM GTIN",
          xProd: (item.nome || `Item ${index + 1}`).substring(0, 120),
          NCM: item.ncm || ncmPadrao,
          CFOP: "5102",
          uCom: "UN",
          qCom: quantity,
          vUnCom,
          vProd,
          cEANTrib: "SEM GTIN",
          uTrib: "UN",
          qTrib: quantity,
          vUnTrib: vUnCom,
          indTot: 1,
        },
        imposto: buildImposto(configFiscal.crt, vProd),
      };
    });

    // 5. Calculate totals
    const vProdTotal = det.reduce((sum, d) => sum + d.prod.vProd, 0);
    const vNF = Math.round(vProdTotal * 100) / 100;

    // 6. Payment mapping
    const formaPagamento = pedido.formaPagamento || "dinheiro";
    const tPag = FORMA_PAGAMENTO_MAP[formaPagamento] || "99";

    // 7. Build the NfePedidoEmissao
    const nfcePayload = {
      infNFe: {
        versao: "4.00",
        ide: {
          cUF,
          natOp: "VENDA AO CONSUMIDOR",
          mod: 65, // NFC-e
          serie: parseInt(configFiscal.nfce.serie) || 1,
          nNF,
          dhEmi: new Date().toISOString(),
          tpNF: 1, // 1 = saída
          idDest: 1, // 1 = operação interna
          cMunFG: endereco.codigoMunicipio,
          tpImp: 4, // 4 = DANFE NFC-e
          tpEmis: 1, // 1 = normal
          finNFe: 1, // 1 = normal
          indFinal: 1, // 1 = consumidor final
          indPres: 1, // 1 = operação presencial
          procEmi: 0, // 0 = emissão com aplicativo do contribuinte
          verProc: "MesaFacil1.0",
        },
        emit: {
          CNPJ: cnpj,
          CRT: configFiscal.crt,
        },
        det,
        total: {
          ICMSTot: {
            vBC: 0,
            vICMS: 0,
            vICMSDeson: 0,
            vFCP: 0,
            vBCST: 0,
            vST: 0,
            vFCPST: 0,
            vFCPSTRet: 0,
            vProd: vNF,
            vFrete: 0,
            vSeg: 0,
            vDesc: 0,
            vII: 0,
            vIPI: 0,
            vIPIDevol: 0,
            vPIS: 0,
            vCOFINS: 0,
            vOutro: 0,
            vNF,
          },
        },
        transp: {
          modFrete: 9, // 9 = sem frete
        },
        pag: {
          detPag: [
            {
              tPag,
              vPag: vNF,
            },
          ],
        },
      },
      ambiente: getNuvemFiscalEnvironment(),
      referencia: pedidoId,
    };

    // Add dest (consumer) if CPF provided
    if (cpfConsumidor) {
      const cpfDigits = cpfConsumidor.replace(/\D/g, "");
      if (cpfDigits.length === 11) {
        nfcePayload.infNFe.dest = {
          CPF: cpfDigits,
          indIEDest: 9, // 9 = Não contribuinte
        };
      } else if (cpfDigits.length === 14) {
        nfcePayload.infNFe.dest = {
          CNPJ: cpfDigits,
          indIEDest: 9,
        };
      }
    }

    // 8. Submit to Nuvem Fiscal
    try {
      const token = await getAccessToken("nfce");

      // Mark order as processing to prevent duplicate emission requests.
      const processingUpdate = {
        nfceStatus: "processando",
        nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const processingUpdatePromises = [];
      if (pedidoMesaSnap.exists) processingUpdatePromises.push(pedidoMesaRef.set(processingUpdate, {merge: true}));
      if (pedidoHistoricoSnap.exists) processingUpdatePromises.push(pedidoHistoricoRef.set(processingUpdate, {merge: true}));
      await Promise.all(processingUpdatePromises);

      let nfce = await nuvemFiscalRequest("POST", "/nfce", token, nfcePayload);
      logger.info("NFC-e submission response", {id: nfce.id, status: nfce.status});

      // 9. Poll if pending
      if (nfce.status === "pendente" || nfce.status === "processando") {
        const maxPollAttempts = 15;
        const pollIntervalMs = 3000;
        for (let i = 0; i < maxPollAttempts; i++) {
          await sleep(pollIntervalMs);
          nfce = await nuvemFiscalRequest("GET", `/nfce/${nfce.id}`, token);
          logger.info("NFC-e poll attempt", {attempt: i + 1, status: nfce.status});
          if (nfce.status !== "pendente" && nfce.status !== "processando") break;
        }
      }

      // 10. Process result
      const nfceResult = {
        nfceId: nfce.id,
        chaveAcesso: nfce.chave || null,
        linkDanfce: nfce.url_danfce || nfce.url || null,
        nfceStatus: nfce.status,
        numero: nNF,
        serie: parseInt(configFiscal.nfce.serie) || 1,
      };

      if (nfce.status === "autorizado") {
        // Persist NFC-e result in whichever order document still exists.
        const updatePayload = {
          nfceId: nfceResult.nfceId,
          chaveAcesso: nfceResult.chaveAcesso,
          linkDanfce: nfceResult.linkDanfce,
          nfceStatus: "autorizado",
          nfceNumero: nNF,
          nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const updatePromises = [];
        if (pedidoMesaSnap.exists) updatePromises.push(pedidoMesaRef.update(updatePayload));
        if (pedidoHistoricoSnap.exists) updatePromises.push(pedidoHistoricoRef.update(updatePayload));
        await Promise.all(updatePromises);

        logger.info("NFC-e authorized successfully", {nfceId: nfce.id, chave: nfce.chave});
        return {success: true, ...nfceResult};
      } else if (nfce.status === "rejeitado" || nfce.status === "erro") {
        const mensagens = nfce.mensagens || [];
        const descricao = mensagens.length > 0
          ? mensagens.map((m) => m.descricao || m.mensagem || JSON.stringify(m)).join("; ")
          : "Nota rejeitada pela SEFAZ";

        logger.error("NFC-e rejected", {nfceId: nfce.id, mensagens});

        // Persist rejection status in whichever order document still exists.
        const updatePayload = {
          nfceId: nfceResult.nfceId,
          nfceStatus: "rejeitado",
          nfceErro: descricao,
          nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const updatePromises = [];
        if (pedidoMesaSnap.exists) updatePromises.push(pedidoMesaRef.update(updatePayload));
        if (pedidoHistoricoSnap.exists) updatePromises.push(pedidoHistoricoRef.update(updatePayload));
        await Promise.all(updatePromises);

        return {success: false, ...nfceResult, error: descricao};
      } else {
        // Still pending after polling
        logger.warn("NFC-e still pending after polling", {nfceId: nfce.id});
        const updatePayload = {
          nfceId: nfceResult.nfceId,
          nfceStatus: "pendente",
          nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const updatePromises = [];
        if (pedidoMesaSnap.exists) updatePromises.push(pedidoMesaRef.set(updatePayload, {merge: true}));
        if (pedidoHistoricoSnap.exists) updatePromises.push(pedidoHistoricoRef.set(updatePayload, {merge: true}));
        await Promise.all(updatePromises);

        return {
          success: false,
          ...nfceResult,
          error: "Nota ainda pendente de processamento. Tente consultar novamente.",
        };
      }
    } catch (err) {
      logger.error("Error emitting NFC-e", {error: err.message, idRestaurante, pedidoId});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao emitir NFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultar
// Checks the current status of an NFC-e
// ============================================================================
exports.nfceConsultar = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, nfceId} = request.data;
    if (!idRestaurante || !nfceId) {
      throw new HttpsError("invalid-argument", "idRestaurante and nfceId are required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal", "edit_orders"]);

    try {
      const token = await getAccessToken("nfce");
      const nfce = await nuvemFiscalRequest("GET", `/nfce/${nfceId}`, token);
      logger.info("NFC-e consulted", {idRestaurante, nfceId, uid, status: nfce.status});
      return {
        id: nfce.id,
        status: nfce.status,
        chaveAcesso: nfce.chave || null,
        linkDanfce: nfce.url_danfce || nfce.url || null,
        mensagens: nfce.mensagens || [],
      };
    } catch (err) {
      logger.error("Error consulting NFC-e", {error: err.message, nfceId});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar NFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceListar
// Lists all NFC-es emitted for a restaurant with pagination
// ============================================================================
exports.nfceListar = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, top = 50, skip = 0} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal"]);

    logger.info("Listing NFC-es", {idRestaurante, top, skip, uid});

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      if (!configFiscal?.cnpj) {
        throw new HttpsError("failed-precondition", "Restaurant has no fiscal configuration");
      }

      const cnpj = configFiscal.cnpj.replace(/\D/g, "");
      const token = await getAccessToken("nfce");

      // Query the Nuvem Fiscal API for NFC-es by CNPJ
      // Uses OData query syntax: $skip and $top for pagination
      const params = new URLSearchParams();
      params.append("cpf_cnpj", cnpj);
      params.append("ambiente", getNuvemFiscalEnvironment());
      params.append("$top", String(Math.min(top, 100))); // OData: limit 1-100
      params.append("$skip", String(Math.max(skip, 0))); // OData: offset
      params.append("$inlinecount", "true"); // Include total count

      const url = `${getNuvemFiscalApiBaseUrl()}/nfce?${params.toString()}`;
      logger.info("Calling Nuvem Fiscal API", {url: url.replace(cnpj, "***")});

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error("Nuvem Fiscal list error", {
          url: url.replace(cnpj, "***"),
          status: response.status,
          error: errorBody,
        });
        throw new Error(`Nuvem Fiscal API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      // Parse response: data.data contains NFC-es array, @count is total
      return {
        success: true,
        data: {
          nfces: data.data || [],
          total: data["@count"] || data.total || (data.data?.length || 0),
          top,
          skip,
        },
      };
    } catch (err) {
      logger.error("Error listing NFC-es", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao listar NFC-es");
    }
  },
);

// ============================================================================
// FUNCTION: nfceCancelar
// Cancels an authorized NFC-e
// ============================================================================
exports.nfceCancelar = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, nfceId, justificativa} = request.data;

    if (!idRestaurante || !nfceId || !justificativa) {
      throw new HttpsError(
        "invalid-argument",
        "idRestaurante, nfceId, and justificativa are required",
      );
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal", "edit_orders"]);

    try {
      const token = await getAccessToken("nfce");
      const payload = {
        justificativa: String(justificativa).trim(),
      };

      const nfce = await nuvemFiscalRequestWithFallback(
        "POST",
        [
          `/nfce/${nfceId}/cancelamento`,
          `/nfce/${nfceId}/cancelar`,
          `/nfce/${nfceId}/cancelamento/solicitar`,
        ],
        token,
        payload,
      );

      const cancelStatus = nfce.status || "cancelado";
      const updatePayload = {
        nfceStatus: cancelStatus,
        nfceCancelada: true,
        nfceCanceladaEm: admin.firestore.FieldValue.serverTimestamp(),
        nfceCancelamentoJustificativa: payload.justificativa,
        nfceCancelamentoId: nfce.id_cancelamento || nfce.cancelamento_id || null,
        nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await updateOrderByNfceId(idRestaurante, nfceId, updatePayload);

      logger.info("NFC-e canceled", {idRestaurante, nfceId, uid, status: cancelStatus});
      return {
        success: true,
        nfceId,
        status: cancelStatus,
        message: "NFC-e cancelada com sucesso",
        data: nfce,
      };
    } catch (err) {
      logger.error("Error canceling NFC-e", {idRestaurante, nfceId, uid, error: err.message});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao cancelar NFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceSincronizarDocumentos
// Fetches NFC-e details and persists XML/DANFE links in Firestore
// ============================================================================
exports.nfceSincronizarDocumentos = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, nfceId} = request.data;

    if (!idRestaurante || !nfceId) {
      throw new HttpsError("invalid-argument", "idRestaurante and nfceId are required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal"]);

    try {
      const token = await getAccessToken("nfce");
      const nfce = await nuvemFiscalRequest("GET", `/nfce/${nfceId}`, token);

      const documentos = {
        danfceUrl: nfce.url_danfce || nfce.url || null,
        xmlUrl: nfce.url_xml || nfce.xml_url || null,
        pdfUrl: nfce.url_pdf || null,
        chaveAcesso: nfce.chave || null,
        status: nfce.status || null,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const updatePayload = {
        linkDanfce: documentos.danfceUrl,
        linkXml: documentos.xmlUrl,
        linkPdf: documentos.pdfUrl,
        chaveAcesso: documentos.chaveAcesso,
        nfceStatus: documentos.status,
        nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await updateOrderByNfceId(idRestaurante, nfceId, updatePayload);

      logger.info("NFC-e documents synced", {idRestaurante, nfceId, uid});
      return {
        success: true,
        nfceId,
        documentos,
      };
    } catch (err) {
      logger.error("Error syncing NFC-e documents", {idRestaurante, nfceId, uid, error: err.message});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao sincronizar documentos da NFC-e");
    }
  },
);

// ============================================================================
// HELPER: Build imposto object based on CRT
// ============================================================================
function buildImposto(crt, vProd) {
  // For Simples Nacional (CRT 1 or 4), use ICMSSN102
  if (crt === 1 || crt === 4) {
    return {
      ICMS: {
        ICMSSN102: {
          orig: 0, // 0 = Nacional
          CSOSN: "102", // 102 = Tributada sem permissão de crédito
        },
      },
      PIS: {
        PISOutr: {
          CST: "07", // 07 = Operação isenta
          vBC: 0,
          pPIS: 0,
          vPIS: 0,
        },
      },
      COFINS: {
        COFINSOutr: {
          CST: "07", // 07 = Operação isenta
          vBC: 0,
          pCOFINS: 0,
          vCOFINS: 0,
        },
      },
    };
  }

  // For Regime Normal (CRT 3), use ICMS00 (simplified - 0% for food in many states)
  return {
    ICMS: {
      ICMS00: {
        orig: 0,
        CST: "00",
        modBC: 3, // 3 = Valor da operação
        vBC: vProd,
        pICMS: 0,
        vICMS: 0,
      },
    },
    PIS: {
      PISAliq: {
        CST: "01",
        vBC: vProd,
        pPIS: 0,
        vPIS: 0,
      },
    },
    COFINS: {
      COFINSAliq: {
        CST: "01",
        vBC: vProd,
        pCOFINS: 0,
        vCOFINS: 0,
      },
    },
  };
}
