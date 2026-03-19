import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  buscarConfigFiscal,
  salvarConfigFiscal,
  getConfigFiscalPadrao,
  buscarEnderecoPorCep,
} from "@/features/fiscal/services/configFiscalService";
import { configurarEmpresaNfce, registrarEmpresa } from "@/features/fiscal/services/nfceService";

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

const ConfigFiscalPage = () => {
  const { t } = useTranslation("fiscal");
  const { idRestaurante } = useAuth();
  const { notify } = useToast();

  const [config, setConfig] = useState(getConfigFiscalPadrao());
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [configurandoNfce, setConfigurandoNfce] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

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
  }, [idRestaurante]);

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

  const handleCepChange = useCallback(async (e) => {
    const masked = maskCep(e.target.value);
    handleChange("endereco.cep", masked);

    const digits = masked.replace(/\D/g, "");
    if (digits.length === 8) {
      setBuscandoCep(true);
      try {
        const endereco = await buscarEnderecoPorCep(digits);
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
  }, [handleChange]);

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

      // Register/update company only
      const result = await registrarEmpresa({ idRestaurante });
      if (result.success) {
        setConfig((prev) => ({ ...prev, empresaRegistrada: true }));
        notify(t("messages.empresaDadosRegistrados"), "success");
      } else {
        notify(result.error || t("messages.errorRegistrando"), "error");
      }
    } catch (err) {
      console.error("Erro ao registrar empresa:", err);
      const msg = err?.message || t("messages.errorRegistrando");
      notify(msg, "error");
    } finally {
      setRegistrando(false);
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
        notify(result.error || t("messages.errorConfigurandoNfce"), "error");
      }
    } catch (err) {
      console.error("Erro ao configurar NFC-e:", err);
      const msg = err?.message || t("messages.errorConfigurandoNfce");
      notify(msg, "error");
    } finally {
      setConfigurandoNfce(false);
    }
  };

  if (loading) return <LoadingSpinner />;

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

      <div className="space-y-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Seção 1: Dados da Empresa */}
        <section>
          <SectionTitle>{t("sections.company")}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="CNPJ" required>
              <input
                type="text"
                className={inputClass}
                value={config.cnpj}
                onChange={handleCnpjChange}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
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

          <div className="pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={handleRegistrarEmpresa}
              disabled={registrando || configurandoNfce}
              className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {registrando ? t("buttons.registering") : config.empresaRegistrada ? t("buttons.updateCompany") : t("buttons.registerCompany")}
            </button>
          </div>
        </section>

        {/* Seção 3: Configuração NFC-e */}
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
            <li>{t("info.item1")}</li>
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
