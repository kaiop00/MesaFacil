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
          const quantityLabel = `${item?.quantity || 0}`.padStart(2, " ");
          const itemName = sanitize(item?.nome);
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
              <div class="item-line">
                <span class="index">${lineIndex}</span>
                <span class="qty">${quantityLabel}x</span>
                <span class="name">${itemName}</span>
                <span class="price">${price}</span>
              </div>
              ${
                extras.length > 0
                  ? extras
                      .map(
                        (extra) => `
                          <div class="item-extra">+ ${extra}</div>
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

  /**
   * Verifica se o pedido é via WhatsApp
   */
  const isWhatsAppOrder = (order) => {
    return order?.orderOrigin === 'whatsapp' || 
           order?.mesaId === 'mesa-whatsapp-delivery' ||
           order?.mesaId === 'whatsapp';
  };

  /**
   * Monta a seção de informações do cliente/entrega para pedidos WhatsApp
   */
  const buildDeliverySection = useCallback(
    (order) => {
      if (!isWhatsAppOrder(order)) {
        return '';
      }

      const cliente = order?.cliente || {};
      let enderecoFormatado = '';

      // Verifica se tem endereço estruturado (novo formato)
      if (cliente.enderecoDetalhado) {
        const end = cliente.enderecoDetalhado;
        const partes = [];
        if (end.rua) partes.push(sanitize(end.rua));
        if (end.numero) partes.push(sanitize(end.numero));
        if (end.complemento) partes.push(sanitize(end.complemento));
        enderecoFormatado = partes.join(', ');
        
        const linha2 = [];
        if (end.bairro) linha2.push(sanitize(end.bairro));
        if (end.cidade) linha2.push(sanitize(end.cidade));
        if (linha2.length > 0) {
          enderecoFormatado += `<br/>${linha2.join(', ')}`;
        }
        if (end.pontoReferencia) {
          enderecoFormatado += `<br/><small>Ref: ${sanitize(end.pontoReferencia)}</small>`;
        }
      } else if (cliente.endereco) {
        // Formato antigo (campo único)
        enderecoFormatado = sanitize(cliente.endereco);
      }

      const formaPagamentoLabel = order.formaPagamento === 'dinheiro' 
        ? 'Dinheiro (na entrega)' 
        : order.formaPagamento === 'cartao'
          ? 'Cartão (na entrega)'
          : order.formaPagamento === 'credito'
            ? 'Cartão de Crédito'
            : order.formaPagamento === 'debito'
              ? 'Cartão de Débito'
              : order.formaPagamento === 'pix'
                ? 'PIX'
                : sanitize(order.formaPagamento || '-');

      // Seção de troco (apenas para dinheiro)
      const trocoSection = order.troco?.precisaTroco ? `
        <div class="row" style="margin-top: 2mm;">
          <span style="font-weight: 600;">Valor pago</span>
          <span style="font-weight: 700;">${currencyFormatter.format(order.troco.valorPagamento || 0)}</span>
        </div>
        <div class="row" style="margin-top: 2mm;">
          <span style="font-weight: 600;">Troco de</span>
          <span style="font-weight: 700;">${currencyFormatter.format(order.troco.valorTroco || 0)}</span>
        </div>
      ` : '';

      return `
        ${cliente.nome ? `
          <div class="row">
            <span>Cliente</span>
            <span>${sanitize(cliente.nome)}</span>
          </div>
        ` : ''}
        ${cliente.telefone ? `
          <div class="row">
            <span>Telefone</span>
            <span>${sanitize(cliente.telefone)}</span>
          </div>
        ` : ''}
        ${enderecoFormatado ? `
          <div class="row" style="flex-direction: column; align-items: flex-start;">
            <span style="font-weight: 600; margin-bottom: 1mm;">Endereço:</span>
            <span style="text-align: left;">${enderecoFormatado}</span>
          </div>
        ` : ''}
        <div class="row" style="margin-top: 2mm;">
          <span style="font-weight: 600;">Pagamento</span>
          <span style="font-weight: 700;">${formaPagamentoLabel}</span>
        </div>
        ${trocoSection}
      `;
    },
    []
  );

  /**
   * Monta a seção de totais com taxa de entrega (quando aplicável)
   */
  const buildTotalSection = useCallback(
    (order) => {
      const total = Number(order?.total || 0);
      const taxaEntrega = order?.taxaEntrega;
      
      // Verifica se é um pedido WhatsApp delivery com taxa de entrega
      if (isWhatsAppOrder(order) && 
          order?.tipoEntrega === 'delivery' && 
          taxaEntrega?.aplicada && 
          taxaEntrega?.valor > 0) {
        
        // Calcula o subtotal (total - taxa de entrega)
        const subtotal = total - taxaEntrega.valor;
        
        return `
          <div class="row">
            <span>Subtotal</span>
            <span>${currencyFormatter.format(subtotal)}</span>
          </div>
          <div class="row">
            <span>🚚 Taxa de entrega</span>
            <span>${currencyFormatter.format(taxaEntrega.valor)}</span>
          </div>
          <div class="row" style="font-weight: 700; margin-top: 2mm;">
            <span>${t("print.total")}</span>
            <span>${currencyFormatter.format(total)}</span>
          </div>
        `;
      }
      
      // Total simples (sem taxa de entrega)
      return `
        <div class="row">
          <span>${t("print.total")}</span>
          <span>${currencyFormatter.format(total)}</span>
        </div>
      `;
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
                size: 70mm auto;
                margin: 0 !important;
                padding: 0 !important;
              }
              :root {
                color-scheme: light;
              }
              *,
              *::before,
              *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              html {
                width: 70mm;
                margin: 0;
                padding: 0;
              }
              body {
                width: 70mm;
                max-width: 70mm;
                min-width: 70mm;
                margin: 0 !important;
                padding: 2mm 3mm;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-family: "Roboto Mono", "Courier New", Courier, monospace;
                font-size: 12px;
                line-height: 1.35;
                color: #111827;
              }
              .ticket {
                width: 100%;
                max-width: 100%;
                margin: 0;
                padding: 2mm 0;
              }
              .row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2.5mm;
                white-space: pre-wrap;
                word-break: break-word;
                padding: 0;
                width: 100%;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .row span {
                flex: 1;
              }
              .row span:first-child {
                text-align: left;
              }
              .row span:last-child {
                text-align: right;
              }
              .center {
                justify-content: center;
                text-align: center;
              }
              .divider {
                border-top: 1px dashed #9ca3af;
                margin: 4mm 0;
              }
              .title {
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                font-size: 14px;
                margin-bottom: 1.5mm;
                text-align: center;
                width: 100%;
              }
              .item {
                margin-bottom: 3.5mm;
                width: 100%;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .item-line {
                display: grid;
                grid-template-columns: 12mm 12mm auto 20mm;
                align-items: center;
                gap: 2mm;
                font-size: 12px;
                font-weight: 600;
              }
              .item-line .name {
                text-transform: uppercase;
              }
              .item-extra {
                font-size: 11px;
                margin-top: 1mm;
                padding-left: 4mm;
                border-left: 2px solid #d1d5db;
              }
              .footer {
                margin-top: 5mm;
                font-size: 11px;
                text-align: center;
              }
              @media print {
                @page {
                  size: 70mm auto;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                html {
                  width: 70mm;
                  margin: 0;
                  padding: 0;
                }
                body {
                  width: 70mm !important;
                  max-width: 70mm !important;
                  min-width: 70mm !important;
                  margin: 0 !important;
                  padding: 2mm 3mm !important;
                  font-size: 12px;
                  line-height: 1.35;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .ticket {
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 2mm 0;
                }
                .row {
                  margin-bottom: 2.5mm;
                }
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

              ${isWhatsAppOrder(order) ? `
                ${buildDeliverySection(order)}
              ` : `
                <div class="row">
                  <span>${t("print.table")}</span>
                  <span>${sanitize(order?.mesaNumero)}</span>
                </div>
              `}
              <div class="row">
                <span>${t("print.createdAt")}</span>
                <span>${createdAtLabel}</span>
              </div>

              <div class="divider"></div>
              <div class="row title">${t("print.items")}</div>
              ${buildItemsSection(order)}

              <div class="divider"></div>
              ${buildTotalSection(order)}

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
    [buildItemsSection, buildDeliverySection, buildTotalSection, t]
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
