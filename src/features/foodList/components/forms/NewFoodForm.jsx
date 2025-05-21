import Select from "react-select";
import UploadWidget from "../UploadWidget";

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

const NewFoodForm = ({ formData, setFormData }) => {
  const setImagemUrl = (url) => {
    setFormData((prev) => ({
      ...prev,
      imagemUrl: url,
    }));
  };

  return (
    <form className="font-inter space-y-4 text-sm">
      <UploadWidget imagemUrl={formData.imagemUrl} setImagemUrl={setImagemUrl} />

      <div>
        <label className="block mb-1 font-medium text-gray-700">Nome do Item</label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">Categorias</label>
        <Select
          isMulti
          options={categoriaOptions}
          value={formData.categorias}
          onChange={(selected) => setFormData((prev) => ({ ...prev, categorias: selected }))}
          styles={customSelectStyles}
          placeholder="Escolha uma ou mais categorias"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">Valor</label>
        <input
          type="number"
          step="0.01"
          value={formData.valor}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              valor: parseFloat(e.target.value),
            }))
          }
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">Descrição</label>
        <textarea
          value={formData.descricao}
          onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none h-24 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>
    </form>
  );
};

export default NewFoodForm;
