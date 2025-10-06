import { Filter } from "react-coolicons";
import { useTranslation } from "react-i18next";
import useCrudCategorias from "@/features/config/hooks/useCrudCategorias";
import { useAuth } from "@/contexts/AuthContext";

const CategorySelect = ({ value, onChange }) => {
  const { t } = useTranslation('foodList');
  const { idRestaurante } = useAuth();
  const { categorias, loading } = useCrudCategorias({ idRestaurante });

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
