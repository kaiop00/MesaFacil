import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import caixaService from '@/services/caixa/caixaService';
import SessionHeader from '../components/SessionHeader';
import TotaisPorForma from '../components/TotaisPorForma';
import ActionButtons from '../components/ActionButtons';
import MovimentacaoModal from '../components/MovimentacaoModal';
import CloseCaixaModal from '../components/CloseCaixaModal';

const CaixaAtual = () => {
  const { idRestaurante, user } = useAuth();
  const [session, setSession] = useState(null);
  const [totais, setTotais] = useState(null);
  const [closureReport, setClosureReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [movimentacaoModal, setMovimentacaoModal] = useState({ open: false, tipo: null });
  const [closeCaixaModal, setCloseCaixaModal] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  useEffect(() => {
    if (!idRestaurante || !user) return;
    
    const load = async () => {
      setLoading(true);
      try {
        const aberto = await caixaService.getOpenSession(idRestaurante);
        setSession(aberto);
        if (aberto) {
            setClosureReport(null);
          const calc = await caixaService.calcularTotaisSessao(idRestaurante, aberto.id);
          setTotais(calc);
        } else {
          // tenta recuperar último fechamento com relatório salvo
          const lastClosed = await caixaService.getLastClosedSessionWithReport(idRestaurante);
          if (lastClosed) {
            setClosureReport({ sessionId: lastClosed.sessionId, report: lastClosed.relatorio, informado: lastClosed.informado, diferenca: lastClosed.diferenca });
            // zerar totais visuais
            setTotais({ porForma: { DINHEIRO: 0, PIX: 0, CREDITO: 0, DEBITO: 0, VOUCHER: 0, IFOOD: 0 }, suprimentos: 0, entradasExtras: 0, sangrias: 0, vendasDinheiro: 0 });
          } else {
            setTotais(null);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar caixa:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [idRestaurante, user]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const reloadData = async () => {
    if (!idRestaurante) return;
    try {
      const aberto = await caixaService.getOpenSession(idRestaurante);
      setSession(aberto);
      if (aberto) {
        const calc = await caixaService.calcularTotaisSessao(idRestaurante, aberto.id);
        setTotais(calc);
      } else {
        const lastClosed = await caixaService.getLastClosedSessionWithReport(idRestaurante);
        if (lastClosed) {
          setClosureReport({ sessionId: lastClosed.sessionId, report: lastClosed.relatorio, informado: lastClosed.informado, diferenca: lastClosed.diferenca });
          setTotais({ porForma: { DINHEIRO: 0, PIX: 0, CREDITO: 0, DEBITO: 0, VOUCHER: 0, IFOOD: 0 }, suprimentos: 0, entradasExtras: 0, sangrias: 0, vendasDinheiro: 0 });
        } else {
          setTotais(null);
        }
      }
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
    }
  };

  const handleMovimentacaoSubmit = async (valor, descricao) => {
    setActionLoading(true);
    try {
      await caixaService.criarMovimentacao({
        empresaId: idRestaurante,
        usuarioId: user?.uid,
        tipo: movimentacaoModal.tipo,
        valor,
        descricao,
      });
      setMovimentacaoModal({ open: false, tipo: null });
      await reloadData();
      showToast('success', 'Movimentação registrada com sucesso');
    } catch (error) {
      showToast('error', 'Erro ao registrar movimentação: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseCaxa = async (valorContado) => {
    setActionLoading(true);
    console.log('[CaixaAtual] handleCloseCaxa called with', valorContado);
    showToast('info', 'Iniciando fechamento do caixa...');
    try {
      // Validações rápidas
      if (!idRestaurante) throw new Error('ID do restaurante ausente. Faça login novamente.');
      if (!user?.uid) throw new Error('Usuário inválido. Faça login novamente.');
      if (!session?.id) throw new Error('Não há caixa aberto para fechamento.');

      const res = await caixaService.fecharCaixa({
        empresaId: idRestaurante,
        usuarioId: user.uid,
        caixaSessionId: session.id,
        valorInformadoFechamento: valorContado,
      });

      // usar o relatório já gerado e persistido pelo serviço
      const rel = res.relatorio || res.relatorioFechamento || res.relatorio || '';

      // Atualizar estado para mostrar tela de resumo imediatamente
      setSession(null);
      setClosureReport({
        sessionId: session.id,
        report: rel,
        esperado: res.esperado,
        informado: res.informado,
        diferenca: res.diferenca,
      });

      // zerar os totais visuais após fechamento
      setTotais({ porForma: { DINHEIRO: 0, PIX: 0, CREDITO: 0, DEBITO: 0, VOUCHER: 0, IFOOD: 0 }, suprimentos: 0, entradasExtras: 0, sangrias: 0, vendasDinheiro: 0 });

      setCloseCaixaModal(false);
      showToast('success', `Caixa fechado. Diferença: R$ ${Number(res.diferenca || 0).toFixed(2)}`);
    } catch (error) {
      console.error('Erro no fechamento do caixa:', error);
      // Mostrar mensagem amigável ao usuário
      const message = (error && error.message) ? error.message : 'Erro desconhecido ao fechar o caixa';
      showToast('error', 'Erro ao fechar caixa: ' + message);
    } finally {
      setActionLoading(false);
    }
  };

  const valorEsperado = session
    ? (Number(session.valorInicial || 0) +
        Number(totais?.vendasDinheiro || 0) +
        Number(totais?.suprimentos || 0) +
        Number(totais?.entradasExtras || 0) -
        Number(totais?.sangrias || 0)).toFixed(2)
    : 0;

  const handlePrintClosureReport = () => {
    // Abrir modal de impressão para o usuário revisar antes de imprimir
    if (!closureReport?.report) return;
    setPrintModalOpen(true);
  };

  const buildPrintHtml = () => {
    if (!closureReport?.report) return '';

    return `
      <html>
        <head>
          <title>Relatório de Fechamento</title>
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <style>
            body { font-family: monospace; white-space: pre-wrap; padding: 24px; margin: 0; }
            pre { margin: 0; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <pre>${closureReport.report.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `;
  };

  const printReportFromModal = () => {
    if (!closureReport?.report) return;
    const printHtml = buildPrintHtml();
    if (!printHtml) {
      showToast('error', 'Não foi possível gerar o relatório para impressão');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      iframe.removeEventListener('load', onLoad);
      window.removeEventListener('afterprint', cleanup);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    const onLoad = () => {
      try {
        const frameWindow = iframe.contentWindow;
        if (!frameWindow) {
          showToast('error', 'Não foi possível abrir a janela de impressão');
          cleanup();
          return;
        }

        frameWindow.focus();
        // Aguarda um pouco para garantir que o conteúdo foi renderizado
        setTimeout(() => {
          try { frameWindow.print(); } catch (err) { console.error('Erro ao iniciar impressão:', err); }
        }, 400);
      } catch (err) {
        console.error('Erro ao iniciar impressão:', err);
        showToast('error', 'Falha ao abrir a impressão');
        cleanup();
      }
    };

    iframe.addEventListener('load', onLoad);
    window.addEventListener('afterprint', cleanup);
    document.body.appendChild(iframe);
    iframe.srcdoc = printHtml;
    setPrintModalOpen(false);
  };

  const openReportInNewTab = () => {
    if (!closureReport?.report) return;
    const html = `<html><head><title>Relatório de Fechamento</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><pre style="font-family:monospace;white-space:pre-wrap;padding:24px">${closureReport.report.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    // libera o objeto após um tempo
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const downloadReport = () => {
    if (!closureReport?.report) return;
    const blob = new Blob([closureReport.report], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio_fechamento_${closureReport.sessionId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin inline-block text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Carregando caixa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Caixa</h1>
        <p className="text-gray-600 mt-1">Gerenciar abertura, fechamento e movimentações de caixa</p>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div
          className={`flex items-center gap-3 px-4 py-4 rounded-lg border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span className="text-xl flex-shrink-0">
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Session Header */}
      <SessionHeader session={session} totais={totais} />

      {!session && closureReport && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Caixa fechado</h3>
              <p className="text-sm text-gray-600">O caixa foi encerrado. Abra um novo caixa para registrar dinheiro novamente.</p>
            </div>
            <button
              type="button"
              onClick={handlePrintClosureReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              🖨️ Imprimir relatório
            </button>
          </div>

          <pre className="mt-4 bg-gray-50 p-4 rounded whitespace-pre-wrap font-mono">{closureReport.report}</pre>

          {/* Fallback actions de impressão — disponíveis para todos os navegadores */}
          <div className="flex gap-2 mt-2">
            <button onClick={openReportInNewTab} className="px-3 py-2 rounded bg-blue-600 text-white">Abrir em nova aba</button>
            <button onClick={downloadReport} className="px-3 py-2 rounded bg-green-600 text-white">Baixar relatório</button>
          </div>
        </div>
      )}

      {/* Totais por Forma */}
      {totais && <TotaisPorForma totais={totais} />}

      {/* Action Buttons */}
      <ActionButtons
        sessionOpen={!!session}
        onMovimentacao={(tipo) => setMovimentacaoModal({ open: true, tipo })}
        onFechar={() => setCloseCaixaModal(true)}
        onPrintReport={handlePrintClosureReport}
        closureReport={closureReport}
        loading={actionLoading}
      />

      {/* Debug: Forçar fechamento (apenas em dev) */}
      {/* debug button removed */}

      {/* Modals */}
      {/* Modal de impressão */}
      {printModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setPrintModalOpen(false)} />
          <div className="relative bg-white w-full max-w-3xl mx-4 rounded shadow-lg p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Pré-visualizar Relatório de Fechamento</h3>
              <button onClick={() => setPrintModalOpen(false)} className="text-gray-500 hover:text-gray-800">Fechar</button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-auto bg-gray-50 p-4 rounded font-mono whitespace-pre-wrap">
              {closureReport?.report}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={openReportInNewTab} className="px-3 py-2 rounded bg-blue-600 text-white">Abrir em nova aba</button>
              <button onClick={downloadReport} className="px-3 py-2 rounded bg-green-600 text-white">Baixar relatório</button>
              <button onClick={printReportFromModal} className="px-3 py-2 rounded bg-slate-900 text-white">Imprimir</button>
            </div>
          </div>
        </div>
      )}
      <MovimentacaoModal
        isOpen={movimentacaoModal.open}
        onClose={() => setMovimentacaoModal({ open: false, tipo: null })}
        onSubmit={handleMovimentacaoSubmit}
        tipoMovimentacao={movimentacaoModal.tipo}
        loading={actionLoading}
      />

      <CloseCaixaModal
        isOpen={closeCaixaModal}
        onClose={() => setCloseCaixaModal(false)}
        onSubmit={handleCloseCaxa}
        loading={actionLoading}
        valorEsperado={valorEsperado}
      />
    </div>
  );
};

export default CaixaAtual;
