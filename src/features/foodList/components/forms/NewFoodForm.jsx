import UploadImageFirebase from "@/features/foodList/components/UploadWidget";
import CategoriaSelect from "@/features/foodList/components/selects/CategoriaSelect";
import AlergiaSelect from "@/features/foodList/components/selects/AlergiaSelect";
import IngredientesSelector from "@/features/foodList/components/ingredientes/IngredientesSelector";

const NewFoodForm = ({ formData, setFormData }) => {
  const setFile = (file) => setFormData((p) => ({ ...p, file }));
  const setPreviewUrl = (url) => setFormData((p) => ({ ...p, previewUrl: url }));
  const setIngredientes = (ingredientes) => setFormData((p) => ({ ...p, ingredientes }));

  return (
    <form className="font-inter space-y-4 text-sm">
      <UploadImageFirebase
        previewUrl={formData.previewUrl || null}
        setPreviewUrl={setPreviewUrl}
        setFile={setFile}
      />

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
          setFormData((prev) => ({ ...prev, alergias: selected.map((s) => s.value) }))
        }
      />

      <div>
        <label className="block mb-1 font-medium text-gray-700">Valor</label>
        <input
          type="number"
          step="0.01"
          value={formData.valor}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, valor: parseFloat(e.target.value) }))
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

      <IngredientesSelector
        value={formData.ingredientes || []}
        onChange={setIngredientes}
      />
    </form>
  );
};

export default NewFoodForm;
