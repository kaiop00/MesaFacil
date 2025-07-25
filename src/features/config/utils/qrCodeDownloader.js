import QRCode from "qrcode";
import JSZip from "jszip";
import { getAllTables } from "../services/tableService";

/**
 * @param {string} idRestaurante
 */
export const downloadAllQRCodes = async (idRestaurante) => {
    const mesas = await getAllTables(idRestaurante);
    if(!mesas.length) throw new Error("Nenhuma mesa encontrada");

    const zip = new JSZip();

    for(const mesa of mesas){
        const url = mesa.qrCodeUrl || `${window.location.origin}/mesa/${mesa.numero}-${mesa.id}`;
        const dataUrl = await QRCode.toDataURL(url, {width: 512});
        const base64 = dataUrl.split(",")[1];

        zip.file(`mesa-${mesa.numero}.png`, base64, {base64: true});
    }

    const blob = await zip.generateAsync({type:"blob"});
    const zipUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = "qrcodes-mesas.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(zipUrl);
};