const NewPromotionForm = ({ formData, setFormData }) => {
  setFormData((prev) => ({
    ...prev,
  }));

  return (
    <form className="font-inter space-y-4 text-sm">
      <div>
        <label className="block mb-1 font-medium text-gray-700">
          Nome da Promoção
        </label>
        <input
          type="text"
          value={formData.nome}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, nome: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>
    </form>
  );
};

export default NewPromotionForm;
