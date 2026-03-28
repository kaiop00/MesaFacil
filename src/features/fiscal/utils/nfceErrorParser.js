const KNOWN_ERROR_CODE_MESSAGES = {
  EmpresaAlreadyExists: "Já existe uma empresa cadastrada para este CPF/CNPJ na Nuvem Fiscal.",
  EmpresaNotFound: "Empresa não encontrada na Nuvem Fiscal. Faça o cadastro da empresa antes de continuar.",
  CertificadoNaoEncontrado: "Nenhum certificado digital foi encontrado para esta empresa.",
};

const KNOWN_MESSAGE_PATTERNS = [
  {
    test: (message) => /EmpresaAlreadyExists/i.test(message) || /Ja existe uma empresa com o CPF\/CNPJ informado/i.test(message) || /Já existe uma empresa com o CPF\/CNPJ informado/i.test(message),
    message: KNOWN_ERROR_CODE_MESSAGES.EmpresaAlreadyExists,
  },
  {
    test: (message) => /Configuracao de NFC-e incompleta/i.test(message) || /Configuração de NFC-e incompleta/i.test(message),
    message: "A configuração de NFC-e está incompleta. Revise CSC e ID CSC antes de continuar.",
  },
  {
    test: (message) => /Dados da empresa incompletos/i.test(message),
    message: "Os dados da empresa estão incompletos. Revise os campos obrigatórios e tente novamente.",
  },
  {
    test: (message) => /permission-denied|Insufficient permissions/i.test(message),
    message: "Você não possui permissão para executar esta operação fiscal.",
  },
  {
    test: (message) => /Nuvem Fiscal authentication failed|Credenciais da Nuvem Fiscal invalidas|Credenciais da Nuvem Fiscal inválidas/i.test(message),
    message: "Não foi possível autenticar na Nuvem Fiscal. Verifique as credenciais e tente novamente.",
  },
  {
    test: (message) => /Nuvem Fiscal esta limitando requisicoes|Nuvem Fiscal está limitando requisições|rate limit|429/i.test(message),
    message: "A Nuvem Fiscal está temporariamente indisponível por limite de requisições. Tente novamente em alguns instantes.",
  },
];

function tryParseJson(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with best-effort parsing below.
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonSlice);
  } catch {
    // Handles escaped payloads like {\"error\":{...}}
  }

  try {
    return JSON.parse(jsonSlice.replace(/\\"/g, '"'));
  } catch {
    return null;
  }
}

function extractMessageFromObject(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;

  const directFields = [
    payload.message,
    payload.error_description,
    payload.description,
    payload.details,
    payload.error?.message,
    payload.error?.details,
    payload.error?.description,
  ];

  for (const value of directFields) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "string") return "";

  let message = rawMessage.trim();
  message = message
    .replace(/^FirebaseError:\s*/i, "")
    .replace(/^INTERNAL:\s*/i, "")
    .replace(/^Erro ao [^:]+:\s*/i, "")
    .replace(/^Nuvem Fiscal API error \d+:\s*/i, "")
    .trim();

  return message;
}

function mapKnownMessage(rawMessage) {
  if (!rawMessage) return null;

  const parsed = tryParseJson(rawMessage);
  if (parsed) {
    const code = parsed?.error?.code || parsed?.code;
    if (code && KNOWN_ERROR_CODE_MESSAGES[code]) {
      return KNOWN_ERROR_CODE_MESSAGES[code];
    }

    const nested = extractMessageFromObject(parsed);
    if (nested && nested !== rawMessage) {
      return mapKnownMessage(nested) || normalizeMessage(nested);
    }
  }

  for (const pattern of KNOWN_MESSAGE_PATTERNS) {
    if (pattern.test(rawMessage)) {
      return pattern.message;
    }
  }

  return null;
}

export function getFriendlyNfceError(error, fallbackMessage) {
  const fallback = fallbackMessage || "Ocorreu um erro ao processar a operação fiscal. Tente novamente.";

  const candidates = [
    error?.message,
    error?.details?.message,
    error?.details,
    error?.error?.message,
    error?.error,
    typeof error === "string" ? error : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const message = typeof candidate === "string" ? candidate : extractMessageFromObject(candidate);
    if (!message) continue;

    const known = mapKnownMessage(message);
    if (known) return known;

    const normalized = normalizeMessage(message);

    if (!normalized) continue;
    if (normalized.startsWith("{") || normalized.startsWith("[")) continue;
    if (/^\{.*\}$/.test(normalized)) continue;
    if (normalized.length > 260) continue;

    return normalized;
  }

  return fallback;
}