import { useEffect, useMemo, useState } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { Headphones } from "react-coolicons";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
    getRestauranteInfo,
    updateRestauranteInfo,
} from "@/features/config/services/ConfigRestauranteService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useTranslation } from "react-i18next";
import { normalizeCoverValue } from "@/features/cliente/utils/pedidos";

const DEFAULT_STATE = {
    enabled: false,
    value: "0",
};

const parseCurrencyInput = (value) => {
    if (typeof value !== "string") return 0;
    const cleaned = value.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.]/g, "");
    if (cleaned === "") return 0;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Number(parsed.toFixed(2));
};

const formatCurrencyDisplay = (value) => {
    const numeric = normalizeCoverValue(value);
    return numeric.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
};

const CoverChargeConfigModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [state, setState] = useState(DEFAULT_STATE);
    const [initialState, setInitialState] = useState(DEFAULT_STATE);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !idRestaurante) return;

        let mounted = true;
        setLoading(true);

        getRestauranteInfo(idRestaurante)
            .then((info) => {
                if (!mounted) return;

                const coverInfo = info?.couvert_artistico || {};
                const enabled = Boolean(coverInfo?.ativo);
                const value = normalizeCoverValue(coverInfo?.valor);

                const formattedValue = value.toFixed(2);

                const nextState = {
                    enabled,
                    value: formattedValue,
                };

                setInitialState(nextState);
                setState(nextState);
            })
            .catch((error) => {
                console.error("Erro ao carregar couvert artístico", error);
                if (mounted) {
                    setInitialState(DEFAULT_STATE);
                    setState(DEFAULT_STATE);
                    notify(t("config:modals.coverCharge.error.load"), "warning");
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
    }, [idRestaurante, isOpen, notify, t]);

    const displayCurrentValue = useMemo(
        () => (state.enabled ? formatCurrencyDisplay(state.value) : t("config:modals.coverCharge.info.disabled")),
        [state.enabled, state.value, t]
    );

    const handleToggle = () => {
        setState((prev) => ({
            ...prev,
            enabled: !prev.enabled,
        }));
    };

    const handleChangeValue = (event) => {
        setState((prev) => ({
            ...prev,
            value: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!idRestaurante) {
            notify(t("config:modals.coverCharge.error.noRestaurant"), "error");
            return;
        }

        const parsedValue = parseCurrencyInput(state.value);
        const willEnable = state.enabled && parsedValue > 0;

        if (state.enabled && parsedValue <= 0) {
            notify(t("config:modals.coverCharge.error.invalidValue"), "warning");
            return;
        }

        try {
            setSaving(true);
            await updateRestauranteInfo(idRestaurante, {
                couvert_artistico: {
                    ativo: willEnable,
                    valor: willEnable ? parsedValue : 0,
                },
            });

            const nextState = {
                enabled: willEnable,
                value: parsedValue.toFixed(2),
            };

            setInitialState(nextState);
            setState(nextState);

            notify(t("config:modals.coverCharge.success.updated"), "success");
            onClose?.();
        } catch (error) {
            console.error("Erro ao salvar couvert artístico", error);
            notify(t("config:modals.coverCharge.error.save"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async () => {
        if (!idRestaurante) return;

        try {
            setSaving(true);
            await updateRestauranteInfo(idRestaurante, {
                couvert_artistico: {
                    ativo: false,
                    valor: 0,
                },
            });
            setInitialState(DEFAULT_STATE);
            setState(DEFAULT_STATE);
            notify(t("config:modals.coverCharge.success.disabled"), "success");
        } catch (error) {
            console.error("Erro ao desativar couvert artístico", error);
            notify(t("config:modals.coverCharge.error.disable"), "error");
        } finally {
            setSaving(false);
        }
    };

    const isFormDisabled = loading || saving;

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title={t("config:modals.coverCharge.title")}
            subTitle={t("config:modals.coverCharge.subtitle")}
            icon={Headphones}
        >
            <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6 font-inter">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <p className="text-sm text-slate-700">
                        {t("config:modals.coverCharge.info.description")}
                    </p>
                    <div className="text-xs text-slate-500">
                        {t("config:modals.coverCharge.info.currentValue")}{" "}
                        <span className="font-semibold text-slate-700">{displayCurrentValue}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-700">{t("config:modals.coverCharge.fields.toggleLabel")}</p>
                        <p className="text-xs text-slate-500">{t("config:modals.coverCharge.fields.toggleHint")}</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                        <span className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={state.enabled}
                                onChange={handleToggle}
                                disabled={isFormDisabled}
                            />
                            <span
                                className={`block w-10 h-6 rounded-full transition ${
                                    state.enabled ? "bg-amber-500" : "bg-slate-300"
                                }`}
                            />
                            <span
                                className={`dot absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition ${
                                    state.enabled ? "translate-x-4" : ""
                                }`}
                            />
                        </span>
                    </label>
                </div>

                <div className="space-y-2">
                    <label htmlFor="coverChargeValue" className="text-sm font-medium text-slate-700">
                        {t("config:modals.coverCharge.fields.amount")}
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-500">R$</span>
                        <input
                            id="coverChargeValue"
                            type="number"
                            min="0"
                            step="0.5"
                            inputMode="decimal"
                            value={state.value}
                            onChange={handleChangeValue}
                            disabled={isFormDisabled || !state.enabled}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-slate-100"
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        {t("config:modals.coverCharge.fields.hint")}
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
                            onClick={handleDisable}
                            disabled={isFormDisabled || !initialState.enabled}
                            className="text-sm font-semibold px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60"
                        >
                            {t("config:modals.coverCharge.buttons.disable")}
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="text-sm font-semibold text-slate-600 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            {t("config:modals.coverCharge.buttons.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isFormDisabled}
                            className="text-sm font-semibold text-white bg-amber-500 px-5 py-2 rounded-lg hover:bg-amber-600 disabled:bg-amber-300"
                        >
                            {saving ? t("config:modals.coverCharge.buttons.saving") : t("config:modals.coverCharge.buttons.save")}
                        </button>
                    </div>
                </div>
            </form>
        </BaseModalWithHeader>
    );
};

export default CoverChargeConfigModal;
