import { useEffect, useRef } from "react";
import { Camera, TrashEmpty } from "react-coolicons";

const UploadWidget = ({ imagemUrl, setImagemUrl }) => {
  const widgetRef = useRef();

  useEffect(() => {
    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: 'dlsvjfjgb',
        uploadPreset: 'cardapio_images_unsigned',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        cropping: false
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          console.log('Upload bem-sucedido:', result.info);
          setImagemUrl(result.info.secure_url);
        } else if (error) {
          console.error('Erro no upload:', error);
        }
      }
    );
  }, [setImagemUrl]);

  const openWidget = () => {
    if (widgetRef.current) {
      widgetRef.current.open();
    }
  };

  const handleRemoveImage = () => {
    setImagemUrl(null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Clique para adicionar a foto
      </label>
      <div className="flex gap-3">
        {typeof imagemUrl === "string" && imagemUrl.trim() !== "" ? (
          <div className="relative w-24 h-24">
            <img
              src={imagemUrl}
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
          <button
            type="button"
            onClick={openWidget}
            className="flex items-center justify-center w-24 h-24 rounded-md bg-[#F1F5F9] hover:bg-gray-200 cursor-pointer"
          >
            <Camera className="text-gray-500 w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadWidget;
