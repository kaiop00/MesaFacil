import { useEffect, useState } from "react";
import { Coffee } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import CategoriaSelect from "@/features/foodList/components/selects/CategoriaSelect";
import LoadingSpinner from "@/components/LoadingSpinner";

const initialState = {
    nome: "",
    categorias: [],
    valor: "",
    descricao: "",
};

export default function EditFoodModal({ isOpen, onClose, food, onSubmit, saving }) {
    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        if (isOpen && food) {
            setFormData({
                nome: food.nome || "",
                categorias: Array.isArray(food.categorias)
                    ? food.categorias.map((cat) =>
                          typeof cat === "string"
                              ? { value: cat, label: cat }
                              : cat
                      )
                    : [],
                valor: food.valor != null ? String(food.valor) : "",
                descricao: food.descricao || "",
            });
            setErrors({});
            setSubmitError("");
        }
    }, [isOpen, food]);

    const validate = () => {
        const nextErrors = {};
        if (!formData.nome?.trim()) nextErrors.nome = "Informe o nome do item.";
        if (!Array.isArray(formData.categorias) || formData.categorias.length === 0) {
            nextErrors.categorias = "Escolha ao menos uma categoria.";
        }
        const valorNumber = Number(formData.valor);
        if (!Number.isFinite(valorNumber) || valorNumber <= 0) {
            nextErrors.valor = "Informe um valor válido.";
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        setSubmitError("");
        if (!validate() || !food) return;
        try {
            await onSubmit({
                id: food.id,
                nome: formData.nome.trim(),
                categorias: formData.categorias.map((cat) => (typeof cat === "string" ? cat : cat.value)),
                valor: Number(formData.valor),
                descricao: formData.descricao?.trim() || "",
            });
            onClose();
        } catch (err) {
            setSubmitError(err?.message || "Não foi possível salvar as alterações.");
        }
    };

    return (
        <BaseModalWithHeader
            isOpen={isOpen}
            onClose={onClose}
            title="Editar item do cardápio"
            subTitle={food?.nome ? `Atualizando ${food.nome}` : "Atualize as informações"}
            icon={Coffee}
        >
            <div className="p-6 space-y-4 text-sm font-inter">
                <div>
                    <label className="block mb-1 font-medium text-gray-700">Nome</label>
                    <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic ${
                            errors.nome ? "border-red-400" : "border-gray-300"
                        }`}
                    />
                    {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
                </div>

                <CategoriaSelect
                    value={formData.categorias}
                    onChange={(categorias) => setFormData((prev) => ({ ...prev, categorias }))}
                />
                {errors.categorias && <p className="text-xs text-red-500">{errors.categorias}</p>}

                <div>
                    <label className="block mb-1 font-medium text-gray-700">Valor</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData((prev) => ({ ...prev, valor: e.target.value }))}
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic ${
                            errors.valor ? "border-red-400" : "border-gray-300"
                        }`}
                    />
                    {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor}</p>}
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700">Descrição</label>
                    <textarea
                        value={formData.descricao}
                        onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 h-28 resize-none focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
                    />
                </div>

                {submitError && <p className="text-xs text-red-500">{submitError}</p>}
            </div>

            <div className="font-inter flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded border border-gray-300 bg-white text-[#334155] font-semibold hover:bg-gray-100"
                    disabled={saving}
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-6 py-2 rounded bg-primary-dynamic text-white font-semibold disabled:opacity-60"
                    disabled={saving}
                >
                    {saving ? <LoadingSpinner size={5} /> : "Salvar alterações"}
                </button>
            </div>
        </BaseModalWithHeader>
    );
}
