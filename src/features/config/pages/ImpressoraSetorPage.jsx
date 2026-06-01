import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { doc, getDoc } from "firebase/firestore";
import { db } from '@/config/firebaseConfig';
import {
  createImpressoraSetor,
  createSetorProducao,
  deleteImpressoraSetor,
  deleteSetorProducao,
  getImpressorasSetor,
  getSetoresProducao,
  updateImpressoraSetor,
  updateSetorProducao,
} from "@/features/config/services/producaoService";
import { getCategoriaNomes } from "@/features/config/services/CategoriasService";
import { getAll } from "@/services/firebase/firestoreService";
import { fetchAvailablePrinters, testSystemPrinter } from "@/services/printService";
import { Printer, Building03, TrashFull } from "react-coolicons";

const setorInicial = { nome: "", ativo: true };
const impressoraInicial = {
  nome: "",
  tipo: "TERMICA",
  ip: "",
  porta: "9100",
  setorId: "",
  larguraBobina: "80mm",
  systemPrinter: "",
  printerSystemName: "",
  ativa: true,
};

const tipoOptions = ["TERMICA", "REDE", "USB", "BLUETOOTH"];
const larguraOptions = ["58mm", "80mm"];

const ImpressoraSetorPage = () => {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  const [restauranteNome, setRestauranteNome] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingSetor, setSavingSetor] = useState(false);
  const [savingImpressora, setSavingImpressora] = useState(false);
  const [setores, setSetores] = useState([]);
  const [impressoras, setImpressoras] = useState([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState([]);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [itemCountBySetor, setItemCountBySetor] = useState({});
  const [editandoSetor, setEditandoSetor] = useState(null);
  const [editandoImpressora, setEditandoImpressora] = useState(null);
  const [formSetor, setFormSetor] = useState(setorInicial);
  const [formImpressora, setFormImpressora] = useState(impressoraInicial);

  const setoresAtivos = useMemo(() => setores.filter((setor) => setor.ativo !== false), [setores]);

  const carregarDados = async () => {
    if (!idRestaurante) return;
    setLoading(true);
    try {
      const [setoresData, impressorasData, itensData, categoriasNomes] = await Promise.all([
        getSetoresProducao(idRestaurante),
        getImpressorasSetor(idRestaurante),
        getAll(idRestaurante, "itens", { orderByField: "nome", order: "asc" }),
        getCategoriaNomes(idRestaurante, { unique: true, sort: true }),
      ]);

      const countMap = (itensData || []).reduce((acc, item) => {
        if (!item.setorId) return acc;
        acc[item.setorId] = (acc[item.setorId] || 0) + 1;
        return acc;
      }, {});

      setSetores(setoresData || []);
      setImpressoras(impressorasData || []);
      setItemCountBySetor(countMap);
      setCategoriasDisponiveis(Array.isArray(categoriasNomes) ? categoriasNomes : []);
    } catch (error) {
      console.error("Erro ao carregar configuração de produção:", error);
      notify("Erro ao carregar setores e impressoras", "error");
    } finally {
      setLoading(false);
    }
  };

  const carregarImpressorasSistema = async () => {
    setLoadingPrinters(true);
    try {
      const printers = await fetchAvailablePrinters();
      setAvailablePrinters(Array.isArray(printers) ? printers : []);
    } catch (error) {
      console.error("Erro ao carregar impressoras do sistema:", error);
      setAvailablePrinters([]);
      notify(error.message || "Falha ao conectar impressora", "error");
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRestaurante]);

  useEffect(() => {
    // Carrega as impressoras locais uma vez ao abrir a tela.
    carregarImpressorasSistema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchNome() {
      if (!idRestaurante) {
        setRestauranteNome("");
        return;
      }
      try {
        const ref = doc(db, "restaurantes", idRestaurante);
        const snap = await getDoc(ref);
        if (mounted && snap.exists()) setRestauranteNome(snap.data().nome || "");
      } catch (err) {
        console.warn('Erro ao carregar nome do restaurante', err?.message || err);
      }
    }
    fetchNome();
    return () => {
      mounted = false;
    };
  }, [idRestaurante]);

  const resetSetor = () => {
    setEditandoSetor(null);
    setFormSetor(setorInicial);
  };

  const resetImpressora = () => {
    setEditandoImpressora(null);
    setFormImpressora({ ...impressoraInicial, setorId: setoresAtivos[0]?.id || "" });
  };

  useEffect(() => {
    if (!editandoImpressora && setoresAtivos.length > 0 && !formImpressora.setorId) {
      setFormImpressora((prev) => ({ ...prev, setorId: setoresAtivos[0].id }));
    }
  }, [editandoImpressora, setoresAtivos, formImpressora.setorId]);

  const salvarSetor = async (e) => {
    e.preventDefault();
    if (!formSetor.nome.trim()) {
      notify("Informe o nome do setor", "warning");
      return;
    }

    try {
      setSavingSetor(true);
      if (editandoSetor) {
        await updateSetorProducao(idRestaurante, editandoSetor.id, formSetor);
        notify("Setor atualizado com sucesso", "success");
      } else {
        await createSetorProducao(idRestaurante, formSetor);
        notify("Setor criado com sucesso", "success");
      }
      resetSetor();
      await carregarDados();
    } catch (error) {
      console.error(error);
      notify(error.message || "Erro ao salvar setor", "error");
    } finally {
      setSavingSetor(false);
    }
  };

  const salvarImpressora = async (e) => {
    e.preventDefault();
    if (!formImpressora.nome.trim()) {
      notify("Informe o nome da impressora", "warning");
      return;
    }
    if (!formImpressora.setorId) {
      notify("Selecione um setor de produção", "warning");
      return;
    }

    try {
      setSavingImpressora(true);
      if (editandoImpressora) {
        await updateImpressoraSetor(idRestaurante, editandoImpressora.id, formImpressora);
        notify("Impressora atualizada com sucesso", "success");
      } else {
        await createImpressoraSetor(idRestaurante, formImpressora);
        notify("Impressora criada com sucesso", "success");
      }
      resetImpressora();
      await carregarDados();
    } catch (error) {
      console.error(error);
      notify(error.message || "Erro ao salvar impressora", "error");
    } finally {
      setSavingImpressora(false);
    }
  };

  const confirmarExclusaoSetor = async (setor) => {
    const itensVinculados = Number(itemCountBySetor[setor.id] || 0);
    const impressorasVinculadas = impressoras.filter((impressora) => impressora.setorId === setor.id).length;

    if (itensVinculados > 0 || impressorasVinculadas > 0) {
      notify(
        `Não é possível excluir este setor porque há ${itensVinculados} produto(s) e ${impressorasVinculadas} impressora(s) vinculados.`,
        "warning"
      );
      return;
    }

    if (!window.confirm(`Excluir o setor ${setor.nome}?`)) return;

    try {
      await deleteSetorProducao(idRestaurante, setor.id);
      notify("Setor excluído com sucesso", "success");
      await carregarDados();
    } catch (error) {
      console.error(error);
      notify("Erro ao excluir setor", "error");
    }
  };

  const confirmarExclusaoImpressora = async (impressora) => {
    if (!window.confirm(`Excluir a impressora ${impressora.nome}?`)) return;
    try {
      await deleteImpressoraSetor(idRestaurante, impressora.id);
      notify("Impressora excluída com sucesso", "success");
      await carregarDados();
    } catch (error) {
      console.error(error);
      notify("Erro ao excluir impressora", "error");
    }
  };

  const handleTesteImpressao = async (impressora) => {
    const printerName = impressora?.printerSystemName || impressora?.systemPrinter || "";

    if (!printerName) {
      notify("Selecione uma impressora do sistema operacional", "warning");
      return;
    }

    try {
      await testSystemPrinter(printerName);
      notify("Impressão enviada com sucesso", "success");
    } catch (error) {
      console.error(error);
      notify(error.message || "Falha ao conectar impressora", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 shadow-sm">
              <Printer size={14} />
              Configurações de produção
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Impressora por setor</h1>
            {restauranteNome && <p className="mt-1 text-sm font-medium text-amber-700">{restauranteNome}</p>}
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
              Configure setores de produção, vincule produtos ao setor correto e cadastre impressoras para preparar o roteamento automático dos pedidos.
            </p>
          </div>
          
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Setores de Produção</h2>
              <p className="text-sm text-gray-600">Cozinha, bar, churrasqueira, balcão, sobremesas e outros.</p>
            </div>
            <Building03 className="text-amber-500" size={24} />
          </div>

          <form onSubmit={salvarSetor} className="space-y-4 rounded-xl bg-gray-50 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome do setor</label>
              <input
                type="text"
                value={formSetor.nome}
                onChange={(e) => setFormSetor((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Ex: Cozinha"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formSetor.ativo}
                onChange={(e) => setFormSetor((prev) => ({ ...prev, ativo: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Setor ativo
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Categorias vinculadas</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoriasDisponiveis.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma categoria encontrada. Cadastre categorias no cardápio.</p>
                ) : (
                  categoriasDisponiveis.map((categoria) => {
                    const checked = Array.isArray(formSetor.categorias) && formSetor.categorias.includes(categoria);
                    return (
                      <label key={categoria} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-amber-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setFormSetor((prev) => {
                              const categorias = Array.isArray(prev.categorias) ? prev.categorias.slice() : [];
                              if (categorias.includes(categoria)) {
                                return { ...prev, categorias: categorias.filter((c) => c !== categoria) };
                              }
                              categorias.push(categoria);
                              return { ...prev, categorias };
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{categoria}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Ex.: bebidas → Balcão, massas → Cozinha.</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              {editandoSetor && (
                <button type="button" onClick={resetSetor} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Cancelar edição
                </button>
              )}
              <button
                type="submit"
                disabled={savingSetor}
                className="rounded-lg bg-primary-dynamic px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingSetor ? "Salvando..." : editandoSetor ? "Salvar alterações" : "Criar setor"}
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-700">
                <tr>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Categorias</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {setores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhum setor cadastrado</td>
                  </tr>
                ) : (
                  setores.map((setor, index) => (
                    <tr key={setor.id} className={index % 2 === 1 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-4 py-3 font-medium text-gray-900">{setor.nome}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(setor.categorias) && setor.categorias.length > 0)
                            ? setor.categorias.map((categoria) => (
                                <span key={categoria} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                  {categoria}
                                </span>
                              ))
                            : <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${setor.ativo !== false ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                          {setor.ativo !== false ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoSetor(setor);
                              setFormSetor({ nome: setor.nome || "", ativo: setor.ativo !== false, categorias: Array.isArray(setor.categorias) ? setor.categorias : [] });
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmarExclusaoSetor(setor)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <TrashFull size={14} />
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Impressoras por setor</h2>
              <p className="text-sm text-gray-600">Vincule uma impressora a um setor de produção.</p>
            </div>
            <Printer className="text-amber-500" size={24} />
          </div>

          <form onSubmit={salvarImpressora} className="space-y-4 rounded-xl bg-gray-50 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome da impressora</label>
              <input
                type="text"
                value={formImpressora.nome}
                onChange={(e) => setFormImpressora((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Ex: Impressora Cozinha"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={formImpressora.tipo}
                  onChange={(e) => setFormImpressora((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  {tipoOptions.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Setor</label>
                <select
                  value={formImpressora.setorId}
                  onChange={(e) => setFormImpressora((prev) => ({ ...prev, setorId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  <option value="">Selecione</option>
                  {setoresAtivos.map((setor) => (
                    <option key={setor.id} value={setor.id}>{setor.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">IP / host</label>
                <input
                  type="text"
                  value={formImpressora.ip}
                  onChange={(e) => setFormImpressora((prev) => ({ ...prev, ip: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="Ex: 192.168.0.50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Porta</label>
                <input
                  type="number"
                  value={formImpressora.porta}
                  onChange={(e) => setFormImpressora((prev) => ({ ...prev, porta: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="9100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Impressora do S.O.</p>
                  <p className="text-xs text-gray-600">
                    Selecione a impressora instalada no computador para este setor de produção.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={carregarImpressorasSistema}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                  disabled={loadingPrinters}
                >
                  {loadingPrinters ? "Carregando..." : "Atualizar impressoras"}
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Impressora do sistema operacional</label>
                  <select
                    value={formImpressora.printerSystemName || formImpressora.systemPrinter || ""}
                    onChange={(e) => setFormImpressora((prev) => ({
                      ...prev,
                      systemPrinter: e.target.value,
                      printerSystemName: e.target.value,
                    }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    <option value="">Selecione uma impressora</option>
                    {availablePrinters.map((printer) => (
                      <option key={printer.name} value={printer.name}>
                        {printer.name}{printer.default ? " (padrão)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {(formImpressora.printerSystemName || formImpressora.systemPrinter) && (
                  <button
                    type="button"
                    onClick={() => setFormImpressora((prev) => ({ ...prev, systemPrinter: "", printerSystemName: "" }))}
                    className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>

              {!loadingPrinters && availablePrinters.length === 0 && (
                <p className="mt-3 text-xs text-amber-700">
                  Nenhuma impressora foi detectada. Verifique se o MesaFacil Print Service está ativo e se o navegador permite chamadas locais.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Largura da bobina</label>
                <select
                  value={formImpressora.larguraBobina}
                  onChange={(e) => setFormImpressora((prev) => ({ ...prev, larguraBobina: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  {larguraOptions.map((largura) => (
                    <option key={largura} value={largura}>{largura}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 pt-7 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formImpressora.ativa}
                  onChange={(e) => setFormImpressora((prev) => ({ ...prev, ativa: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                Impressora ativa
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              {editandoImpressora && (
                <button type="button" onClick={resetImpressora} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Cancelar edição
                </button>
              )}
              <button
                type="submit"
                disabled={savingImpressora}
                className="rounded-lg bg-primary-dynamic px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingImpressora ? "Salvando..." : editandoImpressora ? "Salvar alterações" : "Criar impressora"}
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-700">
                <tr>
                  <th className="px-4 py-3">Impressora</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Impressora S.O.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {impressoras.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhuma impressora cadastrada</td>
                  </tr>
                ) : (
                  impressoras.map((impressora, index) => {
                    const setor = setores.find((item) => item.id === impressora.setorId);
                    return (
                      <tr key={impressora.id} className={index % 2 === 1 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-4 py-3 font-medium text-gray-900">{impressora.nome}</td>
                        <td className="px-4 py-3 text-gray-700">{setor?.nome || "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{impressora.tipo}</td>
                        <td className="px-4 py-3 text-gray-700">{impressora.printerSystemName || impressora.systemPrinter || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${impressora.ativa !== false ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                            {impressora.ativa !== false ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditandoImpressora(impressora);
                                setFormImpressora({
                                  nome: impressora.nome || "",
                                  tipo: impressora.tipo || "TERMICA",
                                  ip: impressora.ip || "",
                                  porta: impressora.porta ?? "9100",
                                  setorId: impressora.setorId || "",
                                  larguraBobina: impressora.larguraBobina || "80mm",
                                  systemPrinter: impressora.printerSystemName || impressora.systemPrinter || "",
                                  printerSystemName: impressora.printerSystemName || impressora.systemPrinter || "",
                                  ativa: impressora.ativa !== false,
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTesteImpressao(impressora)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                            >
                              Teste
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmarExclusaoImpressora(impressora)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              <TrashFull size={14} />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-900">Base pronta para o roteamento de produção</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-blue-900">
          <div className="rounded-xl bg-white p-4 border border-blue-100">1. Produto recebe <span className="font-semibold">setorId</span>.</div>
          <div className="rounded-xl bg-white p-4 border border-blue-100">2. Pedido pode ser agrupado por setor.</div>
        </div>
      </section>
    </div>
  );
};

export default ImpressoraSetorPage;