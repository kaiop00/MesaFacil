/* eslint-env node */
/**
 * read.js — Lê documentos recentes de uma coleção do Firestore
 *
 * Uso:
 *   node read.js <coleção> [opções]
 *
 * Exemplos:
 *   node read.js ifoodOrders --restaurante SEU_ID_AQUI
 *   node read.js pedidos --restaurante SEU_ID_AQUI --limit 5
 *   node read.js users --limit 10 --orderBy criadoEm
 *   node read.js restaurantes --limit 3 --asc
 *   node read.js restaurantes/SEU_ID/ifoodOrders --limit 20
 *
 * Coleções por restaurante (usam --restaurante):
 *   ifoodOrders, pedidos, cardapio, mesas, categorias,
 *   historicoPedidos, notificacoes, movimentos, promocoes
 *
 * Coleções de topo (não precisam de --restaurante):
 *   users, restaurantes
 *
 * Opções:
 *   --restaurante, -r <id>   ID do restaurante (para sub-coleções)
 *   --limit, -l <n>          Quantidade de documentos (padrão: 20)
 *   --orderBy, -o <campo>    Campo de ordenação (padrão: createdAt)
 *   --asc                    Ordem crescente (padrão: decrescente)
 *   --project, -p <id>       ID do projeto Firebase (sobrescreve .env)
 *   --output, -f <arquivo>   Salva resultado em arquivo JSON
 *   --credentials, -c <arquivo> Service account JSON (ex: serviceAccount.json)
 *   --help, -h               Mostra esta ajuda
 *
 * Autenticação (uma das opções):
 *   1) GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node read.js ...
 *   2) node read.js ... --credentials serviceAccount.json
 *   3) gcloud auth application-default login  (se gcloud instalado)
 *   Para gerar a chave: Firebase Console → Configurações → Contas de serviço
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import process from 'node:process';

const require = createRequire(import.meta.url);

// ──────────────────────────────────────────────────────────
// Carrega firebase-admin a partir de functions/node_modules
// ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const adminPath = join(__dirname, 'functions', 'node_modules', 'firebase-admin');

let admin;
try {
  admin = require(adminPath);
} catch {
  console.error('❌ firebase-admin não encontrado em functions/node_modules');
  console.error('   Execute: cd functions && npm install');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────
// Parser simples de .env
// ──────────────────────────────────────────────────────────
function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = val;
  }
  return vars;
}

// ──────────────────────────────────────────────────────────
// Parse dos argumentos CLI
// ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const opts = {
    collection: null,
    restaurante: null,
    limit: 20,
    orderBy: 'createdAt',
    direction: 'desc',
    project: null,
    output: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (!arg.startsWith('-')) {
      opts.collection = arg;
    } else if ((arg === '--restaurante' || arg === '-r') && args[i + 1]) {
      opts.restaurante = args[++i];
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      opts.limit = parseInt(args[++i], 10);
    } else if ((arg === '--orderBy' || arg === '-o') && args[i + 1]) {
      opts.orderBy = args[++i];
    } else if (arg === '--asc') {
      opts.direction = 'asc';
    } else if ((arg === '--project' || arg === '-p') && args[i + 1]) {
      opts.project = args[++i];
    } else if ((arg === '--output' || arg === '-f') && args[i + 1]) {
      opts.output = args[++i];
    } else if ((arg === '--credentials' || arg === '-c') && args[i + 1]) {
      opts.credentials = args[++i];
    }
    i++;
  }

  if (!opts.collection) {
    console.error('❌ Informe o nome da coleção.\n   Exemplo: node read.js ifoodOrders --restaurante <id>');
    process.exit(1);
  }

  return opts;
}

function printHelp() {
  console.log(`
read.js — Lê documentos recentes do Firestore

Uso:
  node read.js <coleção> [opções]

Exemplos:
  node read.js ifoodOrders --restaurante SEU_ID_AQUI
  node read.js ifoodOrders --restaurante SEU_ID_AQUI --limit 5
  node read.js pedidos --restaurante SEU_ID_AQUI --orderBy criadoEm
  node read.js users --limit 10
  node read.js restaurantes --limit 3 --asc
  node read.js restaurantes/SEU_ID/cardapio --limit 20

Coleções por restaurante (usam --restaurante):
  ifoodOrders, pedidos, cardapio, mesas, categorias,
  historicoPedidos, notificacoes, movimentos, promocoes

Coleções de topo:
  users, restaurantes

Opções:
  --restaurante, -r <id>   ID do restaurante
  --limit, -l <n>          Quantidade de docs (padrão: 20)
  --orderBy, -o <campo>    Campo de ordenação (padrão: createdAt)
  --asc                    Ordem crescente (padrão: decrescente)
  --project, -p <id>       Project ID Firebase (sobrescreve .env)
  --output, -f <arquivo>   Salva resultado em arquivo JSON
  --credentials, -c <arq>  Caminho para o service account JSON
  --help, -h               Esta ajuda

Autenticação:
  1) node read.js ... --credentials serviceAccount.json
  2) GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node read.js ...
  3) gcloud auth application-default login
  Gere a chave: Firebase Console → Config → Contas de serviço → Gerar chave
`);
}

// ──────────────────────────────────────────────────────────
// Converte Timestamps e outros tipos especiais para JSON
// ──────────────────────────────────────────────────────────
function serializeDoc(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  // Firestore Timestamp
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  // Firestore DocumentReference
  if (data._firestore !== undefined && data.path) {
    return `[Ref: ${data.path}]`;
  }

  if (Array.isArray(data)) {
    return data.map(serializeDoc);
  }

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializeDoc(value);
  }
  return result;
}

// ──────────────────────────────────────────────────────────
// Resolve o caminho da coleção no Firestore
// ──────────────────────────────────────────────────────────
function resolveCollectionPath(opts) {
  const { collection, restaurante } = opts;

  // Coleções de topo que não precisam de restaurante
  const topLevel = ['users', 'restaurantes'];

  // Se a coleção já contém '/', é um caminho completo
  if (collection.includes('/')) {
    return collection;
  }

  // Se é top-level
  if (topLevel.includes(collection)) {
    return collection;
  }

  // Sub-coleção de restaurante
  if (!restaurante) {
    console.error(`❌ A coleção "${collection}" é uma sub-coleção de restaurante.`);
    console.error('   Use --restaurante <id> ou forneça o caminho completo:');
    console.error(`   node read.js restaurantes/<ID>/${collection}`);
    process.exit(1);
  }

  return `restaurantes/${restaurante}/${collection}`;
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);

  // Carrega variáveis de ambiente
  const envPath = join(__dirname, '.env');
  const envVars = loadEnv(envPath);
  const projectId = opts.project || envVars.VITE_FIREBASE_PROJECT_ID;

  if (!projectId || projectId.includes('your_')) {
    console.error('❌ Project ID do Firebase não encontrado.');
    console.error('   Configure VITE_FIREBASE_PROJECT_ID no .env ou use --project <id>');
    process.exit(1);
  }

  // Resolve credenciais
  const credPath = opts.credentials
    ? resolve(opts.credentials)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : null;

  if (credPath) {
    if (!existsSync(credPath)) {
      console.error(`❌ Arquivo de credenciais não encontrado: ${credPath}`);
      process.exit(1);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    console.log(`🔑 Credenciais: ${credPath}`);
  }

  // Inicializa Firebase Admin
  if (!admin.apps.length) {
    try {
      const initOpts = { projectId };
      if (credPath) {
        const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
        initOpts.credential = admin.credential.cert(serviceAccount);
      }
      admin.initializeApp(initOpts);
    } catch (err) {
      console.error('❌ Erro ao inicializar Firebase Admin:', err.message);
      console.error('\n   Autentique-se com uma das opções:');
      console.error('   1) node read.js ... --credentials serviceAccount.json');
      console.error('   2) GOOGLE_APPLICATION_CREDENTIALS=chave.json node read.js ...');
      console.error('   3) gcloud auth application-default login');
      console.error('\n   Gere a chave: Firebase Console → Configurações → Contas de serviço');
      process.exit(1);
    }
  }

  const db = admin.firestore();
  const collectionPath = resolveCollectionPath(opts);

  console.log(`\n📂 Coleção : ${collectionPath}`);
  console.log(`📊 Limite  : ${opts.limit} documentos`);
  console.log(`🔃 Ordem   : ${opts.orderBy} (${opts.direction})\n`);

  // Tenta a query com orderBy; se falhar (índice ausente), tenta sem
  let snapshot;
  try {
    snapshot = await db
      .collection(collectionPath)
      .orderBy(opts.orderBy, opts.direction)
      .limit(opts.limit)
      .get();
  } catch (err) {
    if (err.code === 9 || err.message.includes('index')) {
      console.warn(`⚠️  Índice não disponível para "${opts.orderBy}". Buscando sem ordenação...\n`);
      snapshot = await db.collection(collectionPath).limit(opts.limit).get();
    } else {
      throw err;
    }
  }

  if (snapshot.empty) {
    console.log('⚠️  Nenhum documento encontrado.');
    return;
  }

  console.log(`✅ ${snapshot.size} documento(s) encontrado(s):\n`);
  console.log('─'.repeat(60));

  const results = [];

  snapshot.forEach((docSnap) => {
    const data = serializeDoc(docSnap.data());
    const entry = { _id: docSnap.id, ...data };
    results.push(entry);

    console.log(`📄 ID: ${docSnap.id}`);
    console.log(JSON.stringify(data, null, 2));
    console.log('─'.repeat(60));
  });

  // Salva em arquivo se --output foi especificado
  if (opts.output) {
    const outputPath = resolve(opts.output);
    writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n💾 Resultado salvo em: ${outputPath}`);
  }

  console.log(`\n📦 Total: ${results.length} documento(s) de "${collectionPath}"`);
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message || err);
  if (err.code === 7) {
    console.error('   Sem permissão. Verifique suas credenciais do Firebase.');
  }
  process.exit(1);
});
