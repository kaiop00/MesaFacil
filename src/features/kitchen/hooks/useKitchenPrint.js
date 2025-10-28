import { useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const sanitize = (value) => String(value ?? "").replace(/[<>]/g, "");

const formatDate = (date) => {
  if (!date) return null;
  try {
    return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch (error) {
    console.error("[useKitchenPrint] Erro ao formatar data:", error);
    return null;
  }
};

export const useKitchenPrint = () => {
  const { t } = useTranslation("kitchen");

  const buildItemsSection = useCallback(
    (order) => {
      if (!Array.isArray(order?.items) || order.items.length === 0) {
        return `<div class="row">${t("print.emptyItems")}</div>`;
      }

      return order.items
        .map((item, index) => {
          const lineIndex = String(index + 1).padStart(2, "0");
          const quantityLabel = `${item?.quantity || 0}`.padStart(3, " ");
          const itemHeader = `${quantityLabel}  ${sanitize(item?.nome)}`;
          const price = currencyFormatter.format(Number(item?.price || 0));

          const extras = [];
          if (item?.descricao) extras.push(sanitize(item.descricao));

          if (Array.isArray(item?.alergias) && item.alergias.length > 0) {
            extras.push(
              `${t("print.ingredientsLabel")}: ${item.alergias
                .map((allergy) => sanitize(allergy))
                .join(", ")}`
            );
          }

          return `
            <div class="item">
              <div class="row item-header">
                <span class="index">${lineIndex}.</span>
                <span class="name">${itemHeader}</span>
              </div>
              <div class="row item-sub">
                <span class="price">${price}</span>
              </div>
              ${
                extras.length > 0
                  ? extras
                      .map(
                        (extra) => `
                          <div class="row item-extra">+ ${extra}</div>
                        `
                      )
                      .join("")
                  : ""
              }
            </div>
          `;
        })
        .join("");
    },
    [t]
  );

  const buildHtml = useCallback(
    (order) => {
      const createdAt = formatDate(order?.criadoEm);
      const createdAtLabel = createdAt ?? t("print.unknownDate");
      const observations =
        sanitize(order?.observacoes) || t("print.noObservations");

      const totalLabel = currencyFormatter.format(Number(order?.total || 0));

      const now = formatDate(new Date()) ?? "";

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charSet="utf-8" />
            <title>${t("print.windowTitle")}</title>
            <style>
              @page {
                margin: 4mm;
                size: 80mm auto;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                color: #1f2937;
                margin: 0;
                padding: 0;
              }
              .ticket {
                width: 100%;
                max-width: 72mm;
                margin: 0 auto;
                padding: 8px 6px;
                box-sizing: border-box;
              }
              .row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 2px;
                white-space: pre-wrap;
                word-break: break-word;
                padding: 0 2px;
              }
              .center {
                justify-content: center;
                text-align: center;
              }
              .divider {
                border-top: 1px dashed #9ca3af;
                margin: 4px 0;
              }
              .title {
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .item {
                margin-bottom: 4px;
              }
              .item-header {
                font-weight: bold;
              }
              .item-sub {
                font-size: 11px;
              }
              .item-extra {
                font-size: 11px;
                margin-left: 12px;
              }
              .footer {
                margin-top: 8px;
                font-size: 11px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <section class="ticket">
              <div class="row center title">${t("print.header")}</div>
              <div class="row center">${t("print.ticketNumber", {
                number: order?.id || "-"
              })}</div>
              <div class="divider"></div>

              <div class="row">
                <span>${t("print.table")}</span>
                <span>${sanitize(order?.mesaNumero)}</span>
              </div>
              <div class="row">
                <span>${t("print.createdAt")}</span>
                <span>${createdAtLabel}</span>
              </div>

              <div class="divider"></div>
              <div class="row title">${t("print.items")}</div>
              ${buildItemsSection(order)}

              <div class="divider"></div>
              <div class="row">
                <span>${t("print.total")}</span>
                <span>${totalLabel}</span>
              </div>

              <div class="divider"></div>
              <div class="row title">${t("print.observations")}</div>
              <div class="row">${observations}</div>

              <div class="divider"></div>
              <div class="footer">
                <div>${t("print.footerThanks")}</div>
                <div>${t("print.generatedAt", { date: now })}</div>
              </div>
            </section>
          </body>
        </html>
      `;
    },
    [buildItemsSection, t]
  );

  const printOrder = useCallback(
    (order) => {
      if (!order) return;

      const htmlContent = buildHtml(order);
      const printWindow = window.open("", "_blank", "width=600,height=800");

      if (!printWindow) {
        console.error("[useKitchenPrint] Não foi possível abrir a janela de impressão.");
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      const cleanup = () => {
        printWindow.close();
        printWindow.removeEventListener("afterprint", cleanup);
      };

      printWindow.addEventListener("afterprint", cleanup);

      setTimeout(() => {
        printWindow.print();
      }, 300);
    },
    [buildHtml]
  );

  return {
    printOrder,
  };
};
