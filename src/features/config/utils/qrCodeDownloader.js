import QRCode from "qrcode";
import JSZip from "jszip";
import i18n from "@/i18n";
import { getAllTables } from "../services/tableService";

const getTranslator = () => {
    if (typeof i18n.getFixedT === "function") {
        return i18n.getFixedT(null, "config");
    }
    return (key, options) => i18n.t(`config:${key}`, options);
};

const wrapText = (ctx, text, maxWidth) => {
    if (!text) return [""];

    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
        const tentativeLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(tentativeLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = tentativeLine;
        }
    }

    if (currentLine) lines.push(currentLine);

    return lines.length ? lines : [""];
};

const generateQRCodeCanvas = async (url, size) => {
    const qrCanvas = document.createElement("canvas");

    await new Promise((resolve, reject) => {
        QRCode.toCanvas(
            qrCanvas,
            url,
            {
                width: size,
                margin: 2,
            },
            (error) => (error ? reject(error) : resolve())
        );
    });

    return qrCanvas;
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

const generateLabeledQRCode = async ({ url, tableLabel, scanTitle, instructions }) => {
    const width = 600;
    const outerPadding = 28;
    const cardWidth = width - outerPadding * 2;
    const innerPaddingX = 48;
    const topSpacing = 36;
    const badgeHeight = 34;
    const badgeRadius = 18;
    const badgeSpacing = 18;
    const titleFontSize = 32;
    const titleSpacing = 14;
    const bodyFontSize = 18;
    const bodyLineHeight = 26;
    const instructionsSpacing = 22;
    const qrContainerPadding = 24;
    const bottomSpacing = 48;

    const qrContainerWidth = cardWidth - innerPaddingX * 2;
    const qrSize = qrContainerWidth - qrContainerPadding * 2;
    const qrContainerHeight = qrSize + qrContainerPadding * 2;

    const measurementCtx = document.createElement("canvas").getContext("2d");
    measurementCtx.font = `400 ${bodyFontSize}px "Inter", Arial, sans-serif`;
    const instructionsLines = wrapText(
        measurementCtx,
        instructions,
        qrContainerWidth - 20
    );

    const contentHeight =
        topSpacing +
        badgeHeight +
        badgeSpacing +
        titleFontSize +
        titleSpacing +
        instructionsLines.length * bodyLineHeight +
        instructionsSpacing +
        qrContainerHeight +
        bottomSpacing;

    const height = contentHeight + outerPadding * 2;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#fef3c7");
    gradient.addColorStop(0.4, "#ffffff");
    gradient.addColorStop(1, "#fefce8");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const cardX = outerPadding;
    const cardY = outerPadding;
    const cardHeight = height - outerPadding * 2;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 28);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    drawRoundedRect(ctx, cardX + 6, cardY + 6, cardWidth - 12, cardHeight - 12, 26);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let currentY = cardY + topSpacing;
    const centerX = width / 2;
    const tableLabelUpper = tableLabel.toUpperCase();

    ctx.save();
    ctx.font = `600 16px "Inter", Arial, sans-serif`;
    const badgeWidth = ctx.measureText(tableLabelUpper).width + 44;
    const badgeX = centerX - badgeWidth / 2;
    ctx.fillStyle = "#fde68a";
    drawRoundedRect(ctx, badgeX, currentY, badgeWidth, badgeHeight, badgeRadius);
    ctx.fill();
    ctx.fillStyle = "#92400e";
    ctx.textBaseline = "middle";
    ctx.fillText(tableLabelUpper, centerX, currentY + badgeHeight / 2);
    ctx.restore();

    currentY += badgeHeight + badgeSpacing;

    ctx.fillStyle = "#1f2937";
    ctx.font = `700 ${titleFontSize}px "Inter", Arial, sans-serif`;
    ctx.fillText(scanTitle, centerX, currentY);
    currentY += titleFontSize + titleSpacing;

    ctx.fillStyle = "#4b5563";
    ctx.font = `400 ${bodyFontSize}px "Inter", Arial, sans-serif`;
    for (const line of instructionsLines) {
        ctx.fillText(line, centerX, currentY);
        currentY += bodyLineHeight;
    }

    currentY += instructionsSpacing;

    const qrContainerX = centerX - qrContainerWidth / 2;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, qrContainerX, currentY, qrContainerWidth, qrContainerHeight, 28);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const qrCanvas = await generateQRCodeCanvas(url, qrSize);
    const qrX = qrContainerX + qrContainerPadding;
    const qrY = currentY + qrContainerPadding;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    return canvas.toDataURL("image/png");
};

/**
 * @param {string} idRestaurante
 */
export const downloadAllQRCodes = async (idRestaurante) => {
    const mesas = await getAllTables(idRestaurante);
    if(!mesas.length) throw new Error("Nenhuma mesa encontrada");

    const zip = new JSZip();
    const t = getTranslator();

    for(const mesa of mesas){
        const tableNumber = mesa?.numero ?? "-";
        const url = mesa.qrCodeUrl || `${window.location.origin}/mesa/${tableNumber}-${mesa.id}`;
        const tableLabel = t("modals.qrCode.tableLabel", { number: tableNumber });
        const scanTitle = t("modals.qrCode.scanTitle");
        const instructions = t("modals.qrCode.instructions");

        const dataUrl = await generateLabeledQRCode({
            url,
            tableLabel,
            scanTitle,
            instructions,
        });

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
