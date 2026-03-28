import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { emitirNfce, consultarNfce } from "@/features/fiscal/services/nfceService";
import { getFriendlyNfceError } from "@/features/fiscal/utils/nfceErrorParser";
import { useKitchenPrint } from "@/features/kitchen/hooks/useKitchenPrint";

const STEPS = {
  FORM: "form",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

const NfceModal = ({
  isOpen,
  onClose,
  idRestaurante,
  mesaId,
  pedidoId,
  orderData,
  nfceEnabled = true,
}) => {
  const { t } = useTranslation("order");
  const { printReceipt } = useKitchenPrint();
  const [step, setStep] = useState(STEPS.FORM);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [pendingNfceId, setPendingNfceId] = useState(null);

  const resetState = useCallback(() => {
    setStep(STEPS.FORM);
    setCpfCnpj("");
    setResultado(null);
    setErro(null);
    setPendingNfceId(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSkip = () => {
    handleClose();
  };

  // Máscara CPF/CNPJ
  const formatCpfCnpj = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  };

  const handleCpfCnpjChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
    setCpfCnpj(formatCpfCnpj(raw));
  };

  const handleEmitir = async () => {
    if (!nfceEnabled) return;
    if (step === STEPS.LOADING) return;

    setStep(STEPS.LOADING);
    setErro(null);

    try {
      const cpfLimpo = cpfCnpj.replace(/\D/g, "") || null;
      const result = await emitirNfce({
        idRestaurante,
        mesaId,
        pedidoId,
        cpfConsumidor: cpfLimpo,
      });

      if (result?.success && (result?.nfceStatus === "autorizado" || result?.nfceStatus === "autorizada")) {
        setPendingNfceId(null);
        setResultado(result);
        setStep(STEPS.SUCCESS);
      } else if (result?.nfceStatus === "rejeitado" || result?.nfceStatus === "rejeitada" || result?.nfceStatus === "erro") {
        setErro(result?.error || result?.motivo || result?.mensagem || t("nfce.modal.errors.rejected"));
        setPendingNfceId(result?.nfceId || null);
        setStep(STEPS.ERROR);
      } else if (result?.nfceId) {
        setPendingNfceId(result.nfceId || result.id);
        // Pending — poll once and allow manual consult if still pending
        await pollStatus(result.nfceId || result.id);
      } else {
        setErro(result?.error || t("nfce.modal.errors.generic"));
        setPendingNfceId(null);
        setStep(STEPS.ERROR);
      }
    } catch (error) {
      console.error("Erro ao emitir NFC-e:", error);
      const msg = getFriendlyNfceError(error, t("nfce.modal.errors.generic"));
      setErro(msg);
      setStep(STEPS.ERROR);
    }
  };

  const pollStatus = async (nfceId) => {
    try {
      const result = await consultarNfce({ idRestaurante, nfceId });
      if (result.status === "autorizado" || result.status === "autorizada") {
        setPendingNfceId(null);
        setResultado(result);
        setStep(STEPS.SUCCESS);
      } else if (result.status === "rejeitado" || result.status === "rejeitada" || result.status === "erro") {
        setErro(result.motivo || result.mensagem || t("nfce.modal.errors.rejected"));
        setStep(STEPS.ERROR);
      } else {
        setPendingNfceId(nfceId);
        setErro(t("nfce.modal.errors.timeout"));
        setStep(STEPS.ERROR);
      }
    } catch (error) {
      setErro(getFriendlyNfceError(error, t("nfce.modal.errors.generic")));
      setStep(STEPS.ERROR);
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingNfceId || step === STEPS.LOADING) return;
    setStep(STEPS.LOADING);
    setErro(null);
    await pollStatus(pendingNfceId);
  };

  const handleRetry = () => {
    setStep(STEPS.FORM);
    setErro(null);
    setPendingNfceId(null);
  };

  const handlePrintReceipt = () => {
    if (!orderData) return;
    const documento = cpfCnpj.trim();
    printReceipt(orderData, documento);
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={handleClose}
      title={t("nfce.modal.title")}
      subTitle={t("nfce.modal.subtitle")}
    >
      <div className="space-y-5">
        {/* STEP: FORM */}
        {step === STEPS.FORM && (
          <>
            <p className="text-sm text-gray-600">
              {t("nfce.modal.description")}
            </p>

            <div>
              <label
                htmlFor="nfce-cpf"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("nfce.modal.cpfLabel")}
                <span className="text-gray-400 ml-1">
                  ({t("nfce.modal.optional")})
                </span>
              </label>
              <input
                id="nfce-cpf"
                type="text"
                value={cpfCnpj}
                onChange={handleCpfCnpjChange}
                placeholder="000.000.000-00"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-dynamic focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                {t("nfce.modal.cpfHint")}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSkip}
                disabled={step === STEPS.LOADING}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors cursor-pointer"
              >
                {t("nfce.modal.buttons.skip")}
              </button>
              <button
                type="button"
                onClick={handleEmitir}
                disabled={step === STEPS.LOADING || !nfceEnabled}
                className="flex-1 px-4 py-3 bg-primary-dynamic text-white rounded-lg hover:opacity-90 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("nfce.modal.buttons.emit")}
              </button>
            </div>

            {!nfceEnabled && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t("nfce.modal.emitDisabledHint")}
              </p>
            )}

            {orderData && (
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium transition-colors cursor-pointer"
              >
                {t("nfce.modal.buttons.printReceipt")}
              </button>
            )}
          </>
        )}

        {/* STEP: LOADING */}
        {step === STEPS.LOADING && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <LoadingSpinnerDynamic />
            <p className="text-sm text-gray-600 font-medium">
              {t("nfce.modal.loading")}
            </p>
            <p className="text-xs text-gray-400">
              {t("nfce.modal.loadingHint")}
            </p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === STEPS.SUCCESS && resultado && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  {t("nfce.modal.success.title")}
                </p>
                <p className="text-xs text-green-600">
                  {t("nfce.modal.success.description")}
                </p>
              </div>
            </div>

            {resultado.chaveAcesso && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {t("nfce.modal.success.accessKey")}
                </p>
                <p className="text-xs font-mono text-gray-800 break-all select-all">
                  {resultado.chaveAcesso}
                </p>
              </div>
            )}

            {resultado.linkDanfce && (
              <a
                href={resultado.linkDanfce}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm"
              >
                {t("nfce.modal.success.viewDanfce")}
              </a>
            )}

            {orderData && (
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium transition-colors cursor-pointer"
              >
                {t("nfce.modal.buttons.printReceipt")}
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-full px-4 py-3 bg-primary-dynamic text-white rounded-lg hover:opacity-90 font-medium transition-colors cursor-pointer"
            >
              {t("nfce.modal.buttons.close")}
            </button>
          </div>
        )}

        {/* STEP: ERROR */}
        {step === STEPS.ERROR && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {t("nfce.modal.error.title")}
                </p>
                <p className="text-xs text-red-600">
                  {erro}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors cursor-pointer"
              >
                {t("nfce.modal.buttons.close")}
              </button>
              {pendingNfceId && (
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  className="flex-1 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium transition-colors cursor-pointer"
                >
                  {t("nfce.modal.buttons.checkStatus", "Consultar status")}
                </button>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-primary-dynamic text-white rounded-lg hover:opacity-90 font-medium transition-colors cursor-pointer"
              >
                {t("nfce.modal.buttons.retry")}
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseModalWithHeader>
  );
};

export default NfceModal;
