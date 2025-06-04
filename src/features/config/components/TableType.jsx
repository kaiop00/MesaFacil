import Select from "react-select";

const typeOptions = [
    { value: 2, label: "2 Cadeiras" },
    { value: 4, label: "4 Cadeiras" },
    { value: 6, label: "6 Cadeiras" },
    { value: 8, label: "8 Cadeiras" },
    { value: 10, label: "10 Cadeiras" },
    { value: 12, label: "12 Cadeiras" },
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

const TableType = ({ value, onChange }) => (
    <div>
        <label className="block mb-1 font-medium text-gray-700">Tipo de Mesa</label>
        <Select
            options={typeOptions}
            value={value}
            onChange={onChange}
            styles={customSelectStyles}
            placeholder="Selecione um tipo"
            isSearchable={false}
        />
    </div>
);

export default TableType;
