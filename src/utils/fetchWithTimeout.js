// Lightweight fetch wrapper with timeout
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      const e = new Error('Request timed out');
      e.name = 'TimeoutError';
      throw e;
    }
    throw err;
  }
}

export default fetchWithTimeout;
