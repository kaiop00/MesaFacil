/* eslint-env node */
/* global require, process, Buffer */

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

let printerLib = null;
try {
  printerLib = require('printer');
} catch (error) {
  console.warn('[print-service] Biblioteca printer indisponível:', error.message || error);
}

let pdfToPrinter = null;
try {
  pdfToPrinter = require('pdf-to-printer');
} catch (error) {
  console.warn('[print-service] Biblioteca pdf-to-printer indisponível:', error.message || error);
}

const express = require('express');
const cors = require('cors');

const PORT = Number(process.env.PORT || 4891);
const HOST = process.env.HOST || '127.0.0.1';
const TEMP_DIR = path.join(os.tmpdir(), 'mesafacil-print-service');

const app = express();
app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'MesaFacil Print Service', status: 'running', port: PORT });
});

app.get('/printers', async (_req, res) => {
  try {
    const printers = await listPrinters();
    res.json(printers);
  } catch (error) {
    console.error('[print-service] Falha ao listar impressoras:', error);
    res.status(500).json({ error: 'Falha ao listar impressoras', details: String(error.message || error) });
  }
});

app.post('/test-print', async (req, res) => {
  const printerName = normalizeText(req.body?.printerName);

  if (!printerName) {
    return res.status(400).json({ error: 'printerName é obrigatório' });
  }

  const content = [
    '====================',
    ' MESA FACIL',
    ' TESTE IMPRESSORA',
    '====================',
    '',
    'Conexão OK',
    ''
  ].join('\n');

  try {
    const result = await printRaw({ printerName, content });
    res.json({ ok: true, printerName, ...result });
  } catch (error) {
    console.error('[print-service] Falha no teste de impressão:', error);
    res.status(500).json({ ok: false, error: 'Falha ao conectar impressora', details: String(error.message || error) });
  }
});

app.post('/print', async (req, res) => {
  const printerName = normalizeText(req.body?.printerName);
  const content = String(req.body?.content || '').trim();
  const jobId = normalizeText(req.body?.jobId) || `job-${Date.now()}`;

  if (!printerName) {
    return res.status(400).json({ error: 'printerName é obrigatório' });
  }

  if (!content) {
    return res.status(400).json({ error: 'content é obrigatório' });
  }

  try {
    const result = await printRaw({ printerName, content, jobId });
    res.json({ ok: true, printerName, jobId, ...result });
  } catch (error) {
    console.error('[print-service] Falha na impressão:', error);
    res.status(500).json({ ok: false, error: 'Falha ao conectar impressora', details: String(error.message || error) });
  }
});

async function listPrinters() {
  const defaultPrinter = await getDefaultPrinterName();

  if (printerLib && typeof printerLib.getPrinters === 'function') {
    const rawPrinters = await Promise.resolve(printerLib.getPrinters());
    const printers = normalizePrinters(rawPrinters, defaultPrinter, 'printer-lib');
    if (printers.length > 0) {
      return printers;
    }
  }

  const fallbackPrinters = await listPrintersFromOS(defaultPrinter);
  if (fallbackPrinters.length > 0) {
    return fallbackPrinters;
  }

  return [];
}

function normalizePrinters(rawPrinters, defaultPrinter, source) {
  if (!Array.isArray(rawPrinters)) return [];

  return rawPrinters
    .map((printer) => {
      if (typeof printer === 'string') {
        const name = normalizeText(printer);
        return name ? { name, default: name === defaultPrinter, connected: true, source } : null;
      }

      const name = normalizeText(printer?.name || printer?.printerName || printer?.printer || printer?.displayName || '');
      if (!name) return null;

      const isDefault = Boolean(
        printer?.default ||
          printer?.isDefault ||
          name === defaultPrinter ||
          printer?.printerName === defaultPrinter
      );

      const connected = printer?.connected !== false && printer?.online !== false && printer?.status !== 'offline';

      return {
        name,
        default: isDefault,
        connected,
        status: printer?.status || null,
        source,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.default && !b.default) return -1;
      if (!a.default && b.default) return 1;
      return a.name.localeCompare(b.name);
    });
}

async function getDefaultPrinterName() {
  if (printerLib && typeof printerLib.getDefaultPrinterName === 'function') {
    try {
      return normalizeText(await Promise.resolve(printerLib.getDefaultPrinterName()));
    } catch (error) {
      console.warn('[print-service] Não foi possível ler impressora padrão:', error.message || error);
    }
  }

  if (process.platform === 'darwin' || process.platform === 'linux') {
    try {
      const { stdout } = await execFileAsync('lpstat', ['-d'], {
        env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
      });
      const match = stdout.match(/system default destination:\s*(.+)/i);
      return normalizeText(match?.[1] || '');
    } catch {
      return '';
    }
  }

  return '';
}

async function listPrintersFromOS(defaultPrinter) {
  if (process.platform === 'win32') {
    return await listWindowsPrinters(defaultPrinter);
  }

  if (process.platform === 'darwin' || process.platform === 'linux') {
    return await listUnixPrinters(defaultPrinter);
  }

  return [];
}

async function listUnixPrinters(defaultPrinter) {
  const printers = [];

  try {
    const { stdout } = await execFileAsync('lpstat', ['-p'], {
      env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    });

    for (const rawLine of stdout.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const match = line.match(/^(printer|impressora)\s+(.+?)\s+(is|está)\s+/i);
      if (!match) continue;
      const name = normalizeText(match[2]);
      if (!name) continue;
      printers.push({ name, default: name === defaultPrinter, connected: true, source: 'lpstat' });
    }
  } catch (error) {
    console.warn('[print-service] lpstat -p indisponível:', error.message || error);
  }

  if (printers.length > 0) {
    return printers;
  }

  try {
    const { stdout } = await execFileAsync('system_profiler', ['SPPrintersDataType']);
    const detected = [];
    let currentName = '';

    for (const rawLine of stdout.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const nameMatch = line.match(/^Name:\s*(.+)$/i);
      if (nameMatch) {
        currentName = normalizeText(nameMatch[1]);
        if (currentName) {
          detected.push({ name: currentName, default: currentName === defaultPrinter, connected: true, source: 'system_profiler' });
        }
      }
    }

    return detected;
  } catch (error) {
    console.warn('[print-service] system_profiler indisponível:', error.message || error);
  }

  return printers;
}

async function listWindowsPrinters(defaultPrinter) {
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      "Get-Printer | Select-Object Name,DefaultPrinter,PrinterStatus | ConvertTo-Json -Depth 2"
    ]);

    const parsed = JSON.parse(stdout || '[]');
    const items = Array.isArray(parsed) ? parsed : [parsed];

    return items
      .map((printer) => {
        const name = normalizeText(printer?.Name || '');
        if (!name) return null;
        const connected = String(printer?.PrinterStatus || '').toLowerCase() !== 'offline';
        return {
          name,
          default: Boolean(printer?.DefaultPrinter) || name === defaultPrinter,
          connected,
          status: printer?.PrinterStatus || null,
          source: 'powershell',
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.default && !b.default) return -1;
        if (!a.default && b.default) return 1;
        return a.name.localeCompare(b.name);
      });
  } catch (error) {
    console.warn('[print-service] fallback do Windows indisponível:', error.message || error);
    return [];
  }
}

async function printRaw({ printerName, content, jobId }) {
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const pdfPath = await writeTempTextAsPdfFallback(printerName, content, jobId);
    try {
      return await printFileWithSystemCommand(printerName, pdfPath);
    } catch (error) {
      console.warn('[print-service] Falha ao imprimir via lp/lpr:', error.message || error);
    }
  }

  if (pdfToPrinter && typeof pdfToPrinter.print === 'function') {
    const pdfPath = await writeTempTextAsPdfFallback(printerName, content, jobId);
    await pdfToPrinter.print(pdfPath, { printer: printerName });
    return { strategy: 'pdf-to-printer', jobId, output: pdfPath };
  }

  if (printerLib && typeof printerLib.printDirect === 'function') {
    return await new Promise((resolve, reject) => {
      try {
        printerLib.printDirect({
          data: content,
          printer: printerName,
          type: 'RAW',
          success: () => resolve({ strategy: 'printer.printDirect', jobId, output: 'sent' }),
          error: (error) => reject(error),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  const fallbackPath = await writeTempText(printerName, content, jobId);
  return { strategy: 'file-fallback', jobId, output: fallbackPath };
}

async function printFileWithSystemCommand(printerName, filePath) {
  const commands = [
    ['lp', ['-d', printerName, filePath]],
    ['lpr', ['-P', printerName, filePath]],
  ];

  let lastError = null;

  for (const [command, args] of commands) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        env: { ...process.env },
      });

      return {
        strategy: command,
        jobId: path.basename(filePath, path.extname(filePath)),
        output: filePath,
        stdout: stdout || '',
        stderr: stderr || '',
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('lp/lpr indisponível');
}

async function writeTempText(printerName, content, jobId) {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const filePath = path.join(TEMP_DIR, `${sanitizeFileName(printerName)}-${sanitizeFileName(jobId)}.txt`);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

async function writeTempTextAsPdfFallback(printerName, content, jobId) {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  const filePath = path.join(TEMP_DIR, `${sanitizeFileName(printerName)}-${sanitizeFileName(jobId)}.pdf`);
  const pdfBuffer = buildMinimalPdf(content);
  await fs.writeFile(filePath, pdfBuffer);
  return filePath;
}

function buildMinimalPdf(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => normalizePdfText(line))
    .filter((line) => line.length > 0)
    .slice(0, 60);

  const streamLines = [
    'BT',
    '/F1 10 Tf',
    '14 TL',
    '50 780 Td',
  ];

  lines.forEach((line, index) => {
    if (index > 0) {
      streamLines.push('T*');
    }
    streamLines.push(`(${escapePdfString(line)}) Tj`);
  });

  streamLines.push('ET');
  const stream = streamLines.join('\n');

  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj',
    '4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
    `5 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream endobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = ['0000000000 65535 f \n'];

  for (const object of objects) {
    offsets.push(String(pdf.length).padStart(10, '0') + ' 00000 n \n');
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += offsets.join('');
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

function normalizePdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .trim();
}

function escapePdfString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function sanitizeFileName(value) {
  return normalizeText(value).replace(/[^a-z0-9._-]+/gi, '_') || 'print-job';
}

app.listen(PORT, HOST, () => {
  console.log(`MesaFacil Print Service rodando em http://${HOST}:${PORT}`);
});
  // Exibe instrução rápida sobre credenciais quando não fornecidas (rate-limited)
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // rate-limit this notice to avoid spam in environments where the worker is restarted frequently
    if (!global.__mesaFacil_printservice_cred_notice_at || (Date.now() - global.__mesaFacil_printservice_cred_notice_at) > 5 * 60 * 1000) {
      console.log('[print-service] Nota: nenhuma credencial explícita fornecida. Use FIREBASE_SERVICE_ACCOUNT_PATH ou gcloud ADC se necessário.');
      global.__mesaFacil_printservice_cred_notice_at = Date.now();
    }
  }

// --- optional Firestore queue worker ---
let admin = null;
let firestore = null;
// Firebase init state to rate-limit error logs and allow periodic retry
const firebaseInitState = {
  attempted: false,
  success: false,
  lastFailedAt: 0,
  lastNotifiedAt: 0,
  notifyIntervalMs: 5 * 60 * 1000, // 5 minutes
};

function resolveFirebaseProjectId(serviceAccount = null) {
  const envProjectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_PROJECT_ID ||
    null;

  if (envProjectId) {
    return String(envProjectId).trim();
  }

  const credentialProjectId =
    serviceAccount?.project_id ||
    serviceAccount?.projectId ||
    serviceAccount?.projectID ||
    serviceAccount?.project ||
    null;

  if (credentialProjectId) {
    return String(credentialProjectId).trim();
  }

  try {
    const { execFileSync } = require('child_process');
    const stdout = execFileSync('gcloud', ['config', 'get-value', 'project', '--quiet'], { encoding: 'utf8' }).trim();
    if (stdout) return stdout;
  } catch {
    // ignore - gcloud may not be installed in environment
  }

  // Fallback: tentar ler .firebaserc no repositório (útil em dev local)
  try {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const rcPath = path.join(repoRoot, '.firebaserc');
    const fs = require('fs');
    if (fs.existsSync(rcPath)) {
      const rcRaw = fs.readFileSync(rcPath, 'utf8');
      const rc = JSON.parse(rcRaw);
      const fbProject = rc && rc.projects && (rc.projects.default || rc.projects.prod) ? (rc.projects.default || rc.projects.prod) : null;
      if (fbProject) return String(fbProject).trim();
    }
  } catch (err) {
    // ignore - arquivo pode não existir ou estar mal formado
  }

  return '';
}

function applyProjectIdToEnv(projectId) {
  if (!projectId) return;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_PROJECT = projectId;
  process.env.FIREBASE_PROJECT_ID = projectId;
  process.env.GOOGLE_PROJECT_ID = projectId;
}

function tryInitFirebaseAdmin() {
  if (admin) return true;

  const now = Date.now();
  // If we attempted recently and failed, skip re-attempt to avoid log spam
  if (firebaseInitState.attempted && !firebaseInitState.success && (now - firebaseInitState.lastFailedAt) < firebaseInitState.notifyIntervalMs) {
    return false;
  }

  firebaseInitState.attempted = true;

  try {
    // Prefer explicit service account path or GOOGLE_APPLICATION_CREDENTIALS
    const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // JSON string or base64
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) || JSON.parse(raw);
      } catch {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } catch (innerErr) {
          if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
            console.warn('[print-service] FIREBASE_SERVICE_ACCOUNT_JSON inválido');
            firebaseInitState.lastNotifiedAt = now;
          }
        }
      }
    } else if (credPath) {
      try {
        serviceAccount = require(credPath);
      } catch (reqErr) {
        if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
          console.warn('[print-service] Não foi possível carregar credencial do caminho via require:', credPath);
          firebaseInitState.lastNotifiedAt = now;
        }
        try {
          const fs = require('fs');
          const raw = fs.readFileSync(credPath, 'utf8');
          try {
            serviceAccount = JSON.parse(raw);
          } catch (parseErr) {
            if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
              console.warn('[print-service] Falha ao parsear JSON da credencial lida do caminho:', parseErr?.message || parseErr);
              firebaseInitState.lastNotifiedAt = now;
            }
          }
        } catch (fsErr) {
          if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
            console.warn('[print-service] Não foi possível ler arquivo de credencial do caminho:', fsErr?.message || fsErr);
            firebaseInitState.lastNotifiedAt = now;
          }
        }
      }
    }

    // Se houver `serviceAccount` (JSON string/path resolvido), inicializa **sempre** com cert().
    if (serviceAccount) {
      try {
        admin = require('firebase-admin');

        const projectId = resolveFirebaseProjectId(serviceAccount);
        applyProjectIdToEnv(projectId);

        const initOpts = { credential: admin.credential.cert(serviceAccount) };
        if (projectId) initOpts.projectId = projectId;
        admin.initializeApp(initOpts);
        firestore = admin.firestore();
        firebaseInitState.success = true;
        console.log(`[print-service] Firebase Admin inicializado via serviceAccount${projectId ? ` (projectId=${projectId})` : ''}`);
        return true;
      } catch (certErr) {
        firebaseInitState.lastFailedAt = Date.now();
        if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
          console.warn('[print-service] Falha ao inicializar Firebase Admin com serviceAccount cert():', certErr?.message || certErr);
          firebaseInitState.lastNotifiedAt = now;
        }
        // continue to ADC fallback
      }
    }

    if (!serviceAccount) {
        // Tenta Application Default Credentials (ADC) como fallback: útil se o dev
        // tiver rodado `gcloud auth application-default login` ou estiver em ambiente GCP.
        try {
          admin = require('firebase-admin');

          const projectId = resolveFirebaseProjectId();
          applyProjectIdToEnv(projectId);

          if (projectId) {
            admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
            console.log(`[print-service] Firebase Admin inicializado via ADC (projectId=${projectId})`);
          } else {
            // Initialize using ADC without explicit projectId; this may fail if project id cannot be inferred
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
            console.log('[print-service] Firebase Admin inicializado via ADC (projectId não especificado - inferred by environment)');
          }

          firestore = admin.firestore();
          firebaseInitState.success = true;
          return true;
        } catch (adcErr) {
          firebaseInitState.lastFailedAt = Date.now();
          if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
            console.warn('[print-service] Credenciais do Firebase não encontradas. Worker de fila não será iniciado.');
            console.warn('[print-service] Para habilitar o worker, exporte FIREBASE_SERVICE_ACCOUNT_PATH ou rode `gcloud auth application-default login` para fornecer ADC.');
            console.warn('[print-service] Erro ADC:', adcErr?.message || adcErr);
            firebaseInitState.lastNotifiedAt = now;
          }
          return false;
        }
    }

  } catch (error) {
    firebaseInitState.lastFailedAt = Date.now();
    if (!firebaseInitState.lastNotifiedAt || (now - firebaseInitState.lastNotifiedAt) > firebaseInitState.notifyIntervalMs) {
      console.error('[print-service] Falha ao inicializar Firebase Admin:', error?.message || error);
      firebaseInitState.lastNotifiedAt = now;
    }
    return false;
  }
}

function resolvePrinterNameFromDoc(docData = {}) {
  return (
    docData.printerSystemName ||
    docData.systemPrinter ||
    docData.impressoraNome ||
    docData.payload?.printerSystemName ||
    docData.payload?.printerName ||
    docData.payload?.systemPrinter ||
    ''
  ).trim();
}

async function processPendingQueueBatch(limit = 5) {
  if (!firestore) return;

  try {
    // Avoid collectionGroup query (requires index). Iterate restaurantes and query each subcollection.
    const restaurantsSnapshot = await firestore.collection('restaurantes').get();
    if (restaurantsSnapshot.empty) return;

    const docsToProcess = [];
    for (const restSnap of restaurantsSnapshot.docs) {
      const restId = restSnap.id;
      try {
        const qSnapshot = await firestore.collection('restaurantes').doc(restId).collection('printQueue').where('status', '==', 'PENDENTE').limit(limit).get();
        if (!qSnapshot.empty) {
          for (const docSnap of qSnapshot.docs) {
            docsToProcess.push(docSnap);
            if (docsToProcess.length >= limit) break;
          }
        }
      } catch (e) {
        console.warn('[print-service] Falha ao consultar printQueue do restaurante', restId, e?.message || e);
      }
      if (docsToProcess.length >= limit) break;
    }

    if (docsToProcess.length === 0) return;

    for (const docSnap of docsToProcess) {
      const data = docSnap.data();
      const printerName = resolvePrinterNameFromDoc(data);
      const payload = data.payload || {};
      const content = String(payload.ticketText || payload.ticketHtml || payload.content || '').trim();

      try {
        if (!printerName) {
          await docSnap.ref.update({ status: 'ERRO', ultimoErro: 'Nenhuma impressora vinculada ao setor', tentativas: admin.firestore.FieldValue.increment(1) });
          continue;
        }

        if (!content) {
          await docSnap.ref.update({ status: 'ERRO', ultimoErro: 'Conteúdo de impressão vazio', tentativas: admin.firestore.FieldValue.increment(1) });
          continue;
        }

        console.log('[print-service] Enviando impressão para', printerName, 'doc=', docSnap.id);
        const result = await printRaw({ printerName, content, jobId: docSnap.id });

        await docSnap.ref.update({
          status: 'IMPRESSO',
          impressoEm: new Date().toISOString(),
          tentativas: admin.firestore.FieldValue.increment(1),
          printStrategy: result.strategy || 'local-service',
          printJobId: result.jobId || docSnap.id,
          ultimoErro: null,
        });
      } catch (err) {
        console.error('[print-service] Erro ao imprimir fila:', err?.message || err);
        try {
          await docSnap.ref.update({ status: 'ERRO', ultimoErro: String(err?.message || err), tentativas: admin.firestore.FieldValue.increment(1) });
        } catch (uErr) {
          console.error('[print-service] Falha ao atualizar documento de fila:', uErr?.message || uErr);
        }
      }
    }
  } catch (error) {
    console.error('[print-service] Falha ao processar fila:', error?.message || error);
  }
}

// --- server-side enqueue for pedidos created by clients (QR/cliente)
async function enqueuePedidosFromPedidos(limitPerRest = 5) {
  if (!firestore) return;

  try {
    const restaurantsSnapshot = await firestore.collection('restaurantes').get();
    if (restaurantsSnapshot.empty) return;

    for (const restSnap of restaurantsSnapshot.docs) {
      const restId = restSnap.id;
      try {
        const mesasSnapshot = await firestore.collection('restaurantes').doc(restId).collection('mesas').get();
        if (mesasSnapshot.empty) continue;

        for (const mesaSnap of mesasSnapshot.docs) {
          const mesaId = mesaSnap.id;
          const pedidosRef = firestore.collection('restaurantes').doc(restId).collection('mesas').doc(mesaId).collection('pedidos');
          const pedidosSnapshot = await pedidosRef.where('status', '==', 'andamento').limit(limitPerRest).get();

          if (pedidosSnapshot.empty) continue;

          for (const pedidoSnap of pedidosSnapshot.docs) {
            const pedidoData = pedidoSnap.data();
            // Skip if already enqueued
            if (pedidoData && pedidoData.enqueuedForPrint) continue;

            try {
              // Build queue items server-side
              const items = Array.isArray(pedidoData.items) ? pedidoData.items : [];

              // fetch setores and impressoras
              const setores = (await firestore.collection('restaurantes').doc(restId).collection('setoresProducao').get()).docs.map(d => ({ id: d.id, ...(d.data()||{}) }));
              const impressoras = (await firestore.collection('restaurantes').doc(restId).collection('impressorasSetor').get()).docs.map(d => ({ id: d.id, ...(d.data()||{}) }));

              // resolve setor per item
              const resolveSetor = (item) => {
                const setorId = item?.setorId || item?.setor?.id || '';
                if (setorId) {
                  const s = setores.find(x => x.id === setorId);
                  if (s) return { setorId: s.id, setorNome: s.nome || item.setorNome || '' };
                }
                const categoriasItem = Array.isArray(item?.categorias) ? item.categorias.map(c => String(c||'').toLowerCase()) : [];
                for (const s of setores) {
                  const cats = Array.isArray(s.categorias) ? s.categorias.map(c => String(c||'').toLowerCase()) : [];
                  if (cats.some(c => categoriasItem.includes(c))) return { setorId: s.id, setorNome: s.nome || '' };
                }
                return { setorId: setorId || 'sem-setor', setorNome: item.setorNome || item.setor || 'Sem setor' };
              };

              const gruposMap = new Map();
              items.forEach((it, idx) => {
                const resolved = resolveSetor(it);
                const key = `${resolved.setorId}::${resolved.setorNome}`;
                if (!gruposMap.has(key)) gruposMap.set(key, { setorId: resolved.setorId, setorNome: resolved.setorNome, items: [] });
                gruposMap.get(key).items.push({ ...it, __index: idx, setorId: resolved.setorId, setorNome: resolved.setorNome });
              });

              const estabelecimentoNomeSnap = await firestore.collection('restaurantes').doc(restId).get();
              const estabelecimentoNome = estabelecimentoNomeSnap.exists ? String(estabelecimentoNomeSnap.data().nome || '') : '';

              const line = (char='-') => char.repeat(48);
              const safeText = (v) => String(v || '')
                .replace(/[<>]/g, '')
                .trim();
              const centerMultiLineLocal = (value, width = 48) => {
                const text = safeText(value);
                if (!text) return '';
                const words = text.split(/\s+/);
                const lines = []; let current = '';
                for (const w of words) {
                  if ((current + ' ' + w).trim().length <= width) current = (current + ' ' + w).trim();
                  else { if (current) lines.push(current); current = w; }
                }
                if (current) lines.push(current);
                return lines.map(ln => {
                  if (ln.length >= width) return ln;
                  const totalPadding = width - ln.length; const left = Math.floor(totalPadding/2); const right = totalPadding - left;
                  return ' '.repeat(left) + ln + ' '.repeat(right);
                }).join('\n');
              };

              const formatItemLabelLocal = (item, index) => {
                const quantity = Number(item?.quantity || 0);
                const name = safeText(item?.nome || 'Item').toUpperCase();
                const observation = safeText(item?.descricao || item?.observacao || item?.observacoes || '');
                const lines = [`${String(index+1).padStart(2,'0')}. ${quantity}X ${name}`];
                if (observation) lines.push(`   OBS: ${observation.toUpperCase()}`);
                return lines.join('\n');
              };

              for (const [, grupo] of gruposMap.entries()) {
                const setorId = grupo.setorId; const setorNome = grupo.setorNome;
                const impressora = impressoras.find(ip => ip.setorId === setorId && ip.ativa !== false);
                const printerSystemName = String((impressora && (impressora.printerSystemName || impressora.systemPrinter)) || '').trim();

                // build ticket text
                const header = [line(), centerMultiLineLocal('MESA FACIL'.toUpperCase()), centerMultiLineLocal(estabelecimentoNome || '-'), `TIPO: PEDIDO`, `MESA: ${safeText(mesaSnap.data()?.numero || mesaId).toUpperCase()}`, `SETOR: ${safeText(setorNome||'-').toUpperCase()}`, line()];
                const itemLines = (grupo.items || []).map((it, idx) => formatItemLabelLocal(it, idx));
                const footer = [line()];
                if (pedidoData.observacoes) footer.push(line(), `OBS: ${safeText(pedidoData.observacoes).toUpperCase()}`);
                footer.push(line());
                const ticketText = [...header, ...itemLines, ...footer].join('\n');

                const payload = {
                  tipo: 'PEDIDO', pedidoId: pedidoSnap.id, mesaId, mesaNumero: String(mesaSnap.data()?.numero || mesaId || '-'), setorId, setorNome, printerSystemName, total: grupo.items.reduce((acc,it)=>acc + Number(it.price||0)*Number(it.quantity||0),0), observacoes: pedidoData.observacoes || '', items: grupo.items.map(it=>({ id: it.id, nome: it.nome, price: Number(it.price||0), quantity: Number(it.quantity||0), descricao: it.descricao || it.observacao || it.observacoes || '', setorId: it.setorId || '', setorNome: it.setorNome || '' })), ticketText, ticketHtml: `<pre>${safeText(ticketText)}</pre>`
                };

                // create printQueue doc
                await firestore.collection('restaurantes').doc(restId).collection('printQueue').add({
                  pedidoId: pedidoSnap.id,
                  mesaId,
                  mesaNumero: String(mesaSnap.data()?.numero || mesaId || '-'),
                  setorId,
                  setorNome,
                  printerSystemName,
                  impressoraId: impressora?.id || null,
                  impressoraNome: impressora?.nome || null,
                  tipo: 'PEDIDO',
                  status: 'PENDENTE',
                  tentativas: 0,
                  payload,
                  criadoEm: admin.firestore.FieldValue.serverTimestamp(),
                });
              }

              // mark pedido as enqueued to avoid duplicates
              await pedidoSnap.ref.update({ enqueuedForPrint: true });
            } catch (innerErr) {
              console.error('[print-service] Falha ao enfileirar pedido server-side', restId, mesaId, pedidoSnap.id, innerErr?.message || innerErr);
            }
          }
        }
      } catch (e) {
        console.warn('[print-service] Falha ao escanear mesas/pedidos do restaurante', restId, e?.message || e);
      }
    }
  } catch (error) {
    console.error('[print-service] Falha ao enfileirar pedidos server-side:', error?.message || error);
  }
}

function startQueueWorker() {
  const enabled = String(process.env.ENABLE_QUEUE_WORKER || 'true').toLowerCase() === 'true';
  if (!enabled) return;

  const inited = tryInitFirebaseAdmin();
  if (!inited) return;

  const intervalMs = Number(process.env.QUEUE_POLL_INTERVAL_MS || 5000);
  console.log(`[print-service] Iniciando worker de fila. Poll interval: ${intervalMs}ms`);
  setInterval(() => {
    // First, try to enqueue pedidos created by clients (QR) into printQueue
    enqueuePedidosFromPedidos(Number(process.env.QUEUE_BATCH_SIZE || 5)).catch((e) => console.error('[print-service] enqueuePedidos erro:', e));
    // Then process pending printQueue items
    processPendingQueueBatch(Number(process.env.QUEUE_BATCH_SIZE || 5)).catch((e) => console.error('[print-service] worker erro:', e));
  }, intervalMs);
}

// Start worker if requested
startQueueWorker();
