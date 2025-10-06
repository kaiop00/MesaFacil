import SearchInput from "./SearchInput";
import CategorySelect from "./CategorySelect";

const FilterBar = ({ search, setSearch, filter, setFilter }) => (
  <div className="font-inter flex flex-col md:flex-row gap-3 mt-5 mb-5">
    <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />
    <CategorySelect value={filter} onChange={(e) => setFilter(e.target.value)} />
  </div>
);

export default FilterBar;
