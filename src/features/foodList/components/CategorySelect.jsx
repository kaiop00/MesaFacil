import { Filter } from "react-coolicons";

const CategorySelect = ({ value, onChange }) => (
  <div className="relative w-full md:w-[30%]">
    <select
      id="Filter"
      value={value}
      onChange={onChange}
      className="w-full pl-4 pr-10 py-2 text-sm text-[#94A3B8] bg-white rounded-lg border border-gray-200 appearance-none focus:outline-none focus:ring-1 focus:ring-yellow-500"
    >
      <option value="" disabled>
        Filtrar por Categoria
      </option>
      <option value="guarnicao">Guarnição</option>
      <option value="sobremesa">Sobremesa</option>
      <option value="acompanhamento">Acompanhamento</option>
    </select>
    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
      <Filter className="w-4 h-4 text-[#94A3B8]" />
    </div>
  </div>
);

export default CategorySelect;
