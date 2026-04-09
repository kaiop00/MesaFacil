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

// Define secret for NFC-e emission control (temporary debugging flag)
const nfceEmitDisabled = defineSecret("NFCE_EMIT_DISABLED");

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
  cheque: "02",
  debito: "04",
  credito: "03",
  pix: "17",
  credito_loja: "05",
  vale_alimentacao: "10",
  vale_refeicao: "11",
  vale_presente: "12",
  vale_combustivel: "13",
  boleto: "15",
  deposito: "16",
  transferencia: "18",
  carteira_digital: "18",
  cashback: "19",
  sem_pagamento: "90",
  voucher: "99",
  ifood: "99",
};

const PAYMENT_BRAND_TO_TBAND = {
  VISA: "01",
  MASTERCARD: "02",
  MASTER: "02",
  AMEX: "03",
  AMERICAN_EXPRESS: "03",
  SOROCRED: "04",
  DINERS: "05",
  ELO: "06",
  HIPERCARD: "07",
  AURA: "08",
  CABAL: "09",
  ALELO: "99",
  VR: "99",
  SODEXO: "99",
  TICKET: "99",
};

const PIS_COFINS_ALIQUOTAS_DEFAULT = {
  pis: 0.65,
  cofins: 3.00,
};

const DEFAULT_APPROX_TAX_RATES = {
  federal: 0.085,
  estadual: 0.18,
  municipal: 0.02,
};

const UF_DEFAULT_STATE_TAX_RATE = {
  AC: 0.17,
  AL: 0.19,
  AM: 0.18,
  AP: 0.18,
  BA: 0.19,
  CE: 0.18,
  DF: 0.18,
  ES: 0.17,
  GO: 0.19,
  MA: 0.18,
  MG: 0.18,
  MS: 0.17,
  MT: 0.17,
  PA: 0.17,
  PB: 0.18,
  PE: 0.18,
  PI: 0.19,
  PR: 0.19,
  RJ: 0.20,
  RN: 0.18,
  RO: 0.175,
  RR: 0.17,
  RS: 0.17,
  SC: 0.17,
  SE: 0.19,
  SP: 0.18,
  TO: 0.18,
};

const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 30 * 1000;
const tokenCache = new Map();

const NFCE_ALLOWED_ENVIRONMENTS = ["homologacao", "producao"];
const CERTIFICATE_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const CERTIFICATE_ALLOWED_EXTENSIONS = [".pfx", ".p12"];
const DANFCE_MIN_WIDTH = 40;
const DANFCE_MAX_WIDTH = 80;
const DANFCE_MAX_FOOTER_MESSAGE_LENGTH = 120;

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

  if (/API error 400/.test(message)) {
    if (/InvalidJsonProperty/i.test(message)) {
      return new HttpsError(
        "invalid-argument",
        "Configuração enviada para NFC-e contém campos inválidos para a API da Nuvem Fiscal.",
      );
    }

    return new HttpsError(
      "invalid-argument",
      "Dados inválidos ao configurar NFC-e na Nuvem Fiscal.",
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

async function nuvemFiscalRequestBinary(method, path, token, body = null) {
  const url = `${getNuvemFiscalApiBaseUrl()}${path}`;
  const requestOptions = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/pdf, application/json",
      "Content-Type": "application/json",
    },
  };

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);

  const contentType = response.headers.get("content-type") || "";
  const contentDisposition = response.headers.get("content-disposition") || "";

  if (!response.ok) {
    let errorDetail = "";
    if (contentType.includes("application/json")) {
      const errorJson = await response.json();
      errorDetail = JSON.stringify(errorJson);
    } else {
      errorDetail = await response.text();
    }

    logger.error("Nuvem Fiscal API binary error", {
      method,
      path,
      url,
      status: response.status,
      responseDetail: errorDetail,
    });
    throw new Error(`Nuvem Fiscal API error ${response.status}: ${errorDetail}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    contentType,
    contentDisposition,
  };
}

function parseBooleanOption(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "nao", "não", "no", "off"].includes(normalized)) return false;
  }

  throw new HttpsError("invalid-argument", `Campo '${fieldName}' deve ser booleano.`);
}

function parseOptionalIntegerOption(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new HttpsError("invalid-argument", `Campo '${fieldName}' deve ser um inteiro.`);
  }
  return parsed;
}

function parseDanfceOptions(rawOptions = {}) {
  const options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};

  const logotipo = parseBooleanOption(options.logotipo, "logotipo");
  const nomeFantasia = parseBooleanOption(options.nome_fantasia, "nome_fantasia");
  const resumido = parseBooleanOption(options.resumido, "resumido");
  const qrcodeLateral = parseBooleanOption(options.qrcode_lateral, "qrcode_lateral");

  const largura = parseOptionalIntegerOption(options.largura, "largura");
  if (largura !== null && (largura < DANFCE_MIN_WIDTH || largura > DANFCE_MAX_WIDTH)) {
    throw new HttpsError(
      "invalid-argument",
      `Campo 'largura' deve estar entre ${DANFCE_MIN_WIDTH} e ${DANFCE_MAX_WIDTH}.`,
    );
  }

  let mensagemRodape = null;
  if (options.mensagem_rodape !== undefined && options.mensagem_rodape !== null) {
    mensagemRodape = String(options.mensagem_rodape).trim();
    if (mensagemRodape.length > DANFCE_MAX_FOOTER_MESSAGE_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `Campo 'mensagem_rodape' deve ter no máximo ${DANFCE_MAX_FOOTER_MESSAGE_LENGTH} caracteres.`,
      );
    }
  }

  let margem = null;
  if (options.margem !== undefined && options.margem !== null && String(options.margem).trim()) {
    margem = String(options.margem).trim();
    const parts = margem.split(",").map((item) => item.trim());
    const validLength = parts.length >= 1 && parts.length <= 4;
    const validValues = parts.every((part) => /^\d$/.test(part));
    if (!validLength || !validValues) {
      throw new HttpsError(
        "invalid-argument",
        "Campo 'margem' deve conter de 1 a 4 valores entre 0 e 9, separados por vírgula.",
      );
    }
    margem = parts.join(",");
  }

  return {
    logotipo,
    nome_fantasia: nomeFantasia,
    mensagem_rodape: mensagemRodape,
    resumido,
    qrcode_lateral: qrcodeLateral,
    largura,
    margem,
  };
}

function buildDanfcePdfQueryString(options = {}) {
  const params = new URLSearchParams();

  const boolFields = ["logotipo", "nome_fantasia", "resumido", "qrcode_lateral"];
  for (const field of boolFields) {
    if (typeof options[field] === "boolean") {
      params.append(field, String(options[field]));
    }
  }

  if (typeof options.mensagem_rodape === "string" && options.mensagem_rodape) {
    params.append("mensagem_rodape", options.mensagem_rodape);
  }

  if (Number.isInteger(options.largura)) {
    params.append("largura", String(options.largura));
  }

  if (typeof options.margem === "string" && options.margem) {
    params.append("margem", options.margem);
  }

  return params.toString();
}

function extractFilenameFromContentDisposition(contentDisposition = "") {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replace(/"/g, "").trim();
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (!plainMatch?.[1]) return null;

  return plainMatch[1].replace(/"/g, "").trim();
}

async function loadNfcePreviewContext(idRestaurante, mesaId, pedidoId) {
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
  const pedido = {id: pedidoSnap.id, ...pedidoSnap.data()};
  if (!pedido.items || pedido.items.length === 0) {
    throw new HttpsError("failed-precondition", "Pedido sem itens");
  }

  const cnpj = configFiscal.cnpj.replace(/\D/g, "");
  const endereco = configFiscal.endereco || {};
  const cUF = UF_TO_CUF[endereco.uf];
  if (!cUF) {
    throw new HttpsError("failed-precondition", `UF inválida: ${endereco.uf}`);
  }

  const ncmPadrao = configFiscal.ncmPadrao || "21069090";
  const configuredCrt = resolveConfiguredCrt(configFiscal);
  const nNF = Number(configFiscal?.nfce?.proximoNumero || 1);

  const taxaEntrega = (pedido.taxaEntrega?.aplicada && pedido.taxaEntrega?.valor > 0)
    ? Number(pedido.taxaEntrega.valor)
    : 0;

  const subtotalPedido = pedido.items.reduce((sum, item) => {
    return sum + (Number(item.price) * Number(item.quantity || 1));
  }, 0);

  const fatorTaxa = subtotalPedido > 0 ? (subtotalPedido + taxaEntrega) / subtotalPedido : 1;
  const approxTaxRates = resolveApproxTaxRates(configFiscal, endereco);

  const det = pedido.items.map((item, index) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.price) * fatorTaxa;
    const vUnCom = Math.round(unitPrice * 100) / 100;
    const vProd = Math.round(vUnCom * quantity * 100) / 100;
    const itemApproxTrib = roundCurrency(vProd * approxTaxRates.total);
    const imposto = buildImposto(configuredCrt, vProd, item, configFiscal, itemApproxTrib);

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
      imposto,
    };
  });

  const vProdTotal = det.reduce((sum, d) => sum + d.prod.vProd, 0);
  const vNF = Math.round(vProdTotal * 100) / 100;
  const vPISTotal = roundCurrency(det.reduce((sum, d) => sum + extractPisValue(d.imposto), 0));
  const vCOFINSTotal = roundCurrency(det.reduce((sum, d) => sum + extractCofinsValue(d.imposto), 0));
  const {detPagList, vTroco} = resolveDetPagList(pedido, vNF, configFiscal);
  const indPres = resolveIndPresFromPedido(pedido);
  const vTotTribTotal = roundCurrency(det.reduce((sum, d) => sum + Number(d.imposto?.vTotTrib || 0), 0));

  return {
    configFiscal,
    pedido,
    cnpj,
    endereco,
    cUF,
    ncmPadrao,
    configuredCrt,
    det,
    vNF,
    vPISTotal,
    vCOFINSTotal,
    detPagList,
    vTroco,
    indPres,
    vTotTribTotal,
    nNF,
  };
}

function buildNfcePayloadFromContext(context, cpfConsumidor = null) {
  const {
    configFiscal,
    cnpj,
    cUF,
    endereco,
    configuredCrt,
    det,
    vNF,
    vPISTotal,
    vCOFINSTotal,
    detPagList,
    vTroco,
    indPres,
    vTotTribTotal,
    nNF,
  } = context;

  const nfcePayload = {
    infNFe: {
      versao: "4.00",
      ide: {
        cUF,
        natOp: "VENDA AO CONSUMIDOR",
        mod: 65,
        serie: parseInt(configFiscal.nfce.serie) || 1,
        nNF,
        dhEmi: formatDhEmiSefaz(),
        tpNF: 1,
        idDest: 1,
        cMunFG: endereco.codigoMunicipio,
        tpImp: 4,
        tpEmis: 1,
        finNFe: 1,
        indFinal: 1,
        indPres,
        procEmi: 0,
        verProc: "MesaFacil1.0",
      },
      emit: {
        CNPJ: cnpj,
        CRT: configuredCrt,
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
          vPIS: vPISTotal,
          vCOFINS: vCOFINSTotal,
          vOutro: 0,
          vTotTrib: vTotTribTotal,
          vNF,
        },
      },
      transp: {
        modFrete: 9,
      },
      pag: {
        ...(vTroco > 0 ? {vTroco} : {}),
        detPag: detPagList,
      },
    },
    ambiente: resolveNfceEnvironment(configFiscal),
    referencia: String(context.pedido?.id || ""),
  };

  if (cpfConsumidor) {
    const cpfDigits = String(cpfConsumidor).replace(/\D/g, "");
    if (cpfDigits.length === 11) {
      nfcePayload.infNFe.dest = {CPF: cpfDigits, indIEDest: 9};
    } else if (cpfDigits.length === 14) {
      nfcePayload.infNFe.dest = {CNPJ: cpfDigits, indIEDest: 9};
    }
  }

  return nfcePayload;
}

function getCnpjDigitsFromConfig(configFiscal) {
  const cnpjDigits = (configFiscal?.cnpj || "").replace(/\D/g, "");
  if (cnpjDigits.length !== 14) {
    throw new HttpsError(
      "failed-precondition",
      "CNPJ inválido na configuração fiscal do restaurante.",
    );
  }
  return cnpjDigits;
}

function resolveConfiguredCrt(configFiscal = {}) {
  const nfceCrt = Number(configFiscal?.nfce?.crt);
  if (Number.isInteger(nfceCrt) && nfceCrt >= 1 && nfceCrt <= 4) {
    return nfceCrt;
  }

  const legacyCrt = Number(configFiscal?.crt);
  if (Number.isInteger(legacyCrt) && legacyCrt >= 1 && legacyCrt <= 4) {
    return legacyCrt;
  }

  return 1;
}

function resolveNfceEnvironment(configFiscal = {}) {
  const configured = String(configFiscal?.nfce?.ambiente || "").trim().toLowerCase();
  if (NFCE_ALLOWED_ENVIRONMENTS.includes(configured)) {
    return configured;
  }
  return getNuvemFiscalEnvironment();
}

function normalizeCertificateInfo(certificado) {
  if (!certificado || typeof certificado !== "object") {
    return null;
  }

  return {
    id: certificado.id || null,
    serialNumber: certificado.serial_number || null,
    issuerName: certificado.issuer_name || null,
    subjectName: certificado.subject_name || null,
    thumbprint: certificado.thumbprint || null,
    notValidBefore: certificado.not_valid_before || null,
    notValidAfter: certificado.not_valid_after || null,
    cpfCnpj: certificado.cpf_cnpj || null,
    nomeRazaoSocial: certificado.nome_razao_social || null,
    createdAt: certificado.created_at || null,
  };
}

function hasAllowedCertificateExtension(fileName = "") {
  const lower = String(fileName).toLowerCase();
  return CERTIFICATE_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function normalizeBase64Payload(base64Value = "") {
  const value = String(base64Value || "").trim();
  if (!value) return "";
  if (value.includes(",")) {
    const [, encoded] = value.split(",");
    return (encoded || "").trim();
  }
  return value;
}

function estimateBytesFromBase64(base64Value = "") {
  const normalized = normalizeBase64Payload(base64Value).replace(/\s/g, "");
  if (!normalized) return 0;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function normalizeTaxRate(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  if (num > 1) return num / 100;
  return num;
}

function resolveApproxTaxRates(configFiscal = {}, endereco = {}) {
  const uf = String(endereco?.uf || "").toUpperCase();
  const configuredRates =
    configFiscal?.nfce?.tributosAproximados ||
    configFiscal?.tributosAproximados ||
    {};

  const federal = normalizeTaxRate(
    configuredRates.federal,
    DEFAULT_APPROX_TAX_RATES.federal,
  );
  const estadual = normalizeTaxRate(
    configuredRates.estadual,
    UF_DEFAULT_STATE_TAX_RATE[uf] || DEFAULT_APPROX_TAX_RATES.estadual,
  );
  const municipal = normalizeTaxRate(
    configuredRates.municipal,
    DEFAULT_APPROX_TAX_RATES.municipal,
  );

  return {
    federal,
    estadual,
    municipal,
    total: federal + estadual + municipal,
  };
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatDhEmiSefaz(date = new Date()) {
  // SEFAZ is stricter with timezone formatting; send explicit -03:00 and no milliseconds.
  const offsetMinutes = -180;
  const adjusted = new Date(date.getTime() + (offsetMinutes * 60 * 1000));

  const year = adjusted.getUTCFullYear();
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(adjusted.getUTCDate()).padStart(2, "0");
  const hours = String(adjusted.getUTCHours()).padStart(2, "0");
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, "0");
  const seconds = String(adjusted.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

function normalizePercent(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function isTruthyTaxFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;

  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "sim", "yes", "y", "on", "monofasico", "monofasica"].includes(normalized);
}

function normalizeTaxType(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim()
    .toLowerCase();
}

function sanitizePaymentDescription(value, fallback = "OUTROS") {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.substring(0, 60);
}

function resolvePaymentCodeAndDescription(formaPagamento, pedido = {}) {
  const normalizedMethod = normalizeTaxType(formaPagamento);
  const mapped = FORMA_PAGAMENTO_MAP[normalizedMethod];

  if (mapped === "99") {
    if (normalizedMethod === "ifood") {
      return {tPag: "99", xPag: "iFood"};
    }
    if (normalizedMethod === "voucher") {
      return {tPag: "99", xPag: "Voucher/Cortesia"};
    }
    const fallback = pedido?.observacoesPagamento || formaPagamento || "Outros";
    return {tPag: "99", xPag: sanitizePaymentDescription(fallback, "Outros")};
  }

  if (mapped) {
    return {tPag: mapped, xPag: null};
  }

  const fallback = pedido?.observacoesPagamento || formaPagamento || "Outros";
  return {tPag: "99", xPag: sanitizePaymentDescription(fallback, "Outros")};
}

function parseAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCardGroup(tPag, pedido = {}, configFiscal = {}, paymentEntry = null) {
  const supportsCardGroup = tPag === "03" || tPag === "04";
  const requiresPixCardGroup = tPag === "17";

  const paymentCandidate =
    pedido?.payments?.[0] ||
    pedido?.paymentsRaw?.methods?.[0] ||
    null;

  const cardSources = [
    paymentEntry,
    paymentEntry?.card,
    pedido?.pagamentoCartao,
    pedido?.cartao,
    pedido?.card,
    pedido?.pix,
    paymentCandidate,
    paymentCandidate?.card,
    configFiscal?.nfce,
  ].filter((source) => source && typeof source === "object");

  const readFirst = (keys = []) => {
    for (const source of cardSources) {
      for (const key of keys) {
        const value = source?.[key];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          return String(value).trim();
        }
      }
    }
    return "";
  };

  const cnpjRaw = readFirst([
    "cnpj",
    "cnpjCredenciadora",
    "credenciadoraCnpj",
    "acquirerCnpj",
    "cnpj_credenciadora",
  ]);
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");

  const brandRaw = readFirst([
    "brand",
    "bandeira",
    "cardBrand",
    "card_brand",
  ]).toUpperCase();

  const authRaw = readFirst([
    "authorizationCode",
    "authorization_code",
    "autorizacao",
    "authorization",
    "cAut",
    "caut",
    "transactionCode",
    "transaction_code",
    "txid",
    "pixTxId",
    "pixTransactionId",
  ]);

  const cAut = authRaw.replace(/\s+/g, "").substring(0, 20);
  const tBand = PAYMENT_BRAND_TO_TBAND[brandRaw] || "99";
  if (!supportsCardGroup && !requiresPixCardGroup) {
    return null;
  }

  const emitCnpjDigits = String(configFiscal?.cnpj || "").replace(/\D/g, "");
  const card = {
    tpIntegra: 2,
  };

  if (cnpjDigits.length === 14) {
    card.CNPJ = cnpjDigits;
  } else if (emitCnpjDigits.length === 14) {
    // Fallback to issuer CNPJ when acquirer/PSP CNPJ is not informed.
    // This avoids SEFAZ rejecting electronic payments with missing card group data.
    card.CNPJ = emitCnpjDigits;
  }

  if (supportsCardGroup) {
    card.tBand = tBand;
  }

  if (cAut) {
    card.cAut = cAut;
  }

  return card;
}

function resolveSingleDetPag({
  formaPagamento,
  valor,
  pedido,
  configFiscal,
}) {
  const {tPag, xPag} = resolvePaymentCodeAndDescription(formaPagamento, pedido);
  const isCashPayment = tPag === "01";
  const expectedValue = roundCurrency(valor);

  let vPag = expectedValue;
  let vTroco = 0;
  if (isCashPayment) {
    const paidCandidates = [
      pedido?.troco?.valorPagamento,
      pedido?.troco?.changeFor,
      pedido?.payments?.[0]?.changeFor,
      pedido?.paymentsRaw?.methods?.[0]?.cash?.changeFor,
      pedido?.paymentsRaw?.methods?.[0]?.changeFor,
    ];

    for (const candidate of paidCandidates) {
      const paidAmount = parseAmount(candidate);
      if (Number.isFinite(paidAmount) && paidAmount >= expectedValue) {
        vPag = roundCurrency(paidAmount);
        vTroco = roundCurrency(vPag - expectedValue);
        break;
      }
    }
  }

  const detPag = {
    tPag,
    vPag,
  };

  if (tPag === "99" && xPag) {
    detPag.xPag = xPag;
  }

  const card = resolveCardGroup(tPag, pedido, configFiscal, null);
  if (card) {
    detPag.card = card;
  }

  return {detPag, vTroco};
}

function normalizeSplitPaymentEntries(pedido = {}) {
  if (!Array.isArray(pedido?.pagamentos)) return [];

  return pedido.pagamentos
    .map((entry) => {
      const method = String(entry?.formaPagamento || "").trim();
      const amount = parseAmount(entry?.valor);
      if (!method || !Number.isFinite(amount) || amount <= 0) {
        return null;
      }
      return {
        formaPagamento: method,
        valor: roundCurrency(amount),
        valorPagamento: parseAmount(entry?.valorPagamento ?? entry?.troco?.valorPagamento),
        card: entry?.card || null,
      };
    })
    .filter(Boolean);
}

function resolveDetPagList(pedido = {}, vNF = 0, configFiscal = {}) {
  const splitEntries = normalizeSplitPaymentEntries(pedido);

  if (splitEntries.length === 0) {
    const formaPagamento = String(pedido.formaPagamento || "").trim();
    if (!formaPagamento) {
      throw new HttpsError(
        "failed-precondition",
        "Forma de pagamento é obrigatória para emissão de NFC-e.",
      );
    }

    const {detPag, vTroco} = resolveSingleDetPag({
      formaPagamento,
      valor: vNF,
      pedido,
      configFiscal,
    });

    return {
      detPagList: [detPag],
      vTroco,
    };
  }

  const totalSplit = roundCurrency(
    splitEntries.reduce((sum, entry) => sum + entry.valor, 0),
  );
  const splitDiff = roundCurrency(vNF - totalSplit);
  if (Math.abs(splitDiff) > 0.01) {
    throw new HttpsError(
      "failed-precondition",
      "A soma dos pagamentos divididos deve ser igual ao total da NFC-e.",
    );
  }

  let totalTroco = 0;
  const detPagList = splitEntries.map((entry) => {
    const {tPag, xPag} = resolvePaymentCodeAndDescription(entry.formaPagamento, pedido);
    const detPag = {
      tPag,
      vPag: entry.valor,
    };

    if (tPag === "99" && xPag) {
      detPag.xPag = xPag;
    }

    const card = resolveCardGroup(tPag, pedido, configFiscal, entry);
    if (card) {
      detPag.card = card;
    }

    // Optional: support troco in split mode when a cash entry includes valorPagamento.
    if (tPag === "01") {
      const splitPaidAmount = parseAmount(entry?.valorPagamento ?? entry?.troco?.valorPagamento);
      if (Number.isFinite(splitPaidAmount) && splitPaidAmount >= entry.valor) {
        detPag.vPag = roundCurrency(splitPaidAmount);
        totalTroco += roundCurrency(detPag.vPag - entry.valor);
      }
    }

    return detPag;
  });

  return {
    detPagList,
    vTroco: roundCurrency(totalTroco),
  };
}

function isMonofasicoItem(item = {}) {
  if (!item || typeof item !== "object") return false;

  const explicitFlags = [
    item.monofasico,
    item.isMonofasico,
    item.pisCofinsMonofasico,
    item.tributacaoMonofasica,
  ];
  if (explicitFlags.some((value) => isTruthyTaxFlag(value))) {
    return true;
  }

  const tipoTributacaoCandidates = [
    item.tipoTributacao,
    item.tributacaoTipo,
    item.taxType,
    item.fiscalType,
  ].map((value) => normalizeTaxType(value));

  return tipoTributacaoCandidates.includes("monofasico");
}

function extractPisValue(imposto = {}) {
  return roundCurrency(
    imposto?.PIS?.PISAliq?.vPIS ||
    imposto?.PIS?.PISOutr?.vPIS ||
    0,
  );
}

function extractCofinsValue(imposto = {}) {
  return roundCurrency(
    imposto?.COFINS?.COFINSAliq?.vCOFINS ||
    imposto?.COFINS?.COFINSOutr?.vCOFINS ||
    0,
  );
}

function buildPisCofins(crt, vProd, item = {}, configFiscal = {}) {
  if (isMonofasicoItem(item)) {
    return {
      PIS: {
        PISNT: {
          CST: "04", // Tributacao monofasica (revenda)
        },
      },
      COFINS: {
        COFINSNT: {
          CST: "04", // Tributacao monofasica (revenda)
        },
      },
    };
  }

  if (crt === 1 || crt === 4) {
    return {
      PIS: {
        PISOutr: {
          CST: "49", // Outras operacoes de saida (Simples Nacional)
          vBC: 0,
          pPIS: 0,
          vPIS: 0,
        },
      },
      COFINS: {
        COFINSOutr: {
          CST: "49", // Outras operacoes de saida (Simples Nacional)
          vBC: 0,
          pCOFINS: 0,
          vCOFINS: 0,
        },
      },
    };
  }

  const configuredPis = configFiscal?.nfce?.pisCofinsAliquotas?.pis;
  const configuredCofins = configFiscal?.nfce?.pisCofinsAliquotas?.cofins;
  const pPIS = normalizePercent(configuredPis, PIS_COFINS_ALIQUOTAS_DEFAULT.pis);
  const pCOFINS = normalizePercent(configuredCofins, PIS_COFINS_ALIQUOTAS_DEFAULT.cofins);
  const vPIS = roundCurrency(vProd * (pPIS / 100));
  const vCOFINS = roundCurrency(vProd * (pCOFINS / 100));

  return {
    PIS: {
      PISAliq: {
        CST: "01",
        vBC: vProd,
        pPIS,
        vPIS,
      },
    },
    COFINS: {
      COFINSAliq: {
        CST: "01",
        vBC: vProd,
        pCOFINS,
        vCOFINS,
      },
    },
  };
}

function mapCnpjEmpresaToConfigFiscal(empresa = {}) {
  const endereco = empresa?.endereco || {};
  const municipio = endereco?.municipio || {};
  const telefones = Array.isArray(empresa?.telefones) ? empresa.telefones : [];
  const telefonePrincipal = telefones[0] || {};
  const fone = `${telefonePrincipal?.ddd || ""}${telefonePrincipal?.numero || ""}`;

  return {
    cnpj: empresa?.cnpj || "",
    razaoSocial: empresa?.razao_social || "",
    nomeFantasia: empresa?.nome_fantasia || "",
    email: empresa?.email || "",
    fone,
    endereco: {
      logradouro: `${endereco?.tipo_logradouro || ""} ${endereco?.logradouro || ""}`.trim(),
      numero: endereco?.numero || "",
      complemento: endereco?.complemento || "",
      bairro: endereco?.bairro || "",
      municipio: municipio?.descricao || "",
      codigoMunicipio: municipio?.codigo_ibge || "",
      uf: endereco?.uf || "",
      cep: endereco?.cep || "",
    },
  };
}

function mapCepToConfigAddress(cepData = {}) {
  return {
    logradouro: `${cepData?.tipo_logradouro || ""} ${cepData?.logradouro || ""}`.trim(),
    bairro: cepData?.bairro || "",
    municipio: cepData?.municipio || "",
    codigoMunicipio: cepData?.codigo_ibge || "",
    uf: cepData?.uf || "",
    complemento: cepData?.complemento || "",
    cep: cepData?.cep || "",
  };
}

function resolveIndPresFromPedido(pedido = {}) {
  const origin = String(pedido.orderOrigin || "").toLowerCase();
  const tipoEntrega = String(pedido.tipoEntrega || "").toLowerCase();
  const orderType = String(pedido.orderType || "").toUpperCase();
  const isIfoodDelivery =
    origin === "ifood" &&
    orderType !== "TAKEOUT" &&
    tipoEntrega !== "retirada";

  return isIfoodDelivery ? 4 : 1;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFirestoreFailedPrecondition(error) {
  const code = Number(error?.code);
  const message = String(error?.message || "");
  return code === 9 || /FAILED_PRECONDITION/i.test(message);
}

/**
 * Extract CRT from SEFAZ company data (Nuvem Fiscal /cnpj endpoint response)
 * Based on: simples.optante, simei.optante
 * CRT 1 = Simples Nacional
 * CRT 2 = Simples com excesso de sublimite
 * CRT 3 = Regime Normal
 * CRT 4 = MEI (Microempreendedor Individual)
 * @param {object} empresa - Data from Nuvem Fiscal /cnpj API
 * @returns {number|null}
 */
function extractCrtFromSefaz(empresa = {}) {
  if (!empresa || typeof empresa !== "object") {
    return null;
  }

  // Check MEI first (CRT 4)
  if (empresa?.simei?.optante === true) {
    return 4;
  }

  // Check Simples Nacional (CRT 1)
  if (empresa?.simples?.optante === true) {
    return 1;
  }

  // Default to Regime Normal (CRT 3)
  return 3;
}

/**
 * Validates if local CRT matches SEFAZ registration
 * @param {object} empresa - Data from Nuvem Fiscal CNPJ/SEFAZ API
 * @param {number} localCrt - CRT value from local config
 * @returns {{match: boolean, sefazCrt: number|null, warning: string|null}}
 */
function validateCrtAgainstSefaz(empresa = {}, localCrt) {
  if (!empresa || typeof empresa !== "object") {
    return {
      match: true,
      sefazCrt: null,
      warning: "Não foi possível validar CRT contra SEFAZ",
    };
  }

  // Extract CRT from SEFAZ using simples/simei indicators
  const sefazCrt = extractCrtFromSefaz(empresa);

  if (sefazCrt === null) {
    return {
      match: true,
      sefazCrt: null,
      warning: "SEFAZ não retornou informação de CRT. Configure manualmente.",
    };
  }

  const sefazCrtNum = Number(sefazCrt);
  const localCrtNum = Number(localCrt);

  if (sefazCrtNum !== localCrtNum) {
    const crtNames = {1: "Simples Nacional", 2: "Simples (excesso)", 3: "Regime Normal", 4: "MEI"};
    const sefazCrtName = crtNames[sefazCrtNum] || `CRT ${sefazCrtNum}`;
    const localCrtName = crtNames[localCrtNum] || `CRT ${localCrtNum}`;
    
    return {
      match: false,
      sefazCrt: sefazCrtNum,
      warning: `⚠️ CRT diverge: Sistema tem ${localCrtName} (CRT ${localCrtNum}), SEFAZ registra ${sefazCrtName} (CRT ${sefazCrtNum}). Isso impedirá emissão de NFC-e.`,
    };
  }

  return {
    match: true,
    sefazCrt: sefazCrtNum,
    warning: null,
  };
}

async function findMesaPedidosByNfceWithoutCollectionGroup(idRestaurante, nfceId, maxDocs = 10) {
  const mesasRef = db.collection("restaurantes").doc(idRestaurante).collection("mesas");
  const mesasSnap = await mesasRef.get();
  const foundDocSnaps = [];

  for (const mesaDoc of mesasSnap.docs) {
    if (foundDocSnaps.length >= maxDocs) break;

    const remaining = Math.max(1, maxDocs - foundDocSnaps.length);
    const pedidosSnap = await mesaDoc.ref
      .collection("pedidos")
      .where("nfceId", "==", nfceId)
      .limit(remaining)
      .get();

    pedidosSnap.forEach((docSnap) => {
      foundDocSnaps.push(docSnap);
    });
  }

  return foundDocSnaps;
}

async function updateOrderByNfceId(idRestaurante, nfceId, payload) {
  if (!nfceId) return;

  const restauranteRef = db.collection("restaurantes").doc(idRestaurante);
  const historicoSnap = await restauranteRef.collection("historicoPedidos").where("nfceId", "==", nfceId).limit(10).get();

  const updates = [];
  historicoSnap.forEach((docSnap) => {
    updates.push(docSnap.ref.set(payload, {merge: true}));
  });

  // Most finalized orders live in historicoPedidos.
  // Only hit pedidos/* paths when nothing was found in historico.
  if (updates.length > 0) {
    await Promise.all(updates);
    return;
  }

  let mesaPedidoDocs = [];
  try {
    const mesaPedidosSnap = await db.collectionGroup("pedidos").where("nfceId", "==", nfceId).limit(10).get();
    mesaPedidoDocs = mesaPedidosSnap.docs;
  } catch (error) {
    if (isFirestoreFailedPrecondition(error)) {
      // Keep sync flow working even if collection group query cannot run.
      logger.warn("Skipping collectionGroup('pedidos') due to Firestore FAILED_PRECONDITION", {
        idRestaurante,
        nfceId,
        code: error?.code || null,
        details: error?.details || null,
        error: error?.message || String(error),
      });

      mesaPedidoDocs = await findMesaPedidosByNfceWithoutCollectionGroup(idRestaurante, nfceId, 10);
      logger.info("Fallback pedidos lookup completed", {
        idRestaurante,
        nfceId,
        found: mesaPedidoDocs.length,
      });
    } else {
      throw error;
    }
  }

  if (mesaPedidoDocs.length > 0) {
    mesaPedidoDocs.forEach((docSnap) => {
      const parentRestauranteId = docSnap.ref.parent.parent?.parent?.parent?.id;
      if (parentRestauranteId === idRestaurante) {
        updates.push(docSnap.ref.set(payload, {merge: true}));
      }
    });
  }

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
 * Build payload expected by Nuvem Fiscal empresa endpoints.
 * @param {object} configFiscal
 * @returns {{cnpjDigits: string, empresaPayload: object}}
 */
function buildEmpresaPayload(configFiscal) {
  const {cnpjDigits, endereco} = validateEmpresaConfig(configFiscal);

  return {
    cnpjDigits,
    empresaPayload: {
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
    },
  };
}

/**
 * Validates fields required by PUT /empresas/{cpf_cnpj}/nfce.
 * @param {object} configFiscal
 * @returns {{idCsc: number, csc: string, ambiente: string, crt: number}}
 */
function validateNfceConfig(configFiscal) {
  const idCsc = parseInt(configFiscal?.nfce?.idCsc, 10);
  const cscRaw = String(configFiscal?.nfce?.csc || "");
  const csc = cscRaw.replace(/\s+/g, "").toUpperCase();
  const ambiente = resolveNfceEnvironment(configFiscal);
  const crt = resolveConfiguredCrt(configFiscal);

  const missingFields = [];
  if (!Number.isInteger(idCsc) || idCsc <= 0) missingFields.push("nfce.idCsc");
  if (!csc) missingFields.push("nfce.csc");
  if (!NFCE_ALLOWED_ENVIRONMENTS.includes(ambiente)) missingFields.push("nfce.ambiente");
  if (!Number.isInteger(crt) || crt < 1 || crt > 4) missingFields.push("nfce.crt");

  if (missingFields.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      `Configuração de NFC-e incompleta: ${missingFields.join(", ")}`,
    );
  }

  return {idCsc, csc, ambiente, crt};
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
      const {cnpjDigits, empresaPayload} = buildEmpresaPayload(configFiscal);
      const token = await getAccessToken("empresa");

      await nuvemFiscalRequest("POST", "/empresas", token, empresaPayload);
      logger.info("Empresa created in Nuvem Fiscal", {cnpj: cnpjDigits});

      // Update Firestore
      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          empresaRegistrada: true,
        },
      }, {merge: true});

      // ===== NEW: Validate CRT against SEFAZ =====
      try {
        const tokenCnpj = await getAccessToken("cnpj");
        const sefazEmpresa = await nuvemFiscalRequest(
          "GET",
          `/cnpj/${cnpjDigits}`,
          tokenCnpj,
        );
        const configuredCrt = resolveConfiguredCrt(configFiscal);
        const crtValidation = validateCrtAgainstSefaz(sefazEmpresa, configuredCrt);

        if (!crtValidation.match) {
          logger.warn("CRT mismatch detected", {
            idRestaurante,
            cnpj: cnpjDigits,
            localCrt: configuredCrt,
            sefazCrt: crtValidation.sefazCrt,
          });
        }

        return {
          success: true,
          message: "Empresa registrada com sucesso",
          crtValidation,
        };
      } catch (crtValidationErr) {
        // CRT validation is informational; don't fail the request
        logger.warn("Could not validate CRT", {
          idRestaurante,
          error: crtValidationErr.message,
        });
        return {
          success: true,
          message: "Empresa registrada com sucesso",
          crtValidation: {match: true, warning: null},
        };
      }
    } catch (err) {
      logger.error("Error registering empresa", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao registrar empresa");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultarEmpresa
// Reads company data from Nuvem Fiscal by CPF/CNPJ
// ============================================================================
exports.nfceConsultarEmpresa = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const token = await getAccessToken("empresa");

      const empresa = await nuvemFiscalRequest("GET", `/empresas/${cnpjDigits}`, token);

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          empresaRegistrada: true,
          empresaNuvemFiscalSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      }, {merge: true});

      logger.info("Empresa found in Nuvem Fiscal", {idRestaurante, uid, cnpj: cnpjDigits});

      return {
        success: true,
        exists: true,
        empresa,
      };
    } catch (err) {
      if (/API error 404/i.test(err?.message || "")) {
        await db.collection("restaurantes").doc(idRestaurante).set({
          configFiscal: {
            empresaRegistrada: false,
            empresaNuvemFiscalSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        }, {merge: true});

        return {
          success: true,
          exists: false,
          empresa: null,
        };
      }

      logger.error("Error consulting empresa", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar empresa");
    }
  },
);

// ============================================================================
// FUNCTION: nfceAlterarEmpresa
// Updates company data in Nuvem Fiscal
// ============================================================================
exports.nfceAlterarEmpresa = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const {cnpjDigits, empresaPayload} = buildEmpresaPayload(configFiscal);
      const token = await getAccessToken("empresa");

      await nuvemFiscalRequest("PUT", `/empresas/${cnpjDigits}`, token, empresaPayload);

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          empresaRegistrada: true,
          empresaNuvemFiscalSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      }, {merge: true});

      logger.info("Empresa updated in Nuvem Fiscal", {idRestaurante, uid, cnpj: cnpjDigits});

      // ===== NEW: Validate CRT against SEFAZ after update =====
      try {
        const tokenCnpj = await getAccessToken("cnpj");
        const sefazEmpresa = await nuvemFiscalRequest(
          "GET",
          `/cnpj/${cnpjDigits}`,
          tokenCnpj,
        );
        const configuredCrt = resolveConfiguredCrt(configFiscal);
        const crtValidation = validateCrtAgainstSefaz(sefazEmpresa, configuredCrt);

        if (!crtValidation.match) {
          logger.warn("CRT mismatch detected after update", {
            idRestaurante,
            cnpj: cnpjDigits,
            localCrt: configuredCrt,
            sefazCrt: crtValidation.sefazCrt,
          });
        }

        return {
          success: true,
          message: "Empresa atualizada com sucesso",
          crtValidation,
        };
      } catch (crtValidationErr) {
        logger.warn("Could not validate CRT after update", {
          idRestaurante,
          error: crtValidationErr.message,
        });
        return {
          success: true,
          message: "Empresa atualizada com sucesso",
          crtValidation: {match: true, warning: null},
        };
      }
    } catch (err) {
      logger.error("Error updating empresa", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao atualizar empresa");
    }
  },
);

// ============================================================================
// FUNCTION: nfceDeletarEmpresa
// Deletes company data in Nuvem Fiscal
// ============================================================================
exports.nfceDeletarEmpresa = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const token = await getAccessToken("empresa");

      try {
        await nuvemFiscalRequest("DELETE", `/empresas/${cnpjDigits}`, token);
      } catch (err) {
        if (!/API error 404/i.test(err?.message || "")) {
          throw err;
        }
      }

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          empresaRegistrada: false,
          ativo: false,
          empresaNuvemFiscalSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      }, {merge: true});

      logger.info("Empresa deleted in Nuvem Fiscal", {idRestaurante, uid, cnpj: cnpjDigits});

      return {
        success: true,
        exists: false,
        message: "Empresa removida com sucesso",
      };
    } catch (err) {
      logger.error("Error deleting empresa", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao deletar empresa");
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
      const {idCsc, csc, ambiente, crt} = validateNfceConfig(configFiscal);
      const token = await getAccessToken("empresa nfce");

      const nfceConfig = {
        ambiente,
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
          crt,
          nfce: {
            ...configFiscal.nfce,
            crt,
            ambiente,
            idCsc: String(idCsc),
          },
        },
      }, {merge: true});

      return {success: true, message: "Configuração de NFC-e salva com sucesso"};
    } catch (err) {
      logger.error("Error configuring NFC-e", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao configurar NFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultarConfigNfce
// Reads NFC-e settings from Nuvem Fiscal for an already registered company
// ============================================================================
exports.nfceConsultarConfigNfce = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const token = await getAccessToken("empresa nfce");

      const remoteConfig = await nuvemFiscalRequest("GET", `/empresas/${cnpjDigits}/nfce`, token);

      const mappedConfig = {
        ambiente: remoteConfig?.ambiente || resolveNfceEnvironment(configFiscal),
        idCsc: remoteConfig?.sefaz?.id_csc != null ? String(remoteConfig.sefaz.id_csc) : "",
        csc: remoteConfig?.sefaz?.csc || "",
        crt: Number(remoteConfig?.crt || resolveConfiguredCrt(configFiscal)),
        serie: remoteConfig?.serie != null ? String(remoteConfig.serie) : String(configFiscal?.nfce?.serie || "1"),
      };

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          crt: mappedConfig.crt,
          nfce: {
            ...configFiscal?.nfce,
            ...mappedConfig,
            csc: mappedConfig.csc || configFiscal?.nfce?.csc || "",
          },
        },
      }, {merge: true});

      logger.info("NFC-e config consulted in Nuvem Fiscal", {idRestaurante, uid, cnpj: cnpjDigits});

      return {
        success: true,
        exists: true,
        config: remoteConfig,
        mappedConfig,
      };
    } catch (err) {
      if (/API error 404/i.test(err?.message || "")) {
        return {
          success: true,
          exists: false,
          config: null,
          mappedConfig: null,
        };
      }

      logger.error("Error consulting NFC-e config", {error: err.message, idRestaurante});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar configuração de NFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultarCnpj
// Consults CNPJ data from Nuvem Fiscal and returns mapped fields for ConfigFiscal
// ============================================================================
exports.nfceConsultarCnpj = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, cnpj} = request.data || {};

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const cnpjDigits = String(cnpj || "").replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      throw new HttpsError("invalid-argument", "CNPJ must contain 14 digits");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const token = await getAccessToken("cnpj");
      const empresa = await nuvemFiscalRequest("GET", `/cnpj/${cnpjDigits}`, token);

      logger.info("CNPJ consulted via Nuvem Fiscal", {
        idRestaurante,
        uid,
        cnpj: `${cnpjDigits.slice(0, 4)}***`,
      });

      return {
        success: true,
        empresa,
        mappedConfig: mapCnpjEmpresaToConfigFiscal(empresa),
      };
    } catch (err) {
      logger.error("Error consulting CNPJ", {
        idRestaurante,
        uid,
        cnpj: `${cnpjDigits.slice(0, 4)}***`,
        error: err.message,
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar CNPJ");
    }
  },
);

// ============================================================================
// FUNCTION: nfceSincronizarCrt
// Syncs CRT from SEFAZ to local config and validates consistency
// ============================================================================
exports.nfceSincronizarCrt = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data || {};

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      if (!configFiscal) {
        throw new HttpsError("failed-precondition", "Configuração fiscal não encontrada");
      }

      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const tokenCnpj = await getAccessToken("cnpj");
      const sefazEmpresa = await nuvemFiscalRequest(
        "GET",
        `/cnpj/${cnpjDigits}`,
        tokenCnpj,
      );

      // Extract CRT from SEFAZ response using simples/simei indicators
      const sefazCrt = extractCrtFromSefaz(sefazEmpresa);

      if (sefazCrt === null) {
        throw new HttpsError(
          "unavailable",
          "SEFAZ não retornou informação de CRT. Tente novamente ou configure manualmente.",
        );
      }

      const sefazCrtNum = Number(sefazCrt);

      // Validate consistency before updating
      const configuredCrt = resolveConfiguredCrt(configFiscal);
      const crtValidation = validateCrtAgainstSefaz(sefazEmpresa, configuredCrt);

      if (!crtValidation.match) {
        // Update to match SEFAZ
        await db.collection("restaurantes").doc(idRestaurante).set({
          configFiscal: {
            crt: sefazCrtNum,
            nfce: {
              ...configFiscal.nfce,
              crt: sefazCrtNum,
            },
            crtSyncedFromSefazAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        }, {merge: true});

        logger.info("CRT synchronized from SEFAZ", {
          idRestaurante,
          cnpj: cnpjDigits,
          oldCrt: configuredCrt,
          newCrt: sefazCrtNum,
          uid,
        });

        return {
          success: true,
          message: `CRT sincronizado com sucesso. Atualizado de ${configuredCrt} para ${sefazCrtNum}.`,
          synchronized: true,
          previousCrt: configuredCrt,
          newCrt: sefazCrtNum,
        };
      }

      return {
        success: true,
        message: "CRT já está sincronizado com SEFAZ.",
        synchronized: false,
        crt: configuredCrt,
      };
    } catch (err) {
      logger.error("Error syncing CRT", {idRestaurante, error: err.message});
      if (err instanceof HttpsError) throw err;
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao sincronizar CRT com SEFAZ");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultarCep
// Consults CEP data from Nuvem Fiscal and returns mapped address fields
// ============================================================================
exports.nfceConsultarCep = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, cep} = request.data || {};

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const cepDigits = String(cep || "").replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      throw new HttpsError("invalid-argument", "CEP must contain 8 digits");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const token = await getAccessToken("cep");
      const endereco = await nuvemFiscalRequest("GET", `/cep/${cepDigits}`, token);

      logger.info("CEP consulted via Nuvem Fiscal", {
        idRestaurante,
        uid,
        cep: `${cepDigits.slice(0, 5)}***`,
      });

      return {
        success: true,
        endereco,
        mappedAddress: mapCepToConfigAddress(endereco),
      };
    } catch (err) {
      logger.error("Error consulting CEP", {
        idRestaurante,
        uid,
        cep: `${cepDigits.slice(0, 5)}***`,
        error: err.message,
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar CEP");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultarCertificado
// Checks if there is a digital certificate for the company on Nuvem Fiscal
// ============================================================================
exports.nfceConsultarCertificado = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const token = await getAccessToken("empresa");
      const certificado = await nuvemFiscalRequest(
        "GET",
        `/empresas/${cnpjDigits}/certificado`,
        token,
      );

      const certificadoInfo = normalizeCertificateInfo(certificado);

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          certificadoDigital: {
            existe: true,
            id: certificadoInfo?.id || null,
            serialNumber: certificadoInfo?.serialNumber || null,
            thumbprint: certificadoInfo?.thumbprint || null,
            notValidAfter: certificadoInfo?.notValidAfter || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      }, {merge: true});

      logger.info("Digital certificate consulted", {
        idRestaurante,
        uid,
        cnpj: `${cnpjDigits.slice(0, 4)}***`,
      });

      return {
        success: true,
        exists: true,
        certificate: certificadoInfo,
      };
    } catch (err) {
      if (/API error 404/i.test(err?.message || "")) {
        await db.collection("restaurantes").doc(idRestaurante).set({
          configFiscal: {
            certificadoDigital: {
              existe: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
        }, {merge: true});

        return {
          success: true,
          exists: false,
          certificate: null,
        };
      }

      logger.error("Error consulting digital certificate", {
        idRestaurante,
        uid,
        error: err.message,
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar certificado digital");
    }
  },
);

// ============================================================================
// FUNCTION: nfceUploadCertificado
// Uploads digital certificate file (.pfx/.p12) using multipart/form-data
// ============================================================================
exports.nfceUploadCertificado = onCall(
  {
    secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment],
    maxInstances: 5,
    timeoutSeconds: 120,
  },
  async (request) => {
    const {idRestaurante, fileName, fileBase64, password} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }
    if (!fileName || !fileBase64 || !password) {
      throw new HttpsError("invalid-argument", "fileName, fileBase64 and password are required");
    }
    if (!hasAllowedCertificateExtension(fileName)) {
      throw new HttpsError("invalid-argument", "O arquivo do certificado deve ser .pfx ou .p12");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    const normalizedBase64 = normalizeBase64Payload(fileBase64);
    if (!normalizedBase64) {
      throw new HttpsError("invalid-argument", "Arquivo de certificado vazio");
    }

    const approxBytes = estimateBytesFromBase64(normalizedBase64);
    if (approxBytes <= 0) {
      throw new HttpsError("invalid-argument", "Conteudo do certificado em Base64 invalido");
    }
    if (approxBytes > CERTIFICATE_MAX_SIZE_BYTES) {
      throw new HttpsError("invalid-argument", "Arquivo de certificado maior que 2MB");
    }

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const token = await getAccessToken("empresa");

      const certificado = await nuvemFiscalRequest(
        "PUT",
        `/empresas/${cnpjDigits}/certificado`,
        token,
        {
          certificado: normalizedBase64,
          password: String(password),
        },
      );

      const certificadoInfo = normalizeCertificateInfo(certificado);

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          certificadoDigital: {
            existe: true,
            id: certificadoInfo?.id || null,
            serialNumber: certificadoInfo?.serialNumber || null,
            thumbprint: certificadoInfo?.thumbprint || null,
            notValidAfter: certificadoInfo?.notValidAfter || null,
            fileName,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      }, {merge: true});

      logger.info("Digital certificate uploaded", {
        idRestaurante,
        uid,
        cnpj: `${cnpjDigits.slice(0, 4)}***`,
      });

      return {
        success: true,
        message: "Certificado digital enviado com sucesso",
        exists: true,
        certificate: certificadoInfo,
      };
    } catch (err) {
      logger.error("Error uploading digital certificate", {
        idRestaurante,
        uid,
        error: err.message,
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao enviar certificado digital");
    }
  },
);

// ============================================================================
// FUNCTION: nfceDeletarCertificado
// Deletes digital certificate configured on Nuvem Fiscal
// ============================================================================
exports.nfceDeletarCertificado = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante} = request.data;

    if (!idRestaurante) {
      throw new HttpsError("invalid-argument", "idRestaurante is required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["edit_config", "view_fiscal"]);

    try {
      const restDoc = await db.collection("restaurantes").doc(idRestaurante).get();
      if (!restDoc.exists) {
        throw new HttpsError("not-found", "Restaurant not found");
      }

      const configFiscal = restDoc.data()?.configFiscal;
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const token = await getAccessToken("empresa");

      try {
        await nuvemFiscalRequest(
          "DELETE",
          `/empresas/${cnpjDigits}/certificado`,
          token,
        );
      } catch (err) {
        if (!/API error 404/i.test(err?.message || "")) {
          throw err;
        }
      }

      await db.collection("restaurantes").doc(idRestaurante).set({
        configFiscal: {
          certificadoDigital: {
            existe: false,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      }, {merge: true});

      logger.info("Digital certificate deleted", {
        idRestaurante,
        uid,
        cnpj: `${cnpjDigits.slice(0, 4)}***`,
      });

      return {
        success: true,
        exists: false,
        message: "Certificado digital removido com sucesso",
      };
    } catch (err) {
      logger.error("Error deleting digital certificate", {
        idRestaurante,
        uid,
        error: err.message,
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao deletar certificado digital");
    }
  },
);

// ============================================================================
// FUNCTION: nfceEmitir
// Emits an NFC-e for a specific order
// ============================================================================
exports.nfceEmitir = onCall(
  {
    secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment, nfceEmitDisabled],
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

    // ===== NEW: Validate CRT before emission =====
    try {
      const cnpjDigits = getCnpjDigitsFromConfig(configFiscal);
      const tokenCnpj = await getAccessToken("cnpj");
      const sefazEmpresa = await nuvemFiscalRequest(
        "GET",
        `/cnpj/${cnpjDigits}`,
        tokenCnpj,
      );
      const configuredCrt = resolveConfiguredCrt(configFiscal);
      const crtValidation = validateCrtAgainstSefaz(sefazEmpresa, configuredCrt);

      if (!crtValidation.match) {
        logger.error("CRT mismatch blocking NFC-e emission", {
          idRestaurante,
          cnpj: cnpjDigits,
          localCrt: configuredCrt,
          sefazCrt: crtValidation.sefazCrt,
        });
        throw new HttpsError(
          "failed-precondition",
          `CRT diverge da SEFAZ. Sistema tem CRT ${configuredCrt}, SEFAZ registra CRT ${crtValidation.sefazCrt}. Sincronize em Configuração Fiscal > Sincronizar CRT.`,
        );
      }
    } catch (crtErr) {
      if (crtErr instanceof HttpsError) throw crtErr;
      logger.warn("Could not validate CRT before NFC-e emission, allowing to proceed", {
        idRestaurante,
        error: crtErr.message,
      });
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
    const approxTaxRates = resolveApproxTaxRates(configFiscal, endereco);

    // 4. Build det (items array)
    const configuredCrt = resolveConfiguredCrt(configFiscal);

    const det = pedido.items.map((item, index) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price) * fatorTaxa;
      const vUnCom = Math.round(unitPrice * 100) / 100;
      const vProd = Math.round(vUnCom * quantity * 100) / 100;
      const itemApproxTrib = roundCurrency(vProd * approxTaxRates.total);
      const imposto = buildImposto(configuredCrt, vProd, item, configFiscal, itemApproxTrib);

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
        imposto,
      };
    });

    // 5. Calculate totals
    const vProdTotal = det.reduce((sum, d) => sum + d.prod.vProd, 0);
    const vNF = Math.round(vProdTotal * 100) / 100;
    const vPISTotal = roundCurrency(det.reduce((sum, d) => sum + extractPisValue(d.imposto), 0));
    const vCOFINSTotal = roundCurrency(det.reduce((sum, d) => sum + extractCofinsValue(d.imposto), 0));

    // 6. Payment mapping
    const {detPagList, vTroco} = resolveDetPagList(pedido, vNF, configFiscal);

    const indPres = resolveIndPresFromPedido(pedido);
    const vTotTribTotal = roundCurrency(det.reduce((sum, d) => sum + Number(d.imposto?.vTotTrib || 0), 0));

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
          dhEmi: formatDhEmiSefaz(),
          tpNF: 1, // 1 = saída
          idDest: 1, // 1 = operação interna
          cMunFG: endereco.codigoMunicipio,
          tpImp: 4, // 4 = DANFE NFC-e
          tpEmis: 1, // 1 = normal
          finNFe: 1, // 1 = normal
          indFinal: 1, // 1 = consumidor final
          indPres, // 1 = presencial, 4 = entrega a domicílio
          procEmi: 0, // 0 = emissão com aplicativo do contribuinte
          verProc: "MesaFacil1.0",
        },
        emit: {
          CNPJ: cnpj,
          CRT: configuredCrt,
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
            vPIS: vPISTotal,
            vCOFINS: vCOFINSTotal,
            vOutro: 0,
            vTotTrib: vTotTribTotal,
            vNF,
          },
        },
        transp: {
          modFrete: 9, // 9 = sem frete
        },
        pag: {
          ...(vTroco > 0 ? {vTroco} : {}),
          detPag: detPagList,
        },
      },
      ambiente: resolveNfceEnvironment(configFiscal),
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

      // INTERCEPTAÇÃO TEMPORÁRIA: Log completo do payload e desabilitação do envio
      const nfceDisabled = process.env.NFCE_EMIT_DISABLED === "true" || nfceEmitDisabled.value() === "true";
      logger.info("=== NFCE PAYLOAD INTERCEPTADO ===", {
        disabled: nfceDisabled,
        payload: JSON.stringify(nfcePayload, null, 2),
      });

      // Mark order as processing to prevent duplicate emission requests.
      const processingUpdate = {
        nfceStatus: "processando",
        nfceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const processingUpdatePromises = [];
      if (pedidoMesaSnap.exists) processingUpdatePromises.push(pedidoMesaRef.set(processingUpdate, {merge: true}));
      if (pedidoHistoricoSnap.exists) processingUpdatePromises.push(pedidoHistoricoRef.set(processingUpdate, {merge: true}));
      await Promise.all(processingUpdatePromises);

      let nfce;
      if (nfceDisabled) {
        // MOCK RESPONSE: Retorna sucesso fictício para análise
        logger.warn("=== ENVIO PARA NUVEM FISCAL DESABILITADO (MOCK) ===", {
          pedidoId,
          nNF,
        });
        nfce = {
          id: `MOCK_${Date.now()}`,
          status: "autorizado",
          chave: "35240101000000000000650010000000011234567891",
          url_danfce: "https://mock.nuvemfiscal.com.br/danfce",
          url: "https://mock.nuvemfiscal.com.br/nfce",
        };
      } else {
        nfce = await nuvemFiscalRequest("POST", "/nfce", token, nfcePayload);
        logger.info("NFC-e submission response", {id: nfce.id, status: nfce.status});
      }

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
        const mensagens = Array.isArray(nfce.mensagens) ? nfce.mensagens : [];
        const mensagemTexto = mensagens.length > 0
          ? mensagens.map((m) => m.descricao || m.mensagem || JSON.stringify(m)).join("; ")
          : "";
        const motivoAutorizacao = nfce?.autorizacao?.motivo_status || "";
        const motivoStatus = nfce?.motivo_status || "";
        const erroTexto = nfce?.erro?.mensagem || nfce?.erro?.message || "";
        const descricao = mensagemTexto || motivoAutorizacao || motivoStatus || erroTexto || "Nota rejeitada pela SEFAZ";

        logger.error("NFC-e rejected", {
          nfceId: nfce.id,
          descricao,
          mensagens,
          motivoStatus,
          motivoAutorizacao,
          codigoStatus: nfce?.codigo_status || null,
          codigoStatusAutorizacao: nfce?.autorizacao?.codigo_status || null,
          nfce,
        });

        // Persist rejection status in whichever order document still exists.
        const updatePayload = {
          nfceId: nfceResult.nfceId,
          nfceStatus: "rejeitado",
          nfceErro: descricao,
          nfceRejeicao: nfce,
          nfceRejeicaoCodigo: nfce?.codigo_status || nfce?.autorizacao?.codigo_status || null,
          nfceRejeicaoMotivo: motivoStatus || motivoAutorizacao || null,
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
      const mensagens = Array.isArray(nfce.mensagens) ? nfce.mensagens : [];
      const codigoStatus = nfce.codigo_status || nfce?.autorizacao?.codigo_status || null;
      const motivoStatus =
        nfce.motivo_status ||
        nfce?.autorizacao?.motivo_status ||
        nfce?.erro?.mensagem ||
        nfce?.erro?.message ||
        null;

      return {
        id: nfce.id,
        status: nfce.status,
        referencia: nfce.referencia || null,
        numero: nfce.numero || null,
        serie: nfce.serie || null,
        codigoStatus,
        motivoStatus,
        chaveAcesso: nfce.chave || null,
        linkDanfce: nfce.url_danfce || nfce.url || null,
        mensagens,
        data: nfce,
      };
    } catch (err) {
      logger.error("Error consulting NFC-e", {error: err.message, nfceId});
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar NFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfcePreviaPdfDanfce
// Generates a preview PDF for the DANFC-e without fiscal value
// ============================================================================
exports.nfcePreviaPdfDanfce = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, mesaId, pedidoId, cpfConsumidor, options} = request.data || {};

    if (!idRestaurante || !mesaId || !pedidoId) {
      throw new HttpsError("invalid-argument", "idRestaurante, mesaId, and pedidoId are required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal", "edit_orders"]);

    try {
      const previewContext = await loadNfcePreviewContext(idRestaurante, mesaId, pedidoId);
      const nfcePayload = buildNfcePayloadFromContext(previewContext, cpfConsumidor || null);
      const token = await getAccessToken("nfce");
      const parsedOptions = parseDanfceOptions(options);
      const queryString = buildDanfcePdfQueryString(parsedOptions);
      const suffix = queryString ? `?${queryString}` : "";

      const pdfResponse = await nuvemFiscalRequestBinary(
        "POST",
        `/nfce/previa/pdf${suffix}`,
        token,
        nfcePayload,
      );

      const resolvedFileName =
        extractFilenameFromContentDisposition(pdfResponse.contentDisposition) ||
        `danfce-previa-${pedidoId}.pdf`;

      logger.info("DANFC-e preview PDF generated", {
        idRestaurante,
        uid,
        pedidoId,
        bytes: pdfResponse.buffer.length,
      });

      return {
        success: true,
        pedidoId,
        fileName: resolvedFileName,
        contentType: pdfResponse.contentType || "application/pdf",
        pdfBase64: pdfResponse.buffer.toString("base64"),
        bytes: pdfResponse.buffer.length,
        previewPayload: nfcePayload,
      };
    } catch (err) {
      logger.error("Error generating DANFC-e preview PDF", {
        idRestaurante,
        uid,
        pedidoId,
        error: err?.message || String(err),
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao gerar prévia do DANFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceBaixarPdfDanfce
// Downloads DANFC-e PDF by NFC-e id
// ============================================================================
exports.nfceBaixarPdfDanfce = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, nfceId, options} = request.data || {};

    if (!idRestaurante || !nfceId) {
      throw new HttpsError("invalid-argument", "idRestaurante and nfceId are required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal", "edit_orders"]);

    try {
      const token = await getAccessToken("nfce");
      const parsedOptions = parseDanfceOptions(options);
      const queryString = buildDanfcePdfQueryString(parsedOptions);
      const suffix = queryString ? `?${queryString}` : "";

      const pdfResponse = await nuvemFiscalRequestBinary(
        "GET",
        `/nfce/${nfceId}/pdf${suffix}`,
        token,
      );

      const resolvedFileName =
        extractFilenameFromContentDisposition(pdfResponse.contentDisposition) ||
        `danfce-${nfceId}.pdf`;

      logger.info("NFC-e DANFC-e PDF downloaded", {
        idRestaurante,
        uid,
        nfceId,
        bytes: pdfResponse.buffer.length,
      });

      return {
        success: true,
        nfceId,
        fileName: resolvedFileName,
        contentType: pdfResponse.contentType || "application/pdf",
        pdfBase64: pdfResponse.buffer.toString("base64"),
        bytes: pdfResponse.buffer.length,
      };
    } catch (err) {
      logger.error("Error downloading DANFC-e PDF", {
        idRestaurante,
        uid,
        nfceId,
        error: err?.message || String(err),
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao baixar PDF do DANFC-e");
    }
  },
);

// ============================================================================
// FUNCTION: nfceConsultarDebugHttpResponse
// Retrieves raw HTTP response body captured by Nuvem Fiscal debug tools
// Endpoint: GET /debug/http-requests/{id}/response-content
// ============================================================================
exports.nfceConsultarDebugHttpResponse = onCall(
  {secrets: [nuvemFiscalClientId, nuvemFiscalClientSecret, nuvemFiscalEnvironment], maxInstances: 5},
  async (request) => {
    const {idRestaurante, httpRequestId} = request.data || {};

    if (!idRestaurante || !httpRequestId) {
      throw new HttpsError("invalid-argument", "idRestaurante and httpRequestId are required");
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal", "edit_orders"]);

    try {
      const token = await getAccessToken("conta empresa nfe debug");
      const responseContent = await nuvemFiscalRequest(
        "GET",
        `/debug/http-requests/${httpRequestId}/response-content`,
        token,
      );

      logger.info("NFC-e debug HTTP response content consulted", {
        idRestaurante,
        uid,
        httpRequestId,
      });

      return {
        success: true,
        httpRequestId,
        responseContent,
      };
    } catch (err) {
      logger.error("Error consulting debug HTTP response content", {
        idRestaurante,
        uid,
        httpRequestId,
        error: err?.message || String(err),
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao consultar corpo da resposta HTTP do debug");
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
      params.append("ambiente", resolveNfceEnvironment(configFiscal));
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

    if (!idRestaurante || !nfceId) {
      throw new HttpsError(
        "invalid-argument",
        "idRestaurante and nfceId are required",
      );
    }

    const {uid} = await validateRestaurantAccess(request, idRestaurante, ["view_fiscal", "edit_orders"]);

    try {
      const token = await getAccessToken("nfce");
      const justificativaNormalizada = String(justificativa || "").trim();
      const payload = {
        justificativa: justificativaNormalizada,
      };

      const nfce = await nuvemFiscalRequestWithFallback(
        "POST",
        [`/nfce/${nfceId}/cancelamento`],
        token,
        payload,
      );

      const cancelStatus = nfce.status || "cancelado";
      const updatePayload = {
        nfceStatus: cancelStatus,
        nfceCancelada: true,
        nfceCanceladaEm: admin.firestore.FieldValue.serverTimestamp(),
        nfceCancelamentoJustificativa: justificativaNormalizada || null,
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
      logger.error("Error syncing NFC-e documents", {
        idRestaurante,
        nfceId,
        uid,
        error: err?.message || String(err),
        code: err?.code || null,
        details: err?.details || null,
      });
      throw mapNuvemFiscalErrorToHttps(err, "Erro ao sincronizar documentos da NFC-e");
    }
  },
);

// ============================================================================
// HELPER: Build imposto object based on CRT
// ============================================================================
function buildImposto(crt, vProd, item = {}, configFiscal = {}, vTotTrib = 0) {
  // For Simples Nacional (CRT 1 or 4), use ICMSSN102
  const pisCofins = buildPisCofins(crt, vProd, item, configFiscal);

  if (crt === 1 || crt === 4) {
    return {
      vTotTrib,
      ICMS: {
        ICMSSN102: {
          orig: 0, // 0 = Nacional
          CSOSN: "102", // 102 = Tributada sem permissão de crédito
        },
      },
      ...pisCofins,
    };
  }

  // For Regime Normal (CRT 3), use ICMS00 (simplified - 0% for food in many states)
  return {
    vTotTrib,
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
    ...pisCofins,
  };
}
