import { SearchMagnifyingGlass } from "react-coolicons";

const SearchInput = ({ value, onChange }) => (
  <div className="relative w-full md:w-[70%]">
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Procure o item do cardápio que deseja encontrar"
      className="w-full pl-4 pr-10 py-2 text-sm bg-white text-gray-700 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-dynamic"
    />
    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
      <SearchMagnifyingGlass className="w-5 h-5 text-primary-dynamic" />
    </div>
  </div>
);

export default SearchInput;
