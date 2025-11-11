import UploadWidget from "@/features/foodList/components/UploadWidget";
import { useTranslation } from "react-i18next";

const RestauranteImageUpload = ({ previewUrl, setPreviewUrl, setFile, onRemove }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">
                {t("config:components.restauranteImageUpload.label")}{" "}
                <span className="text-gray-400">
                    {t("config:components.restauranteImageUpload.optional")}
                </span>
            </label>
            <UploadWidget
                previewUrl={previewUrl}
                setPreviewUrl={setPreviewUrl}
                setFile={setFile}
                onRemove={onRemove}
                label={null}
            />
        </div>
    );
};

export default RestauranteImageUpload;
