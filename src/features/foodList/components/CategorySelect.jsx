import { Filter } from "react-coolicons";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { getCategorias } from "@/features/config/services/CategoriasService";
import { useAuth } from "@/contexts/AuthContext";

const CategorySelect = ({ value, onChange }) => {
  const { t } = useTranslation('foodList');
  const { idRestaurante } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const carregarCategorias = async () => {
      if (!idRestaurante) {
        if (active) {
          setCategorias([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const list = await getCategorias(idRestaurante);
        if (active) {
          setCategorias(list);
        }
      } catch {
        if (active) {
          setCategorias([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    carregarCategorias();

    return () => {
      active = false;
    };
  }, [idRestaurante]);

  return (
    <div className="relative w-full md:w-[30%]">
      <select
        id="Filter"
        value={value}
        onChange={onChange}
        disabled={loading}
        className="w-full pl-4 pr-10 py-2 text-sm text-[#94A3B8] bg-white rounded-lg border border-gray-200 appearance-none focus:outline-none focus:ring-1 focus:ring-primary-dynamic"
      >
        <option value="">{t('filter.allCategories')}</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.nome}>
            {categoria.nome}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <Filter className="w-4 h-4 text-primary-dynamic" />
      </div>
    </div>
  );
};

export default CategorySelect;
