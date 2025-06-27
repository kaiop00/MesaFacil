import UploadWidget from "../UploadWidget";
import CategoriaSelect from "@/features/foodList/components/selects/CategoriaSelect";
import AlergiaSelect from "@/features/foodList/components/selects/AlergiaSelect";

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
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
        />
      </div>

      <CategoriaSelect
        value={formData.categorias}
        onChange={(selected) => setFormData((prev) => ({ ...prev, categorias: selected }))}
      />

      <AlergiaSelect
        value={formData.alergias.map((a) => ({ label: a, value: a }))}
        onChange={(selected) =>
          setFormData((prev) => ({
            ...prev,
            alergias: selected.map((s) => s.value) 
          }))
        }
      />


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
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">Descrição</label>
        <textarea
          value={formData.descricao}
          onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none h-24 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
        />
      </div>
    </form>
  );
};

export default NewFoodForm;
