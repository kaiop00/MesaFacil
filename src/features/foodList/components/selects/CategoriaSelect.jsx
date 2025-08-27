import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { getCategoriaNomes } from "@/features/config/services/CategoriasService";
import { useAuth } from "@/contexts/AuthContext";

const customSelectStyles = {
  control: (base) => ({
    ...base,
    border: "1px solid #D1D5DB",
    borderRadius: "0.375rem",
    padding: "2px",
    boxShadow: "none",
    "&:hover": { borderColor: "#D1D5DB" },
  }),
};


export default function CategoriaSelect({
  value,
  onChange,
  isMulti = true,
  label = "Categorias",
  placeholder = "Escolha uma ou mais categorias",
  styles = customSelectStyles,
  idRestaurante: idRestauranteProp,
  unique = true,
  sort = true,
  enabled = true,
}) {
  const { idRestaurante: idFromContext } = useAuth();
  const idRestaurante = idRestauranteProp ?? idFromContext;

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !idRestaurante) {
      setOptions([]);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const nomes = await getCategoriaNomes(idRestaurante, { unique, sort });
        if (!alive) return;
        setOptions(nomes.map((n) => ({ value: n, label: n })));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [idRestaurante, enabled, unique, sort]);

  const incomingType = useMemo(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) return "options";
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" ? "strings" : "options";
  }, [value]);

  const valueOptions = useMemo(() => {
    if (!value) return isMulti ? [] : null;
    if (incomingType === "strings") {
      const mapped = value.map((v) => ({ value: v, label: v }));
      return isMulti ? mapped : mapped[0] ?? null;
    }
    return isMulti ? value : value[0] ?? null;
  }, [value, incomingType, isMulti]);

  function handleChange(selected) {
    if (incomingType === "strings") {
      if (isMulti) onChange?.((selected || []).map((s) => s.value));
      else onChange?.(selected ? [selected.value] : []);
    } else {
      if (isMulti) onChange?.(selected || []);
      else onChange?.(selected ? [selected] : []);
    }
  }

  return (
    <div>
      <label className="block mb-1 font-medium text-gray-700">{label}</label>
      <Select
        isMulti={isMulti}
        options={options}
        value={valueOptions}
        onChange={handleChange}
        styles={styles}
        placeholder={loading ? "Carregando categorias..." : placeholder}
        isLoading={loading}
        noOptionsMessage={() => (loading ? "Carregando..." : "Nenhuma categoria encontrada")}
        isDisabled={!enabled || !idRestaurante}
      />
    </div>
  );
}
