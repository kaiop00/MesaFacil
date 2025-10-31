import { useTranslation } from "react-i18next";

const CorInput = ({ color, setColor }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {t("config:components.corInput.label")} <span className="text-gray-400">{t("config:components.corInput.optional")}</span>
      </label>
      <div className="flex items-center space-x-2">
        <div
          className="w-10 h-10 rounded border border-gray-300"
          style={{ backgroundColor: color }}
        />
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
        >
          <option value="">{t("config:components.corInput.placeholder")}</option>
          <option value="#FF0000">{t("config:components.corInput.colors.red")}</option>
          <option value="#0000FF">{t("config:components.corInput.colors.blue")}</option>
          <option value="#008000">{t("config:components.corInput.colors.green")}</option>
          <option value="#FFA500">{t("config:components.corInput.colors.orange")}</option>
          <option value="#800080">{t("config:components.corInput.colors.purple")}</option>
        </select>
      </div>
    </div>
  );
};

export default CorInput;
