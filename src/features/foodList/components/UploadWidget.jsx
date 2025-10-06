import { useState } from "react";
import { Camera, TrashEmpty } from "react-coolicons";

export default function UploadImageFirebase({ previewUrl, setPreviewUrl, setFile }) {
  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreviewUrl(URL.createObjectURL(f));
  };

  const remove = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Clique para adicionar a foto
      </label>

      <div className="flex gap-3">
        {previewUrl ? (
          <div className="relative w-24 h-24">
            <img src={previewUrl} alt="Pré-visualização" className="w-full h-full object-cover rounded-md" />
            <button
              type="button"
              onClick={remove}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
            >
              <TrashEmpty className="w-4 h-4 text-red-500" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center w-24 h-24 rounded-md bg-[#F1F5F9] hover:bg-gray-200 cursor-pointer">
            <Camera className="text-gray-500 w-5 h-5" />
            <input type="file" accept="image/*" className="hidden" onChange={onPick} />
          </label>
        )}
      </div>
    </div>
  );
}
