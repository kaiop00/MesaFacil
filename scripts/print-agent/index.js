import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { execFile } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execFileAsync = promisify(execFile);

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const POLL_INTERVAL_MS = Number(process.env.PRINT_AGENT_POLL_INTERVAL_MS || 5000);
const MAX_ATTEMPTS = Number(process.env.PRINT_AGENT_MAX_ATTEMPTS || 3);
const ENABLE_QUEUE_POLLING = String(process.env.PRINT_AGENT_ENABLE_QUEUE_POLLING || 'true').toLowerCase() !== 'false';

let db = null;
if (SERVICE_ACCOUNT_PATH) {
    try {
        const raw = await fs.readFile(SERVICE_ACCOUNT_PATH, 'utf8');
        const serviceAccount = JSON.parse(raw);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        db = admin.firestore();
    } catch (err) {
        console.warn('Não foi possível inicializar Firestore com o service account. A fila de impressão ficará desativada:', err.message || err);
    }
} else {
    console.warn('SERVICE_ACCOUNT não informado. O servidor HTTP do agente vai subir, mas a fila `printQueue` ficará desativada.');
}

// Optional HTTP API to expose system printers to the frontend
const HTTP_PORT = Number(process.env.PRINT_AGENT_HTTP_PORT || 3000);
let httpServer = null;
async function tryStartHttpServer() {
    if (!HTTP_PORT) return;
    try {
        const expressModule = await import('express');
        const express = expressModule.default;
        const corsModule = await import('cors');
        const cors = corsModule.default;
        const app = express();

        app.use(cors({
            origin: true,
            methods: ['GET', 'POST', 'OPTIONS'],
        }));
        app.use(express.json());

        app.get('/health', (req, res) => {
            res.json({ ok: true, status: 'running' });
        });

        app.get('/printers', async (req, res) => {
            try {
                const printers = await listSystemPrinters();
                if (printers.length > 0) return res.json(printers);

                const fromEnv = (process.env.PRINT_AGENT_PRINTERS || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((name) => ({ name }));

                if (fromEnv.length > 0) return res.json(fromEnv);

                return res.json([]);
            } catch (err) {
                console.error('Erro ao listar impressoras:', err);
                return res.status(500).json({ error: String(err) });
            }
        });

        // Endpoint para impressão direta (útil para testes)
        // Body esperado: { restauranteId?: string, printerName?: string, ticketText?: string, ticketHtml?: string, jobId?: string }
        app.post('/print', async (req, res) => {
            try {
                const { restauranteId, printerName, ticketText, ticketHtml, jobId } = req.body || {};
                if (!ticketText && !ticketHtml) return res.status(400).json({ error: 'ticketText ou ticketHtml obrigatório' });

                const outDir = path.join(process.cwd(), 'print-output', restauranteId || 'local');
                await ensureDir(outDir);
                const id = jobId || `manual-${Date.now()}`;
                if (ticketText) await fs.writeFile(path.join(outDir, `${id}.txt`), String(ticketText), 'utf8');
                if (ticketHtml) await fs.writeFile(path.join(outDir, `${id}.html`), String(ticketHtml), 'utf8');

                // respond with where files were written
                return res.json({ ok: true, id, path: `${outDir}/${id}` });
            } catch (err) {
                console.error('Erro no /print:', err);
                return res.status(500).json({ error: String(err) });
            }
        });

        httpServer = app.listen(HTTP_PORT, () => {
            console.log(`Print agent HTTP API rodando em http://localhost:${HTTP_PORT}`);
        });
    } catch (err) {
        console.warn('Não foi possível iniciar API HTTP do agente:', err?.message || err);
    }
}

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

async function listSystemPrinters() {
    if (process.platform === 'darwin') {
        try {
            const { stdout } = await execFileAsync('lpstat', ['-p'], {
                env: {
                    ...process.env,
                    LANG: 'C',
                    LC_ALL: 'C',
                },
            });
            const printers = stdout
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => /^(printer|impressora)\s+/i.test(line))
                .map((line) => {
                    const match = line.match(/^(printer|impressora)\s+(.+?)\s+(is|está)\s+/i);
                    return match ? { name: match[2].trim() } : null;
                })
                .filter(Boolean);

            if (printers.length > 0) return printers;
        } catch (err) {
            console.warn('lpstat indisponível ou sem permissões:', err.message || err);
        }

        try {
            const { stdout } = await execFileAsync('lpstat', ['-v'], {
                env: {
                    ...process.env,
                    LANG: 'C',
                    LC_ALL: 'C',
                },
            });
            const printers = stdout
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => /^(device for|dispositivo de)\s+/i.test(line))
                .map((line) => {
                    const match = line.match(/^(device for|dispositivo de)\s+(.+?):\s+/i);
                    return match ? { name: match[2].trim() } : null;
                })
                .filter(Boolean);

            if (printers.length > 0) return printers;
        } catch (err) {
            console.warn('lpstat -v indisponível:', err.message || err);
        }

        try {
            const { stdout } = await execFileAsync('system_profiler', ['SPPrintersDataType']);
            const printers = [];
            let currentName = '';

            for (const rawLine of stdout.split('\n')) {
                const line = rawLine.trim();
                if (!line) continue;
                const nameMatch = line.match(/^Name:\s*(.+)$/i);
                if (nameMatch) {
                    currentName = nameMatch[1].trim();
                    printers.push({ name: currentName });
                }
            }

            return printers;
        } catch (err) {
            console.warn('system_profiler indisponível:', err.message || err);
        }
    }

    return [];
}

function restauranteIdFromRef(ref) {
    // ref.path like 'restaurantes/{id}/printQueue/{docId}' -> parent.parent.id
    try {
        return ref.parent.parent.id;
    } catch (e) {
        return 'unknown';
    }
}

async function processDoc(doc) {
    const id = doc.id;
    const ref = doc.ref;
    const data = doc.data();
    const restauranteId = restauranteIdFromRef(ref);
    const outDir = path.join(process.cwd(), 'print-output', restauranteId);

    try {
        // Use transaction to claim the job (only if still PENDENTE)
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) throw new Error('Documento removido');
            const s = snap.data().status;
            if (s !== 'PENDENTE') throw new Error('Job já processado por outro worker');

            await ensureDir(outDir);

            // Write text and html
            if (data.payload?.ticketText) {
                await fs.writeFile(path.join(outDir, `${id}.txt`), String(data.payload.ticketText), 'utf8');
            }
            if (data.payload?.ticketHtml) {
                await fs.writeFile(path.join(outDir, `${id}.html`), String(data.payload.ticketHtml), 'utf8');
            }

            tx.update(ref, {
                status: 'IMPRESSO',
                printedAt: admin.firestore.FieldValue.serverTimestamp(),
                attempts: admin.firestore.FieldValue.increment(1),
            });
        });

        console.log(`Impressão simulada escrita: ${restauranteId}/${id}`);
    } catch (err) {
        console.error('Erro ao processar job', id, err.message || err);
        // mark attempt and error
        try {
            await db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) return;
                const curr = snap.data();
                const attempts = (curr.attempts || 0) + 1;
                const update = {
                    attempts,
                    lastError: String(err.message || err),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                if (attempts >= MAX_ATTEMPTS) update.status = 'ERRO';
                tx.update(ref, update);
            });
        } catch (uErr) {
            console.error('Erro ao atualizar tentativas:', uErr.message || uErr);
        }
    }
}

async function pollOnce() {
    try {
        const q = db.collectionGroup('printQueue').where('status', '==', 'PENDENTE').limit(20);
        const snaps = await q.get();
        if (snaps.empty) return 0;
        let count = 0;
        for (const doc of snaps.docs) {
            // process sequentially to avoid race; small scale is fine
            // we don't await here to allow concurrency if needed; but keep sequential for simplicity
            // eslint-disable-next-line no-await-in-loop
            await processDoc(doc);
            count++;
        }
        return count;
    } catch (err) {
        console.error('Erro no pollOnce:', err.message || err);
        return 0;
    }
}

async function main() {
    console.log('Print agent iniciado. Poll interval:', POLL_INTERVAL_MS, 'ms');
    // start optional http server
    await tryStartHttpServer();
    while (true) {
        try {
            if (ENABLE_QUEUE_POLLING && db) {
                const processed = await pollOnce();
                if (processed > 0) console.log(`Processados: ${processed}`);
            }
        } catch (err) {
            console.error('Erro no loop principal:', err.message || err);
        }
        // sleep
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

main().catch((err) => {
    console.error('Agente finalizou com erro:', err.message || err);
    process.exit(1);
});
