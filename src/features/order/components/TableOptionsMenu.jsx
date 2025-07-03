import {NoteSearch, CheckBig } from "react-coolicons";

const TableOptionsMenu = ({ onDetail, onFinalize }) => {
    return (
        <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border p-2 w-56 z-50">
            <p className="font-inter text-[14px] text-[#000000] px-2 mb-2">Ações</p>
            <button
                onClick={onDetail}
                className="font-inter font-[14px] flex items-center w-full px-3 py-2 text-sm text-[#151517] hover:bg-gray-100 rounded cursor-pointer"
            >
                <NoteSearch size={16} className="mr-2" />
                Detalhes
            </button>
            <button
                onClick={onFinalize}
                className="font-inter font-[14px] flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 rounded cursor-pointer"
            >
                <CheckBig size={16} className="mr-2 text-green-600" />
                Finalizar Pedido
            </button>
        </div>
    );
}

export default TableOptionsMenu;