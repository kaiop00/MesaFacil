import { QrCode } from "react-coolicons";

const MesaActions = () => (
  <div className="flex justify-end">
    <button className="flex items-center gap-2 bg-[#D9A23B] hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md cursor-pointer">
      <QrCode className="w-5 h-5" />
      <span>Baixar Todos os QR Codes</span>
    </button>
  </div>
);

export default MesaActions;
