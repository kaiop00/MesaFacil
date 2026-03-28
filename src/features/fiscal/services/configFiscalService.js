import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

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
      serie: "1",
      proximoNumero: 1,
    },
    ncmPadrao: "",
    ativo: false,
    empresaRegistrada: false,
  };
}

/**
 * Busca endereço por CEP usando a API ViaCEP.
 * @param {string} cep - CEP sem máscara
 * @returns {Promise<object|null>}
 */
export async function buscarEnderecoPorCep(cep) {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    if (data.erro) return null;

    return {
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      municipio: data.localidade || "",
      codigoMunicipio: data.ibge || "",
      uf: data.uf || "",
      complemento: data.complemento || "",
    };
  } catch {
    return null;
  }
}
