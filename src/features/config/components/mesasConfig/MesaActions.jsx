import { QrCode } from "react-coolicons";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { downloadAllQRCodes } from "@/features/config/utils/qrCodeDownloader";

function MesaActions() {

  const { idRestaurante } = useAuth();
  const { notify } = useToast();

  const handleDownloadQRCodes = async () => {
    try {
      await downloadAllQRCodes(idRestaurante);
      notify("Download iniciado!", "success");
    } catch (e) {
      console.error(e);
      notify("Erro ao gerar QR codes", "error");
    }
  }

  return (
    <div className="flex justify-end">
      <button
        className={`
        flex items-center gap-2
        bg-[#D9A23B] hover:bg-yellow-600
        text-white font-medium px-4 py-2
        rounded-md cursor-pointer
      `}
        onClick={handleDownloadQRCodes}
      >
        <QrCode className="w-5 h-5" />
        <span>Baixar Todos os QR Codes</span>
      </button>
    </div>
  )

}

export default MesaActions;
