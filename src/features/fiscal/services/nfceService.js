import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebaseConfig";
import { NFCE_MOCKS } from "@/features/fiscal/mocks/nfceMocks";

const isMockByQueryParam = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mockNfce") === "1";
};

const shouldUseNfceMocks = () => import.meta.env.VITE_USE_NFCE_MOCKS === "true" || isMockByQueryParam();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockEmissionState = {
  emittedNfces: [],
};

const simulateEmission = async (cpfConsumidor) => {
  await sleep(500);
  
  const numero = Math.floor(Math.random() * 999999) + 1;
  
  // Decida aleatoriamente se autoriza ou rejeita (70% autorizado, 30% rejeitado)
  const isAuthorized = Math.random() > 0.3;
  
  if (isAuthorized) {
    const nfceId = `mock_nfce_${Date.now()}`;
    const resultado = {
      success: true,
      nfceId,
      nfceStatus: "autorizado",
      chaveAcesso: `35${new Date().toISOString().slice(2, 8).replace(/-/g, "")}${Math.random().toString().slice(2, 30).padEnd(20, "0")}`,
      linkDanfce: `https://example.com/danfce/${numero}.pdf`,
      numero,
    };
    
    mockEmissionState.emittedNfces.push(resultado);
    return resultado;
  } else {
    const erros = [
      "Série inválida para este ambiente",
      "Certificado digital inválido",
      "Falha na validação do CPF/CNPJ",
      "Contingência ativa - operação não permitida",
      "Duplicidade de NFC-e detectada",
    ];
    
    const nfceId = `mock_nfce_${Date.now()}`;
    return {
      success: false,
      nfceId,
      nfceStatus: "rejeitado",
      error: erros[Math.floor(Math.random() * erros.length)],
      numero,
    };
  }
};

const simulateConsult = async (nfceId) => {
  await sleep(350);
  
  // Verifica se é um mock emitido
  const emitted = mockEmissionState.emittedNfces.find((n) => n.nfceId === nfceId);
  
  if (emitted) {
    return {
      id: nfceId,
      status: "autorizado",
      chave: emitted.chaveAcesso,
      numero: emitted.numero,
    };
  }
  
  // Caso contrário, tenta uma consulta aleatória dos mocks principais
  const randomMock = Object.values(NFCE_MOCKS)[Math.floor(Math.random() * Object.keys(NFCE_MOCKS).length)];
  return {
    id: nfceId,
    status: randomMock.status,
    chave: randomMock.chave,
    numero: randomMock.numero,
    mensagem: "Consulta em modo mock",
  };
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    const base64 = result.includes(",") ? result.split(",")[1] : "";
    resolve(base64);
  };
  reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo do certificado"));
  reader.readAsDataURL(file);
});

/**
 * Registra a empresa do restaurante na Nuvem Fiscal.
 * Chama a Firebase Function `nfceRegistrarEmpresa`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function registrarEmpresa({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceRegistrarEmpresa");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Consulta a empresa do restaurante na Nuvem Fiscal.
 * Chama a Firebase Function `nfceConsultarEmpresa`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<{success:boolean, exists:boolean, empresa:object|null}>}
 */
export async function consultarEmpresa({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceConsultarEmpresa");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Atualiza os dados da empresa do restaurante na Nuvem Fiscal.
 * Chama a Firebase Function `nfceAlterarEmpresa`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function alterarEmpresa({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceAlterarEmpresa");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Deleta a empresa do restaurante na Nuvem Fiscal.
 * Chama a Firebase Function `nfceDeletarEmpresa`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function deletarEmpresa({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceDeletarEmpresa");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Configura os parâmetros de NFC-e da empresa já registrada na Nuvem Fiscal.
 * Chama a Firebase Function `nfceConfigurarEmpresa`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function configurarEmpresaNfce({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceConfigurarEmpresa");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Consulta a configuração de NFC-e cadastrada na Nuvem Fiscal.
 * Chama a Firebase Function `nfceConsultarConfigNfce`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<{success:boolean, exists:boolean, config:object|null}>}
 */
export async function consultarConfiguracaoNfce({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceConsultarConfigNfce");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Consulta certificado digital cadastrado para a empresa na Nuvem Fiscal.
 * Chama a Firebase Function `nfceConsultarCertificado`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<{success:boolean, exists:boolean, certificate:object|null}>}
 */
export async function consultarCertificadoDigital({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceConsultarCertificado");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Envia certificado digital (.pfx/.p12) para a Nuvem Fiscal.
 * Chama a Firebase Function `nfceUploadCertificado`.
 * @param {{ idRestaurante: string, file: File }} params
 * @returns {Promise<object>}
 */
export async function enviarCertificadoDigital({ idRestaurante, file, password }) {
  if (!file) {
    throw new Error("Arquivo de certificado nao informado");
  }
  if (!password?.trim()) {
    throw new Error("Senha do certificado nao informada");
  }

  const fileBase64 = await fileToBase64(file);
  const fn = httpsCallable(functions, "nfceUploadCertificado");
  const result = await fn({
    idRestaurante,
    fileName: file.name,
    fileBase64,
    password: password.trim(),
  });
  return result.data;
}

/**
 * Remove certificado digital da empresa na Nuvem Fiscal.
 * Chama a Firebase Function `nfceDeletarCertificado`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function deletarCertificadoDigital({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceDeletarCertificado");
  const result = await fn({ idRestaurante });
  return result.data;
}

/**
 * Emite uma NFC-e para um pedido.
 * Chama a Firebase Function `nfceEmitir`.
 * @param {{ idRestaurante: string, mesaId: string, pedidoId: string, cpfConsumidor?: string }} params
 * @returns {Promise<object>} { success, nfceId, chaveAcesso, status }
 */
export async function emitirNfce({ idRestaurante, mesaId, pedidoId, cpfConsumidor }) {
  if (shouldUseNfceMocks()) {
    return simulateEmission(cpfConsumidor);
  }

  const fn = httpsCallable(functions, "nfceEmitir");
  const result = await fn({ idRestaurante, mesaId, pedidoId, cpfConsumidor: cpfConsumidor || null });
  return result.data;
}

/**
 * Consulta o status de uma NFC-e emitida.
 * Chama a Firebase Function `nfceConsultar`.
 * @param {{ idRestaurante: string, nfceId: string }} params
 * @returns {Promise<object>}
 */
export async function consultarNfce({ idRestaurante, nfceId }) {
  if (shouldUseNfceMocks()) {
    return simulateConsult(nfceId);
  }

  const fn = httpsCallable(functions, "nfceConsultar");
  const result = await fn({ idRestaurante, nfceId });
  return result.data;
}

/**
 * Baixa o PDF do DANFC-e para uma NFC-e autorizada.
 * Chama a Firebase Function `nfceBaixarPdfDanfce`.
 * @param {{
 *   idRestaurante: string,
 *   nfceId: string,
 *   options?: {
 *     logotipo?: boolean,
 *     nome_fantasia?: boolean,
 *     mensagem_rodape?: string,
 *     resumido?: boolean,
 *     qrcode_lateral?: boolean,
 *     largura?: number,
 *     margem?: string,
 *   }
 * }} params
 * @returns {Promise<{success:boolean, nfceId:string, fileName:string, contentType:string, pdfBase64:string, bytes:number}>}
 */
export async function baixarPdfDanfce({ idRestaurante, nfceId, options = {} }) {
  if (shouldUseNfceMocks()) {
    return {
      success: true,
      nfceId,
      fileName: `danfce-${nfceId || "mock"}.pdf`,
      contentType: "application/pdf",
      pdfBase64: "",
      bytes: 0,
      mockUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    };
  }

  const fn = httpsCallable(functions, "nfceBaixarPdfDanfce");
  const result = await fn({ idRestaurante, nfceId, options });
  return result.data;
}

/**
 * Gera uma prévia em PDF do DANFC-e a partir do pedido atual.
 * Chama a Firebase Function `nfcePreviaPdfDanfce`.
 * @param {{ idRestaurante: string, mesaId: string, pedidoId: string, cpfConsumidor?: string, options?: object }} params
 * @returns {Promise<{success:boolean, pedidoId:string, fileName:string, contentType:string, pdfBase64:string, bytes:number}>}
 */
export async function visualizarPreviaDanfce({ idRestaurante, mesaId, pedidoId, cpfConsumidor, options = {} }) {
  if (shouldUseNfceMocks()) {
    return {
      success: true,
      pedidoId,
      fileName: `danfce-previa-${pedidoId || "mock"}.pdf`,
      contentType: "application/pdf",
      pdfBase64: "",
      bytes: 0,
      mockUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    };
  }

  const fn = httpsCallable(functions, "nfcePreviaPdfDanfce");
  const result = await fn({ idRestaurante, mesaId, pedidoId, cpfConsumidor: cpfConsumidor || null, options });
  return result.data;
}

/**
 * Consulta dados de CNPJ via Nuvem Fiscal.
 * Chama a Firebase Function `nfceConsultarCnpj`.
 * @param {{ idRestaurante: string, cnpj: string }} params
 * @returns {Promise<object>}
 */
export async function consultarCnpjNuvemFiscal({ idRestaurante, cnpj }) {
  const fn = httpsCallable(functions, "nfceConsultarCnpj");
  const result = await fn({ idRestaurante, cnpj });
  return result.data;
}

/**
 * Consulta CEP via Nuvem Fiscal.
 * Chama a Firebase Function `nfceConsultarCep`.
 * @param {{ idRestaurante: string, cep: string }} params
 * @returns {Promise<object>}
 */
export async function consultarCepNuvemFiscal({ idRestaurante, cep }) {
  const fn = httpsCallable(functions, "nfceConsultarCep");
  const result = await fn({ idRestaurante, cep });
  return result.data;
}

/**
 * Sincroniza CRT (Código de Regime Tributário) com SEFAZ.
 * Chama a Firebase Function `nfceSincronizarCrt`.
 * @param {{ idRestaurante: string }} params
 * @returns {Promise<object>}
 */
export async function sincronizarCrtComSefaz({ idRestaurante }) {
  const fn = httpsCallable(functions, "nfceSincronizarCrt");
  const result = await fn({ idRestaurante });
  return result.data;
}
