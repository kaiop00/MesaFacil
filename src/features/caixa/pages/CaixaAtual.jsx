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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [movimentacaoModal, setMovimentacaoModal] = useState({ open: false, tipo: null });
  const [closeCaixaModal, setCloseCaixaModal] = useState(false);

  useEffect(() => {
    if (!idRestaurante || !user) return;
    
    const load = async () => {
      setLoading(true);
      try {
        const aberto = await caixaService.getOpenSession(idRestaurante);
        setSession(aberto);
        if (aberto) {
          const calc = await caixaService.calcularTotaisSessao(idRestaurante, aberto.id);
          setTotais(calc);
        } else {
          setTotais(null);
        }
      } catch (error) {
        console.error('Erro ao carregar caixa:', error);
        showToast('error', 'Erro ao carregar caixa');
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
        setTotais(null);
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
    try {
      const res = await caixaService.fecharCaixa({
        empresaId: idRestaurante,
        usuarioId: user?.uid,
        caixaSessionId: session.id,
        valorInformadoFechamento: valorContado,
      });

      const rel = await caixaService.gerarRelatorioFechamento(idRestaurante, session.id);

      const novaAba = window.open('', '_blank', 'noopener,noreferrer');
      if (novaAba) {
        novaAba.document.write('<pre style="font-family: monospace; white-space: pre-wrap;">' + rel + '</pre>');
        novaAba.document.close();
      } else {
        console.warn('Popup bloqueado ao abrir o relatório de fechamento.');
      }

      setCloseCaixaModal(false);
      await reloadData();
      showToast('success', `Caixa fechado. Diferença: R$ ${res.diferenca.toFixed(2)}`);
    } catch (error) {
      showToast('error', 'Erro ao fechar caixa: ' + error.message);
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

      {/* Totais por Forma */}
      {totais && <TotaisPorForma totais={totais} />}

      {/* Action Buttons */}
      <ActionButtons
        sessionOpen={!!session}
        onMovimentacao={(tipo) => setMovimentacaoModal({ open: true, tipo })}
        onFechar={() => setCloseCaixaModal(true)}
        loading={actionLoading}
      />

      {/* Modals */}
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
