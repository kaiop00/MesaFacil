import Select from "react-select";

const alergiaOptions = [
  { value: "Glúten", label: "Glúten" },
  { value: "Lactose", label: "Lactose" },
  { value: "Soja", label: "Soja" },
  { value: "Amendoim", label: "Amendoim" },
  { value: "Ovo", label: "Ovo" },
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

const AlergiaSelect = ({ value, onChange }) => (
  <div>
    <label className="block mb-1 font-medium text-gray-700">Alergias (opcional)</label>
    <Select
      isMulti
      options={alergiaOptions}
      value={value}
      onChange={onChange}
      styles={customSelectStyles}
      placeholder="Escolha uma ou mais alergias"
    />
  </div>
);

export default AlergiaSelect;
