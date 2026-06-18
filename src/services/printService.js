const normalizeBaseUrl = (value) => {
  const text = String(value || '').trim();
  return text.endsWith('/') ? text.slice(0, -1) : text;
};

const resolveCandidateBaseUrls = () => {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_PRINT_SERVICE_URL || '/print-service');
  const candidates = [];

  // Sempre tentar o agente local da máquina primeiro.
  // Isso é essencial quando o app está em produção (HTTPS), pois o operador
  // ainda precisa acessar as impressoras instaladas no próprio computador.
  if (typeof window !== 'undefined') {
    candidates.push('http://127.0.0.1:4891');
    candidates.push('http://localhost:4891');
  }

  candidates.push(configuredUrl);

  return Array.from(new Set(candidates.filter(Boolean)));
};

const buildUrl = (baseUrl, path) => `${baseUrl}${path}`;

const requestJson = async (path, options = {}) => {
  const candidates = resolveCandidateBaseUrls();
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetchWithTimeout(buildUrl(baseUrl, path), {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      }, 10000);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `Erro HTTP ${response.status}`);
      }

      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Falha ao conectar impressora');
};

export const getPrintServiceBaseUrl = () => resolveCandidateBaseUrls()[0] || '/print-service';

import fetchWithTimeout from '@/utils/fetchWithTimeout';

export const isPrintServiceReachable = async (timeoutMs = 1200) => {
  if (typeof window === 'undefined' || !window.fetch) return false;

  const candidates = resolveCandidateBaseUrls();

  for (const base of candidates) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchWithTimeout(buildUrl(base, '/health'), {
        cache: 'no-store',
      }, timeoutMs);
      clearTimeout(id);

      if (response.ok) {
        return true;
      }
    } catch {
      // Try the next candidate URL.
    } finally {
      clearTimeout(id);
    }
  }

  return false;
};

export const fetchAvailablePrinters = async () => {
  const printers = await requestJson('/printers');
  return Array.isArray(printers) ? printers : [];
};

export const fetchPrintServiceConfigStatus = async () => {
  return await requestJson('/config-status');
};

export const testSystemPrinter = async (printerName) => {
  return await requestJson('/test-print', {
    method: 'POST',
    body: JSON.stringify({ printerName }),
  });
};

export const printToSystemPrinter = async ({ printerName, content, jobId }) => {
  return await requestJson('/print', {
    method: 'POST',
    body: JSON.stringify({ printerName, content, jobId }),
  });
};
