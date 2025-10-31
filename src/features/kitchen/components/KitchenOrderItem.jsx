import { useState } from "react";
import { CaretDownMd } from "react-coolicons";
import { useTranslation } from "react-i18next";

const KitchenOrderItem = ({ item, formatCurrency }) => {
  const { t } = useTranslation("kitchen");
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);

  const priceLabel = formatCurrency(Number(item?.price || 0));
  const quantityLabel = `${item?.quantity || 0}x - ${item?.nome || t("item.unknown")}`;

  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 p-3 text-left"
      >
        <div className="flex items-center gap-3">
          {item?.imagemUrl ? (
            <img
              src={item.imagemUrl}
              alt={item?.nome || ""}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary-dynamic-opacity flex items-center justify-center text-primary-dynamic font-semibold">
              {(item?.nome || "?").slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-800">{quantityLabel}</p>
            <p className="text-xs text-gray-500">{priceLabel}</p>
          </div>
        </div>

        <CaretDownMd
          size={18}
          className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 text-xs text-gray-600 space-y-2">
          {item?.descricao && <p>{item.descricao}</p>}

          {Array.isArray(item?.alergias) && item.alergias.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 mb-1">{t("item.labels.ingredients")}</p>
              <div className="flex flex-wrap gap-2">
                {item.alergias.map((alergia) => (
                  <span
                    key={alergia}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-medium text-gray-700"
                  >
                    {alergia}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!item?.descricao && (!item?.alergias || item.alergias.length === 0) && (
            <p className="italic text-gray-500">{t("item.noDetails")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default KitchenOrderItem;

