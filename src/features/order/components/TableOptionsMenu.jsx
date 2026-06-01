import {NoteSearch, CheckBig } from "react-coolicons";
import { useTranslation } from "react-i18next";

const TableOptionsMenu = ({ onDetail, onFinalize }) => {
    const { t } = useTranslation('order');
    return (
        <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border p-2 w-56 z-50">
            <p className="font-inter text-[14px] text-[#000000] px-2 mb-2">{t('common.actions')}</p>
            <button
                type="button"
                onClick={onDetail}
                className="font-inter font-[14px] flex items-center w-full px-3 py-2 text-sm text-[#151517] hover:bg-gray-100 rounded cursor-pointer"
            >
                <NoteSearch size={16} className="mr-2" />
                {t('tables.actions.viewOrder')}
            </button>
            <button
                type="button"
                onClick={onFinalize}
                className="font-inter font-[14px] flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 rounded cursor-pointer"
            >
                <CheckBig size={16} className="mr-2 text-green-600" />
                {t('tables.actions.finish')}
            </button>
        </div>
    );
}

export default TableOptionsMenu;