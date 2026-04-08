import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, functions } from "@/config/firebaseConfig";
import { httpsCallable } from "firebase/functions";

/**
 * Busca a configuração fiscal de um restaurante.
 * @param {string} idRestaurante
 * @returns {Promise<object|null>}
 */
export async function buscarConfigFiscal(idRestaurante) {
  const ref = doc(db, "restaurantes", idRestaurante);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data()?.configFiscal ?? null;
}

/**
 * Salva (merge) a configuração fiscal no documento do restaurante.
 * @param {string} idRestaurante
 * @param {object} configFiscal
 */
export async function salvarConfigFiscal(idRestaurante, configFiscal) {
  const ref = doc(db, "restaurantes", idRestaurante);
  await setDoc(ref, { configFiscal }, { merge: true });
}

/**
 * Retorna a configuração fiscal padrão (template vazio).
 */
export function getConfigFiscalPadrao() {
  return {
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    inscricaoEstadual: "",
    inscricaoMunicipal: "",
    fone: "",
    email: "",
    crt: 1, // 1=Simples Nacional
    endereco: {
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      municipio: "",
      codigoMunicipio: "",
      uf: "",
      cep: "",
    },
    nfce: {
      csc: "",
      idCsc: "",
      ambiente: "homologacao",
      crt: 1,
      serie: "1",
      proximoNumero: 1,
      logotipo: true,
      nome_fantasia: true,
      mensagem_rodape: "",
      resumido: false,
      qrcode_lateral: false,
      largura: 80,
      margem: "2",
    },
    ncmPadrao: "",
    ativo: false,
    empresaRegistrada: false,
  };
}

/**
 * Busca endereço por CEP na Nuvem Fiscal via Firebase Function.
 * @param {string} idRestaurante
 * @param {string} cep - CEP sem máscara
 * @returns {Promise<object|null>}
 */
export async function buscarEnderecoPorCep(idRestaurante, cep) {
  const cepLimpo = String(cep || "").replace(/\D/g, "");
  if (!idRestaurante || cepLimpo.length !== 8) return null;

  try {
    const fn = httpsCallable(functions, "nfceConsultarCep");
    const result = await fn({ idRestaurante, cep: cepLimpo });
    return result?.data?.mappedAddress || null;
  } catch {
    return null;
  }
}

/**
 * Consulta dados da empresa por CNPJ na Nuvem Fiscal via Firebase Function.
 * @param {string} idRestaurante
 * @param {string} cnpj - CNPJ com ou sem máscara
 * @returns {Promise<object|null>}
 */
export async function buscarDadosEmpresaPorCnpj(idRestaurante, cnpj) {
  const cnpjLimpo = String(cnpj || "").replace(/\D/g, "");
  if (!idRestaurante || cnpjLimpo.length !== 14) return null;

  try {
    const fn = httpsCallable(functions, "nfceConsultarCnpj");
    const result = await fn({ idRestaurante, cnpj: cnpjLimpo });
    return result?.data?.mappedConfig || null;
  } catch {
    return null;
  }
}
