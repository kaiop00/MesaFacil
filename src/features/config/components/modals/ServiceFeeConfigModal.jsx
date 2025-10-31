import { useEffect, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Settings } from "react-coolicons";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
    getRestauranteInfo,
    updateRestauranteInfo,
} from "@/features/config/services/ConfigRestauranteService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useTranslation } from "react-i18next";

const DEFAULT_PERCENTUAL = 10;

const formatPercent = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_PERCENTUAL;
    return Math.max(0, Number(value.toFixed(2)));
};

const parsePercentInput = (value) => {
    if (typeof value !== "string") return null;
    const cleaned = value.replace(",", ".").trim();
    if (cleaned === "") return null;
    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return Number(Math.min(numeric, 100).toFixed(2));
};

const ServiceFeeConfigModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [inputValue, setInputValue] = useState(DEFAULT_PERCENTUAL.toString());
    const [initialValue, setInitialValue] = useState(DEFAULT_PERCENTUAL);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !idRestaurante) return;

        let mounted = true;
        setLoading(true);

        getRestauranteInfo(idRestaurante)
            .then((info) => {
                if (!mounted) return;
                const percent = formatPercent(info?.taxa_servico ?? DEFAULT_PERCENTUAL);
                setInitialValue(percent);
                setInputValue(percent.toString());
            })
            .catch((error) => {
                console.error("Erro ao carregar taxa de serviço", error);
                if (mounted) {
                    setInitialValue(DEFAULT_PERCENTUAL);
                    setInputValue(DEFAULT_PERCENTUAL.toString());
                    notify(t("config:modals.serviceFee.error.load"), "warning");
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [isOpen, idRestaurante, notify, t]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!idRestaurante) {
            notify(t("config:modals.serviceFee.error.noRestaurant"), "error");
            return;
        }

        const parsed = parsePercentInput(inputValue);
        if (parsed === null) {
            notify(t("config:modals.serviceFee.error.invalidValue"), "warning");
            return;
        }

        try {
            setSaving(true);
            await updateRestauranteInfo(idRestaurante, {
                taxa_servico: parsed,
            });
            setInitialValue(parsed);
            notify(t("config:modals.serviceFee.success.updated"), "success");
            onClose();
        } catch (error) {
            console.error("Erro ao atualizar taxa de serviço", error);
            notify(t("config:modals.serviceFee.error.save"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!idRestaurante) return;
        try {
            setSaving(true);
            await updateRestauranteInfo(idRestaurante, {
                taxa_servico: DEFAULT_PERCENTUAL,
            });
            setInitialValue(DEFAULT_PERCENTUAL);
            setInputValue(DEFAULT_PERCENTUAL.toString());
            notify(t("config:modals.serviceFee.success.reset"), "success");
        } catch (error) {
            console.error("Erro ao redefinir taxa de serviço", error);
            notify(t("config:modals.serviceFee.error.reset"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!idRestaurante) return;
        try {
            setSaving(true);
            await updateRestauranteInfo(idRestaurante, {
                taxa_servico: 0,
            });
            setInitialValue(0);
            setInputValue("0");
            notify(t("config:modals.serviceFee.success.removed"), "success");
        } catch (error) {
            console.error("Erro ao remover taxa de serviço", error);
            notify(t("config:modals.serviceFee.error.remove"), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.serviceFee.title")}
            subTitle={t("config:modals.serviceFee.subtitle")}
            icon={Settings}
        >
            <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <p className="text-sm text-slate-700">
                        {t("config:modals.serviceFee.info.description")}
                    </p>
                    <p className="text-xs text-slate-500">
                        {t("config:modals.serviceFee.info.currentValue")}{" "}
                        <span className="font-semibold text-slate-700">
                            {formatPercent(initialValue)}%
                        </span>
                    </p>
                </div>

                <div className="space-y-2">
                    <label htmlFor="serviceFee" className="text-sm font-medium text-slate-700">
                        {t("config:modals.serviceFee.fields.percentage")}
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            id="serviceFee"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="0.5"
                            value={inputValue}
                            onChange={(event) => setInputValue(event.target.value)}
                            disabled={loading || saving}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-slate-100"
                        />
                        <span className="text-sm text-slate-500 mr-2">%</span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {t("config:modals.serviceFee.fields.hint")}
                    </p>
                </div>

                {loading && (
                    <div className="flex justify-center py-4">
                        <LoadingSpinnerDynamic />
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={loading || saving}
                            className="text-sm font-semibold px-3 py-2 rounded-lg border border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-60"
                        >
                            {t("config:modals.serviceFee.buttons.restoreDefault")}
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={loading || saving}
                            className="text-sm font-semibold px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60"
                        >
                            {t("config:modals.serviceFee.buttons.removeFee")}
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="text-sm font-semibold text-slate-600 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            {t("config:modals.serviceFee.buttons.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || saving}
                            className="text-sm font-semibold text-white bg-amber-500 px-5 py-2 rounded-lg hover:bg-amber-600 disabled:bg-amber-300"
                        >
                            {saving ? t("config:modals.serviceFee.buttons.saving") : t("config:modals.serviceFee.buttons.save")}
                        </button>
                    </div>
                </div>
            </form>
        </BaseModalWithHeader>
    );
};

export default ServiceFeeConfigModal;
