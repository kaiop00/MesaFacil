import UploadWidget from "@/features/foodList/components/UploadWidget";

const RestauranteImageUpload = ({ imagemUrl, setImagemUrl }) => (
    <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">
            Foto do Restaurante <span className="text-gray-400">(Opcional)</span>
        </label>
        <UploadWidget imagemUrl={imagemUrl} setImagemUrl={setImagemUrl} />
    </div>
);

export default RestauranteImageUpload;
