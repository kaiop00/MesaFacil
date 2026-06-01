import caixaService from '@/services/caixa/caixaService';
import * as firestore from '@/services/firebase/firestoreService';
import { argv } from 'process';

// Usage: node scripts/caixa-print-sample.mjs <empresaId> [caixaSessionId]
(async () => {
  try {
    const empresaId = argv[2];
    const caixaId = argv[3];
    if (!empresaId) {
      console.error('Usage: node scripts/caixa-print-sample.mjs <empresaId> [caixaSessionId]');
      process.exit(1);
    }

    let sessionId = caixaId;
    if (!sessionId) {
      // tenta pegar a sessão aberta mais recente
      const sessions = await firestore.getAll(empresaId, 'caixaSessions', { orderByField: 'dataAbertura', order: 'desc' });
      if (!sessions || sessions.length === 0) {
        console.error('Nenhuma sessão encontrada para a empresa:', empresaId);
        process.exit(1);
      }
      sessionId = sessions[0].id;
    }

    const width = argv[4] ? Number(argv[4]) : undefined;
    const report = await caixaService.gerarRelatorioFechamento(empresaId, sessionId, { width });
    console.log(report);
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    process.exit(1);
  }
})();
