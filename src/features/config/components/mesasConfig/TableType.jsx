import Select from "react-select";
import { useTranslation } from "react-i18next";

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

const TableType = ({ value, onChange }) => {
    const { t } = useTranslation();

    const typeOptions = [
        { value: 2, label: t("config:components.tableType.options.2") },
        { value: 4, label: t("config:components.tableType.options.4") },
        { value: 6, label: t("config:components.tableType.options.6") },
        { value: 8, label: t("config:components.tableType.options.8") },
        { value: 10, label: t("config:components.tableType.options.10") },
        { value: 12, label: t("config:components.tableType.options.12") },
    ];

    return (
        <div>
            <label className="block mb-1 font-medium text-gray-700">{t("config:components.tableType.label")}</label>
            <Select
                options={typeOptions}
                value={value}
                onChange={onChange}
                styles={customSelectStyles}
                placeholder={t("config:components.tableType.placeholder")}
                isSearchable={false}
            />
        </div>
    );
};

export default TableType;
