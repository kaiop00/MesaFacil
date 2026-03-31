import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import PermissionDeniedPage from "@/components/PermissionDeniedPage";
import {
  buscarConfigFiscal,
  salvarConfigFiscal,
  getConfigFiscalPadrao,
  buscarEnderecoPorCep,
  buscarDadosEmpresaPorCnpj,
} from "@/features/fiscal/services/configFiscalService";
import {
  configurarEmpresaNfce,
  registrarEmpresa,
  consultarEmpresa,
  alterarEmpresa,
  deletarEmpresa,
  consultarCertificadoDigital,
  enviarCertificadoDigital,
  deletarCertificadoDigital,
  sincronizarCrtComSefaz,
} from "@/features/fiscal/services/nfceService";
import { getFriendlyNfceError } from "@/features/fiscal/utils/nfceErrorParser";

const CRT_OPTIONS = [
  { value: 1, label: "1 – Simples Nacional" },
  { value: 2, label: "2 – Simples Nacional (excesso de sublimite)" },
  { value: 3, label: "3 – Regime Normal" },
  { value: 4, label: "4 – MEI (Microempreendedor Individual)" },
];

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
function maskCnpj(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/**
 * Aplica máscara de CEP: 00000-000
 */
function maskCep(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

const SectionTitle = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
    {children}
  </h3>
);

const InputField = ({ label, tooltip, children, required }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
      {tooltip && (
        <span className="ml-1 text-xs text-gray-400" title={tooltip}>ⓘ</span>
      )}
    </label>
    {children}
  </div>
);

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-dynamic focus:border-transparent";
const CERTIFICATE_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const CERTIFICATE_ALLOWED_EXTENSIONS = [".pfx", ".p12"];

const ConfigFiscalPage = () => {
  const { t } = useTranslation("fiscal");
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { notify } = useToast();

  const [config, setConfig] = useState(getConfigFiscalPadrao());
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [deletandoEmpresa, setDeletandoEmpresa] = useState(false);
  const [configurandoNfce, setConfigurandoNfce] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [carregandoCertificado, setCarregandoCertificado] = useState(false);
  const [enviandoCertificado, setEnviandoCertificado] = useState(false);
  const [deletandoCertificado, setDeletandoCertificado] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState(null);
  const [certificadoPassword, setCertificadoPassword] = useState("");
  const [certificadoInfo, setCertificadoInfo] = useState(null);
  const [certificadoInputKey, setCertificadoInputKey] = useState(0);
  const [crtValidation, setCrtValidation] = useState(null);
  const [sincronizandoCrt, setSincronizandoCrt] = useState(false);

  const temCertificado = Boolean(certificadoInfo);

  useEffect(() => {
    if (!idRestaurante) return;
    (async () => {
      setLoading(true);
      try {
        const data = await buscarConfigFiscal(idRestaurante);
        if (data) {
          setConfig((prev) => ({ ...prev, ...data, endereco: { ...prev.endereco, ...data.endereco }, nfce: { ...prev.nfce, ...data.nfce } }));
        }
      } catch (err) {
        console.error("Erro ao buscar config fiscal:", err);
        notify(t("messages.errorLoading"), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [idRestaurante, notify, t]);

  useEffect(() => {
    if (!idRestaurante) return;

    (async () => {
      try {
        const result = await consultarEmpresa({ idRestaurante });
        const exists = Boolean(result?.exists);
        setConfig((prev) => ({ ...prev, empresaRegistrada: exists }));
      } catch (err) {
        // Keep local state from Firestore when consult fails.
        console.warn("Nao foi possivel consultar empresa na Nuvem Fiscal:", err);
      }
    })();
  }, [idRestaurante]);

  useEffect(() => {
    if (!idRestaurante) return;
    (async () => {
      setCarregandoCertificado(true);
      try {
        const result = await consultarCertificadoDigital({ idRestaurante });
        if (result?.exists) {
          setCertificadoInfo(result.certificate || {});
        } else {
          setCertificadoInfo(null);
        }
      } catch (err) {
        console.error("Erro ao consultar certificado digital:", err);
        const msg = getFriendlyNfceError(err, t("messages.errorConsultingCertificate"));
        notify(msg, "error");
      } finally {
        setCarregandoCertificado(false);
      }
    })();
  }, [idRestaurante, notify, t]);

  const handleChange = useCallback((path, value) => {
    setConfig((prev) => {
      const keys = path.split(".");
      if (keys.length === 1) return { ...prev, [keys[0]]: value };
      if (keys.length === 2) {
        return { ...prev, [keys[0]]: { ...prev[keys[0]], [keys[1]]: value } };
      }
      return prev;
    });
  }, []);

  const handleCnpjChange = useCallback((e) => {
    handleChange("cnpj", maskCnpj(e.target.value));
  }, [handleChange]);

  const handleCnpjBlur = useCallback(async () => {
    if (!idRestaurante) return;

    const cnpjDigits = config.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) return;

    setBuscandoCnpj(true);
    try {
      const empresa = await buscarDadosEmpresaPorCnpj(idRestaurante, cnpjDigits);
      if (!empresa) {
        notify(t("messages.companyNotFoundByCnpj") || "Não foi possível encontrar dados para este CNPJ.", "warning");
        return;
      }

      setConfig((prev) => ({
        ...prev,
        cnpj: maskCnpj(empresa.cnpj || cnpjDigits),
        razaoSocial: empresa.razaoSocial || prev.razaoSocial,
        nomeFantasia: empresa.nomeFantasia || prev.nomeFantasia,
        email: empresa.email || prev.email,
        fone: empresa.fone || prev.fone,
        endereco: {
          ...prev.endereco,
          ...(empresa.endereco || {}),
          cep: maskCep(empresa.endereco?.cep || prev.endereco.cep || ""),
          numero: prev.endereco.numero || empresa.endereco?.numero || "",
          complemento: prev.endereco.complemento || empresa.endereco?.complemento || "",
        },
      }));
    } catch (err) {
      console.error("Erro ao consultar CNPJ na Nuvem Fiscal:", err);
      const msg = getFriendlyNfceError(err, t("messages.errorLoadingCompanyByCnpj") || "Erro ao consultar CNPJ.");
      notify(msg, "error");
    } finally {
      setBuscandoCnpj(false);
    }
  }, [idRestaurante, config.cnpj, notify, t]);

  const handleCepChange = useCallback(async (e) => {
    if (!idRestaurante) return;

    const masked = maskCep(e.target.value);
    handleChange("endereco.cep", masked);

    const digits = masked.replace(/\D/g, "");
    if (digits.length === 8) {
      setBuscandoCep(true);
      try {
        const endereco = await buscarEnderecoPorCep(idRestaurante, digits);
        if (endereco) {
          setConfig((prev) => ({
            ...prev,
            endereco: {
              ...prev.endereco,
              ...endereco,
              cep: masked,
              numero: prev.endereco.numero,
            },
          }));
        }
      } catch {
        // silently fail
      } finally {
        setBuscandoCep(false);
      }
    }
  }, [idRestaurante, handleChange]);

  const validarDadosEmpresa = useCallback(() => {
    const cnpjDigits = config.cnpj.replace(/\D/g, "");
    const cepDigits = config.endereco.cep?.replace(/\D/g, "") || "";

    if (cnpjDigits.length !== 14) {
      notify(t("messages.invalidCnpj"), "error");
      return false;
    }
    if (!config.razaoSocial.trim()) {
      notify(t("messages.requiredRazaoSocial"), "error");
      return false;
    }
    if (!config.email.trim()) {
      notify(t("messages.requiredEmail"), "error");
      return false;
    }
    if (cepDigits.length !== 8) {
      notify(t("messages.invalidCep"), "error");
      return false;
    }
    if (!config.endereco.logradouro?.trim()) {
      notify(t("messages.requiredLogradouro"), "error");
      return false;
    }
    if (!config.endereco.numero?.trim()) {
      notify(t("messages.requiredNumero"), "error");
      return false;
    }
    if (!config.endereco.bairro?.trim()) {
      notify(t("messages.requiredBairro"), "error");
      return false;
    }
    if (!config.endereco.codigoMunicipio) {
      notify(t("messages.requiredCodigoMunicipio"), "error");
      return false;
    }
    if (!config.endereco.uf) {
      notify(t("messages.requiredUf"), "error");
      return false;
    }

    return true;
  }, [config, notify, t]);

  const validarConfiguracaoNfce = useCallback(() => {
    if (!config.nfce?.csc?.trim() || !config.nfce?.idCsc?.trim()) {
      notify(t("messages.requiredCsc"), "error");
      return false;
    }
    return true;
  }, [config.nfce, notify, t]);

  const handleRegistrarEmpresa = async () => {
    if (!validarDadosEmpresa()) return;

    setRegistrando(true);
    try {
      // Save first
      await salvarConfigFiscal(idRestaurante, config);

      const shouldUpdate = Boolean(config.empresaRegistrada);
      const result = shouldUpdate
        ? await alterarEmpresa({ idRestaurante })
        : await registrarEmpresa({ idRestaurante });

      if (result.success) {
        setConfig((prev) => ({ ...prev, empresaRegistrada: true }));
        // Capture CRT validation from response
        if (result.crtValidation) {
          setCrtValidation(result.crtValidation);
        }
        notify(t("messages.empresaDadosRegistrados"), "success");
      } else {
        notify(getFriendlyNfceError(result?.error, t("messages.errorRegistrando")), "error");
      }
    } catch (err) {
      console.error("Erro ao registrar empresa:", err);
      const msg = getFriendlyNfceError(err, t("messages.errorRegistrando"));
      notify(msg, "error");
    } finally {
      setRegistrando(false);
    }
  };

  const handleDeletarEmpresa = async () => {
    if (!idRestaurante) return;

    const confirmacao = window.confirm(t("messages.confirmDeleteCompany") || "Tem certeza que deseja deletar a empresa na Nuvem Fiscal?");
    if (!confirmacao) return;

    setDeletandoEmpresa(true);
    try {
      await deletarEmpresa({ idRestaurante });
      setConfig((prev) => ({
        ...prev,
        empresaRegistrada: false,
        ativo: false,
      }));
      notify(t("messages.companyDeleted") || "Empresa deletada com sucesso na Nuvem Fiscal.", "success");
    } catch (err) {
      console.error("Erro ao deletar empresa:", err);
      const msg = getFriendlyNfceError(err, t("messages.errorDeletingCompany") || "Erro ao deletar empresa na Nuvem Fiscal.");
      notify(msg, "error");
    } finally {
      setDeletandoEmpresa(false);
    }
  };

  const handleConfigurarNfce = async () => {
    if (!config.empresaRegistrada) {
      notify(t("messages.registerCompanyFirst"), "error");
      return;
    }
    if (!validarDadosEmpresa()) return;
    if (!validarConfiguracaoNfce()) return;

    setConfigurandoNfce(true);
    try {
      await salvarConfigFiscal(idRestaurante, config);
      const result = await configurarEmpresaNfce({ idRestaurante });

      if (result.success) {
        setConfig((prev) => ({ ...prev, ativo: true }));
        notify(t("messages.nfceConfigurada"), "success");
      } else {
        notify(getFriendlyNfceError(result?.error, t("messages.errorConfigurandoNfce")), "error");
      }
    } catch (err) {
      console.error("Erro ao configurar NFC-e:", err);
      const msg = getFriendlyNfceError(err, t("messages.errorConfigurandoNfce"));
      notify(msg, "error");
    } finally {
      setConfigurandoNfce(false);
    }
  };

  const handleCertificadoSelecionado = useCallback((event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setCertificadoFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const formatoValido = CERTIFICATE_ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!formatoValido) {
      notify(t("messages.invalidCertificateType"), "error");
      setCertificadoFile(null);
      setCertificadoInputKey((prev) => prev + 1);
      return;
    }

    if (file.size > CERTIFICATE_MAX_SIZE_BYTES) {
      notify(t("messages.invalidCertificateSize"), "error");
      setCertificadoFile(null);
      setCertificadoInputKey((prev) => prev + 1);
      return;
    }

    setCertificadoFile(file);
  }, [notify, t]);

  const handleEnviarCertificado = async () => {
    if (!idRestaurante) return;

    if (!certificadoFile) {
      notify(t("messages.selectCertificateFile"), "error");
      return;
    }
    if (!certificadoPassword.trim()) {
      notify(t("messages.requiredCertificatePassword"), "error");
      return;
    }

    setEnviandoCertificado(true);
    try {
      const result = await enviarCertificadoDigital({
        idRestaurante,
        file: certificadoFile,
        password: certificadoPassword,
      });
      setCertificadoInfo(result?.certificate || {});
      setCertificadoFile(null);
      setCertificadoPassword("");
      setCertificadoInputKey((prev) => prev + 1);
      notify(
        temCertificado
          ? t("messages.certificateUpdated")
          : t("messages.certificateUploaded"),
        "success",
      );
    } catch (err) {
      console.error("Erro ao enviar certificado digital:", err);
      const msg = getFriendlyNfceError(err, t("messages.errorUploadingCertificate"));
      notify(msg, "error");
    } finally {
      setEnviandoCertificado(false);
    }
  };

  const handleDeletarCertificado = async () => {
    if (!idRestaurante || !temCertificado) return;

    const confirmacao = window.confirm(t("messages.confirmDeleteCertificate"));
    if (!confirmacao) return;

    setDeletandoCertificado(true);
    try {
      await deletarCertificadoDigital({ idRestaurante });
      setCertificadoInfo(null);
      setCertificadoFile(null);
      setCertificadoPassword("");
      setCertificadoInputKey((prev) => prev + 1);
      notify(t("messages.certificateDeleted"), "success");
    } catch (err) {
      console.error("Erro ao deletar certificado digital:", err);
      const msg = getFriendlyNfceError(err, t("messages.errorDeletingCertificate"));
      notify(msg, "error");
    } finally {
      setDeletandoCertificado(false);
    }
  };

  const handleSincronizarCrt = async () => {
    if (!idRestaurante) return;

    setSincronizandoCrt(true);
    try {
      const result = await sincronizarCrtComSefaz({ idRestaurante });

      if (result?.success) {
        if (result?.synchronized) {
          setConfig((prev) => ({ ...prev, crt: result?.newCrt }));
          notify(result.message, "success");
        } else {
          notify(result.message, "info");
        }
        setCrtValidation(null);
      } else {
        notify("Erro ao sincronizar CRT", "error");
      }
    } catch (err) {
      console.error("Erro ao sincronizar CRT:", err);
      const msg = getFriendlyNfceError(err, "Erro ao sincronizar CRT com SEFAZ");
      notify(msg, "error");
    } finally {
      setSincronizandoCrt(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!hasPermission("edit_config") && !hasPermission("view_fiscal")) {
    return (
      <PermissionDeniedPage
        message={t("page.noPermissionMessage") || "You do not have permission to access fiscal configuration."}
        description={t("page.contactAdmin") || "Please contact your system administrator."}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Status badge */}
      <div className="mb-6 flex items-center gap-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          config.empresaRegistrada
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}>
          {config.empresaRegistrada ? t("status.registered") : t("status.notRegistered")}
        </span>
        {config.ativo && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {t("status.active")}
          </span>
        )}
      </div>

      {/* CRT Validation Alert - CRITICAL */}
      {crtValidation && !crtValidation.match && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-600 rounded-lg p-4 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900 mb-2">
              🚨 {t("warnings.crtMismatch") || "Divergência de CRT - Ação Requerida"}
            </h3>
            <p className="text-sm text-red-700 mb-2 font-medium">
              {crtValidation.warning}
            </p>
            <p className="text-xs text-red-600 mb-3">
              ⚠️ Você NÃO poderá emitir NFC-e enquanto este problema existir. Clique no botão abaixo para sincronizar com a SEFAZ.
            </p>
            <button
              onClick={handleSincronizarCrt}
              disabled={sincronizandoCrt || registrando}
              className="px-4 py-2 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {sincronizandoCrt ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  {t("buttons.syncingCrt") || "Sincronizando..."}
                </>
              ) : (
                <>
                  <span>✓</span>
                  {t("buttons.syncCrt") || "Sincronizar CRT Agora"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Seção 1: Dados da Empresa */}
        <section>
          <SectionTitle>{t("sections.company")}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="CNPJ" required>
              <div className="relative">
                <input
                  type="text"
                  className={inputClass}
                  value={config.cnpj}
                  onChange={handleCnpjChange}
                  onBlur={handleCnpjBlur}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {buscandoCnpj && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                    {t("fields.searchingCnpj") || "Consultando CNPJ..."}
                  </span>
                )}
              </div>
            </InputField>

            <InputField label={t("fields.razaoSocial")} required>
              <input
                type="text"
                className={inputClass}
                value={config.razaoSocial}
                onChange={(e) => handleChange("razaoSocial", e.target.value)}
                placeholder={t("placeholders.razaoSocial")}
              />
            </InputField>

            <InputField label={t("fields.nomeFantasia")}>
              <input
                type="text"
                className={inputClass}
                value={config.nomeFantasia}
                onChange={(e) => handleChange("nomeFantasia", e.target.value)}
                placeholder={t("placeholders.nomeFantasia")}
              />
            </InputField>

            <InputField label={t("fields.inscricaoEstadual")}>
              <input
                type="text"
                className={inputClass}
                value={config.inscricaoEstadual}
                onChange={(e) => handleChange("inscricaoEstadual", e.target.value.replace(/\D/g, ""))}
                placeholder="000000000"
              />
            </InputField>

            <InputField label={t("fields.inscricaoMunicipal")}>
              <input
                type="text"
                className={inputClass}
                value={config.inscricaoMunicipal}
                onChange={(e) => handleChange("inscricaoMunicipal", e.target.value.replace(/\D/g, ""))}
                placeholder="000000000"
              />
            </InputField>

            <InputField label={t("fields.fone")}>
              <input
                type="text"
                className={inputClass}
                value={config.fone}
                onChange={(e) => handleChange("fone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="(00) 00000-0000"
              />
            </InputField>

            <InputField label={t("fields.email")} required>
              <input
                type="email"
                className={inputClass}
                value={config.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contato@empresa.com.br"
              />
            </InputField>

            <InputField label={t("fields.crt")} required>
              <select
                className={inputClass}
                value={config.crt}
                onChange={(e) => handleChange("crt", Number(e.target.value))}
              >
                {CRT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </InputField>
          </div>
        </section>

        {/* Seção 2: Endereço */}
        <section>
          <SectionTitle>{t("sections.address")}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="CEP" required>
              <div className="relative">
                <input
                  type="text"
                  className={inputClass}
                  value={config.endereco.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {buscandoCep && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">
                    {t("fields.searchingCep")}
                  </span>
                )}
              </div>
            </InputField>

            <InputField label={t("fields.logradouro")} required>
              <input
                type="text"
                className={inputClass}
                value={config.endereco.logradouro}
                onChange={(e) => handleChange("endereco.logradouro", e.target.value)}
              />
            </InputField>

            <InputField label={t("fields.numero")} required>
              <input
                type="text"
                className={inputClass}
                value={config.endereco.numero}
                onChange={(e) => handleChange("endereco.numero", e.target.value)}
                placeholder="123"
              />
            </InputField>

            <InputField label={t("fields.complemento")}>
              <input
                type="text"
                className={inputClass}
                value={config.endereco.complemento}
                onChange={(e) => handleChange("endereco.complemento", e.target.value)}
              />
            </InputField>

            <InputField label={t("fields.bairro")} required>
              <input
                type="text"
                className={inputClass}
                value={config.endereco.bairro}
                onChange={(e) => handleChange("endereco.bairro", e.target.value)}
              />
            </InputField>

            <InputField label={t("fields.municipio")} required>
              <input
                type="text"
                className={inputClass}
                value={config.endereco.municipio}
                onChange={(e) => handleChange("endereco.municipio", e.target.value)}
              />
            </InputField>

            <InputField label={t("fields.codigoMunicipio")} required tooltip={t("tooltips.codigoMunicipio")}>
              <input
                type="text"
                className={inputClass}
                value={config.endereco.codigoMunicipio}
                onChange={(e) => handleChange("endereco.codigoMunicipio", e.target.value.replace(/\D/g, ""))}
                placeholder="0000000"
                maxLength={7}
              />
            </InputField>

            <InputField label="UF" required>
              <select
                className={inputClass}
                value={config.endereco.uf}
                onChange={(e) => handleChange("endereco.uf", e.target.value)}
              >
                <option value="">{t("placeholders.selectUf")}</option>
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </InputField>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRegistrarEmpresa}
              disabled={registrando || configurandoNfce || deletandoEmpresa}
              className="w-full sm:flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {registrando
                ? (config.empresaRegistrada ? t("buttons.updatingCompany") || t("buttons.registering") : t("buttons.registering"))
                : config.empresaRegistrada
                  ? t("buttons.updateCompany")
                  : t("buttons.registerCompany")}
            </button>

            <button
              onClick={handleDeletarEmpresa}
              disabled={deletandoEmpresa || registrando || configurandoNfce || !config.empresaRegistrada}
              className="w-full sm:flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition disabled:opacity-50"
            >
              {deletandoEmpresa
                ? t("buttons.deletingCompany") || "Deletando Empresa..."
                : t("buttons.deleteCompany") || "Deletar Empresa"}
            </button>
          </div>
        </section>

        {/* Seção 3: Certificado Digital */}
        <section>
          <SectionTitle>{t("sections.digitalCertificate")}</SectionTitle>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <p className="text-sm text-gray-600">
              {t("certificate.description")}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                temCertificado
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {temCertificado
                  ? t("certificate.statusUploaded")
                  : t("certificate.statusMissing")}
              </span>
              {carregandoCertificado && (
                <span className="text-xs text-gray-500">{t("certificate.loading")}</span>
              )}
            </div>

            <InputField
              label={t("certificate.fileLabel")}
              tooltip={t("certificate.fileHint")}
              required
            >
              <input
                key={certificadoInputKey}
                type="file"
                className={inputClass}
                accept=".pfx,.p12,application/x-pkcs12"
                onChange={handleCertificadoSelecionado}
                disabled={enviandoCertificado || deletandoCertificado || carregandoCertificado}
              />
            </InputField>

            <InputField
              label={t("certificate.passwordLabel")}
              tooltip={t("certificate.passwordHint")}
              required
            >
              <input
                type="password"
                className={inputClass}
                value={certificadoPassword}
                onChange={(e) => setCertificadoPassword(e.target.value)}
                placeholder={t("certificate.passwordPlaceholder")}
                autoComplete="new-password"
                disabled={enviandoCertificado || deletandoCertificado || carregandoCertificado}
              />
            </InputField>

            {certificadoFile && (
              <p className="text-xs text-gray-500">
                {t("certificate.selectedFile")} {certificadoFile.name}
              </p>
            )}

            {temCertificado && (
              <div className="text-xs text-gray-600 space-y-1 rounded-md border border-green-200 bg-green-50 p-3">
                <p>
                  {t("certificate.validUntil")}: {certificadoInfo?.notValidAfter
                    ? new Date(certificadoInfo.notValidAfter).toLocaleDateString()
                    : t("certificate.notInformed")}
                </p>
                <p>
                  {t("certificate.serialNumber")}: {certificadoInfo?.serialNumber || t("certificate.notInformed")}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleEnviarCertificado}
                disabled={
                  enviandoCertificado ||
                  deletandoCertificado ||
                  carregandoCertificado ||
                  !certificadoFile
                }
                className="w-full sm:flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {enviandoCertificado
                  ? t("buttons.uploadingCertificate")
                  : temCertificado
                    ? t("buttons.changeCertificate")
                    : t("buttons.uploadCertificate")}
              </button>

              <button
                onClick={handleDeletarCertificado}
                disabled={
                  deletandoCertificado ||
                  enviandoCertificado ||
                  carregandoCertificado ||
                  !temCertificado
                }
                className="w-full sm:flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                {deletandoCertificado
                  ? t("buttons.deletingCertificate")
                  : t("buttons.deleteCertificate")}
              </button>
            </div>
          </div>
        </section>

        {/* Seção 4: Configuração NFC-e */}
        <section>
          <SectionTitle>{t("sections.nfce")}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label={t("fields.idCsc")} tooltip={t("tooltips.idCsc")}>
              <input
                type="text"
                className={inputClass}
                value={config.nfce.idCsc}
                onChange={(e) => handleChange("nfce.idCsc", e.target.value.replace(/\D/g, ""))}
                placeholder="1"
              />
            </InputField>

            <InputField label={t("fields.csc")} tooltip={t("tooltips.csc")}>
              <input
                type="text"
                className={inputClass}
                value={config.nfce.csc}
                onChange={(e) => handleChange("nfce.csc", e.target.value)}
                placeholder={t("placeholders.csc")}
              />
            </InputField>

            <InputField label={t("fields.serie")}>
              <input
                type="text"
                className={`${inputClass} bg-gray-50`}
                value={config.nfce.serie}
                readOnly
              />
            </InputField>

            <InputField label={t("fields.proximoNumero")}>
              <input
                type="number"
                className={inputClass}
                value={config.nfce.proximoNumero}
                onChange={(e) => handleChange("nfce.proximoNumero", Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
            </InputField>

            <InputField label={t("fields.ncmPadrao")} tooltip={t("tooltips.ncmPadrao")}>
              <input
                type="text"
                className={inputClass}
                value={config.ncmPadrao}
                onChange={(e) => handleChange("ncmPadrao", e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="21069090"
                maxLength={8}
              />
            </InputField>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={handleConfigurarNfce}
              disabled={configurandoNfce || registrando}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {configurandoNfce ? t("buttons.configuringNfce") : t("buttons.configureNfce")}
            </button>
          </div>
        </section>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">{t("info.title")}</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
            <li>{t("info.item2")}</li>
            <li>{t("info.item3")}</li>
            <li>{t("info.item4")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConfigFiscalPage;
