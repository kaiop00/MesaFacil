import Select from "react-select";

const categoriaOptions = [
  { value: "Guarnição", label: "Guarnição" },
  { value: "Carne", label: "Carne" },
  { value: "Sobremesa", label: "Sobremesa" },
  { value: "Acompanhamento", label: "Acompanhamento" },
];

const customSelectStyles = {
  control: (base) => ({
    ...base,
    border: "1px solid #D1D5DB",
    borderRadius: "0.375rem",
    padding: "2px",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#D1D5DB",
    },
  }),
};

const CategoriaSelect = ({ value, onChange }) => (
  <div>
    <label className="block mb-1 font-medium text-gray-700">Categorias</label>
    <Select
      isMulti
      options={categoriaOptions}
      value={value}
      onChange={onChange}
      styles={customSelectStyles}
      placeholder="Escolha uma ou mais categorias"
    />
  </div>
);

export default CategoriaSelect;
