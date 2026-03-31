import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import UploadImageFirebase from "@/features/foodList/components/UploadWidget";
import CategoriaSelect from "@/features/foodList/components/selects/CategoriaSelect";
import AlergiaSelect from "@/features/foodList/components/selects/AlergiaSelect";
import IngredientesSelector from "@/features/foodList/components/ingredientes/IngredientesSelector";

const NewFoodForm = ({ formData, setFormData }) => {
  const { t } = useTranslation('foodList');
  const [valorInput, setValorInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const lastExternalValue = useRef(formData.valor);
  
  const setFile = (file) => setFormData((p) => ({ ...p, file }));
  const setPreviewUrl = (url) => setFormData((p) => ({ ...p, previewUrl: url }));
  const setIngredientes = (ingredientes) => setFormData((p) => ({ ...p, ingredientes }));

  // Atualiza valorInput apenas quando formData.valor muda externamente (ex: reset do form)
  useEffect(() => {
    if (!isFocused && formData.valor !== lastExternalValue.current) {
      lastExternalValue.current = formData.valor;
      if (formData.valor === "" || formData.valor === null || formData.valor === undefined) {
        setValorInput("");
      } else {
        const num = typeof formData.valor === "number" ? formData.valor : parseFloat(formData.valor);
        if (!isNaN(num)) {
          setValorInput(num.toFixed(2).replace(".", ","));
        }
      }
    }
  }, [formData.valor, isFocused]);

  const handleValorChange = (e) => {
    let raw = e.target.value;
    
    // Remove caracteres inválidos (só permite números, vírgula e ponto)
    raw = raw.replace(/[^\d.,]/g, "");
    
    // Substitui ponto por vírgula para padronizar
    raw = raw.replace(/\./g, ",");
    
    // Garante apenas uma vírgula
    const parts = raw.split(",");
    if (parts.length > 2) {
      raw = parts[0] + "," + parts.slice(1).join("");
    }
    
    // Limita casas decimais a 2
    if (parts.length === 2 && parts[1].length > 2) {
      raw = parts[0] + "," + parts[1].slice(0, 2);
    }
    
    setValorInput(raw);
    
    // Converte para número e atualiza formData
    if (raw === "") {
      setFormData((prev) => ({ ...prev, valor: "" }));
      lastExternalValue.current = "";
    } else {
      const numStr = raw.replace(",", ".");
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        setFormData((prev) => ({ ...prev, valor: num }));
        lastExternalValue.current = num;
      }
    }
  };

  const handleValorFocus = () => {
    setIsFocused(true);
  };

  const handleValorBlur = () => {
    setIsFocused(false);
    // Formata ao sair do campo
    if (valorInput && formData.valor !== "" && formData.valor !== null) {
      const num = typeof formData.valor === "number" ? formData.valor : parseFloat(formData.valor);
      if (!isNaN(num)) {
        setValorInput(num.toFixed(2).replace(".", ","));
      }
    }
  };

  return (
    <form className="font-inter space-y-4 text-sm">
      <UploadImageFirebase
        previewUrl={formData.previewUrl || null}
        setPreviewUrl={setPreviewUrl}
        setFile={setFile}
      />

      <div>
        <label className="block mb-1 font-medium text-gray-700">{t('form.labels.itemName')}</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
        />
      </div>

      <CategoriaSelect
        value={formData.categorias}
        onChange={(selected) => setFormData((prev) => ({ ...prev, categorias: selected }))}
      />

      <AlergiaSelect
        value={formData.alergias.map((a) => ({ label: a, value: a }))}
        onChange={(selected) =>
          setFormData((prev) => ({ ...prev, alergias: selected.map((s) => s.value) }))
        }
      />

      <div>
        <label className="block mb-1 font-medium text-gray-700">{t('form.labels.value')}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valorInput}
            onChange={handleValorChange}
            onFocus={handleValorFocus}
            onBlur={handleValorBlur}
            className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">{t('form.labels.taxationType')}</label>
        <select
          value={formData.tipoTributacao || "normal"}
          onChange={(e) => setFormData((prev) => ({ ...prev, tipoTributacao: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
        >
          <option value="normal">{t('form.options.taxationNormal')}</option>
          <option value="monofasico">{t('form.options.taxationMonofasico')}</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">{t('form.labels.description')}</label>
        <textarea
          value={formData.descricao}
          onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none h-24 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
        />
      </div>

      <IngredientesSelector
        value={formData.ingredientes || []}
        onChange={setIngredientes}
      />
    </form>
  );
};

export default NewFoodForm;
