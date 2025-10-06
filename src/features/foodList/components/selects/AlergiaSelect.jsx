import { useTranslation } from "react-i18next";
import Select from "react-select";

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

const AlergiaSelect = ({ value, onChange }) => {
  const { t } = useTranslation('foodList');
  
  const alergiaOptions = [
    { value: "Glúten", label: t('allergies.options.gluten') },
    { value: "Lactose", label: t('allergies.options.lactose') },
    { value: "Soja", label: t('allergies.options.soy') },
    { value: "Amendoim", label: t('allergies.options.peanut') },
    { value: "Ovo", label: t('allergies.options.egg') },
  ];
  
  return (
    <div>
      <label className="block mb-1 font-medium text-gray-700">{t('form.labels.allergies')}</label>
      <Select
        isMulti
        options={alergiaOptions}
        value={value}
        onChange={onChange}
        styles={customSelectStyles}
        placeholder={t('form.placeholders.chooseAllergies')}
      />
    </div>
  );
};

export default AlergiaSelect;
