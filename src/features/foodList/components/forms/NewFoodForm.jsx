import { useState } from "react";
import { Camera, TrashEmpty } from "react-coolicons";
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
    border: "1px solid #D1D5DB", // Tailwind border-gray-300
    borderRadius: "0.375rem",
    padding: "2px",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#D1D5DB",
    },
  }),
};

const NewFoodForm = ({ formData, setFormData }) => {
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        imagem: file,
        previewUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imagem: null,
      previewUrl: null,
    }));
  };

  return (
    <form className="font-inter space-y-4 text-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Clique para adicionar a foto
        </label>
        <div className="flex gap-3">
          {formData.previewUrl ? (
            <div className="relative w-24 h-24">
              <img
                src={formData.previewUrl}
                alt="Pré-visualização"
                className="w-full h-full object-cover rounded-md"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
              >
                <TrashEmpty className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-24 h-24 rounded-md bg-[#F1F5F9] hover:bg-gray-200 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Camera className="text-gray-500 w-5 h-5" />
            </label>
          )}
        </div>
      </div>

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
