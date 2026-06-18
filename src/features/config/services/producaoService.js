import { create, getAll, remove, update } from "@/services/firebase/firestoreService";

const SETORES_COLL = "setoresProducao";
const IMPRESSORAS_COLL = "impressorasSetor";

export const getSetoresProducao = async (idRestaurante) => {
  return await getAll(idRestaurante, SETORES_COLL, { orderByField: "nome", order: "asc" });
};

export const createSetorProducao = async (idRestaurante, data) => {
  return await create(idRestaurante, SETORES_COLL, {
    nome: String(data.nome || "").trim(),
    ativo: Boolean(data.ativo),
    categorias: Array.isArray(data.categorias)
      ? data.categorias.map((categoria) => String(categoria || "").trim()).filter(Boolean)
      : [],
  });
};

export const updateSetorProducao = async (idRestaurante, setorId, data) => {
  await update(idRestaurante, SETORES_COLL, setorId, {
    nome: String(data.nome || "").trim(),
    ativo: Boolean(data.ativo),
    categorias: Array.isArray(data.categorias)
      ? data.categorias.map((categoria) => String(categoria || "").trim()).filter(Boolean)
      : [],
  });
};

export const deleteSetorProducao = async (idRestaurante, setorId) => {
  await remove(idRestaurante, SETORES_COLL, setorId);
};

export const getImpressorasSetor = async (idRestaurante) => {
  return await getAll(idRestaurante, IMPRESSORAS_COLL, { orderByField: "nome", order: "asc" });
};

export const createImpressoraSetor = async (idRestaurante, data) => {
  return await create(idRestaurante, IMPRESSORAS_COLL, {
    nome: String(data.nome || "").trim(),
    tipo: data.tipo || "TERMICA",
    ip: String(data.ip || "").trim(),
    systemPrinter: String(data.systemPrinter || "").trim(),
    porta: data.porta ? Number(data.porta) : null,
    setorId: data.setorId || "",
    larguraBobina: data.larguraBobina || "80mm",
    ativa: Boolean(data.ativa),
  });
};

export const updateImpressoraSetor = async (idRestaurante, impressoraId, data) => {
  await update(idRestaurante, IMPRESSORAS_COLL, impressoraId, {
    nome: String(data.nome || "").trim(),
    tipo: data.tipo || "TERMICA",
    ip: String(data.ip || "").trim(),
    systemPrinter: String(data.systemPrinter || "").trim(),
    porta: data.porta ? Number(data.porta) : null,
    setorId: data.setorId || "",
    larguraBobina: data.larguraBobina || "80mm",
    ativa: Boolean(data.ativa),
  });
};

export const deleteImpressoraSetor = async (idRestaurante, impressoraId) => {
  await remove(idRestaurante, IMPRESSORAS_COLL, impressoraId);
};

export const setPrintCollections = {
  setores: SETORES_COLL,
  impressoras: IMPRESSORAS_COLL,
};
