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

const PAYMENT_LABELS = {
  dinheiro: "Dinheiro",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
  pix: "PIX",
  ifood: "iFood",
  voucher: "Voucher",
};

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const formatDate = (date) => {
  if (!date) return null;
  try {
    let normalizedDate = date;

    if (typeof date?.toDate === "function") {
      normalizedDate = date.toDate();
    } else if (!(date instanceof Date)) {
      normalizedDate = new Date(date);
    }

    if (!(normalizedDate instanceof Date) || Number.isNaN(normalizedDate.getTime())) {
      return null;
    }

    return format(normalizedDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  } catch (error) {
    console.error("[useKitchenPrint] Erro ao formatar data:", error);
    return null;
  }
};

export const useKitchenPrint = () => {
  const { t } = useTranslation("kitchen");

  const formatPaymentMethodLabel = useCallback((order) => {
    const formaPagamento = String(order?.formaPagamento || "").toLowerCase();
    const tipoEntrega = String(order?.tipoEntrega || "").toLowerCase();
    const isWhatsAppOrder = order?.orderOrigin === 'whatsapp' || 
           order?.mesaId === 'mesa-whatsapp-delivery' ||
           order?.mesaId === 'whatsapp';

    if (!formaPagamento) return "-";
    if (formaPagamento === "dinheiro") {
      if (!isWhatsAppOrder) {
        return "Dinheiro";
      }

      if (tipoEntrega === "retirada") {
        return "Dinheiro (no local)";
      }

      if (tipoEntrega === "delivery") {
        return "Dinheiro (na entrega)";
      }

      return "Dinheiro";
    }
    if (formaPagamento === "cartao") {
      return "Cartão";
    }
    if (formaPagamento === "credito") {
      return "Cartão de Crédito";
    }
    if (formaPagamento === "debito") {
      return "Cartão de Débito";
    }
    if (formaPagamento === "pix") {
      return "PIX";
    }
    if (formaPagamento === "ifood") {
      return "iFood";
    }
    if (formaPagamento === "voucher") {
      return "Voucher";
    }

    return sanitize(order?.formaPagamento);
  }, []);

  const getPaymentEntries = useCallback((order) => {
    if (!order || typeof order !== "object") {
      return [];
    }

    if (Array.isArray(order.pagamentos) && order.pagamentos.length > 0) {
      return order.pagamentos.map((entry) => ({
        method: String(entry?.formaPagamento || entry?.method || "").toLowerCase(),
        amount: Number(entry?.valor || entry?.amount || 0),
      }));
    }

    if (order.formaPagamento) {
      return [{
        method: String(order.formaPagamento || "").toLowerCase(),
        amount: Number(order?.total || 0),
      }];
    }

    return [];
  }, []);

  const buildPaymentSection = useCallback((order) => {
    const paymentEntries = getPaymentEntries(order);

    if (paymentEntries.length === 0) {
      return "";
    }

    return `
      <div class="divider"></div>
      <div class="row title">Pagamento</div>
      ${paymentEntries
        .map((entry) => {
          const label = PAYMENT_LABELS[entry.method] || entry.method || "Pagamento";
          return `
            <div class="row">
              <span>${sanitize(label)}</span>
              <span>${formatCurrency(entry.amount)}</span>
            </div>
          `;
        })
        .join("")}
      ${order?.troco?.precisaTroco ? `
        <div class="row">
          <span>Troco para</span>
          <span>${formatCurrency(order.troco.valorPagamento || 0)}</span>
        </div>
        <div class="row">
          <span>Troco</span>
          <span>${formatCurrency(order.troco.valorTroco || 0)}</span>
        </div>
      ` : ""}
    `;
  }, [getPaymentEntries]);

  const buildItemsSection = useCallback(
    (order, hidePrice = false) => {
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
          const itemObservation = String(item?.itemObservation || item?.observacao || item?.descricao || "").trim();
          if (itemObservation) extras.push(sanitize(itemObservation));

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
                ${!hidePrice ? `<span class="price">${price}</span>` : ''}
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
   * Verifica se o pedido é para retirada no balcão
   */
  const isPickupOrder = (order) => {
    return order?.tipoEntrega === 'retirada';
  };

  /**
   * Monta a seção de aviso de retirada no balcão
   */
  const buildPickupNoticeSection = useCallback(
    (order) => {
      if (!isPickupOrder(order)) {
        return '';
      }

      return `
        <div class="row center" style="padding: 3mm 0; margin-bottom: 3mm;">
          <span style="font-weight: 700; font-size: 14px;">RETIRADA NO BALCÃO</span>
        </div>
      `;
    },
    []
  );

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

      const formaPagamentoLabel = formatPaymentMethodLabel(order);

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
    [formatPaymentMethodLabel]
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
            <span>Taxa de entrega</span>
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
    (order, options = {}) => {
      const { isReceipt = false, consumerDocument = "", hideMenuPrice = false } = options;
      const createdAt = formatDate(order?.criadoEm || order?.createdAt || order?.finalizadoEm);
      const createdAtLabel = createdAt ?? t("print.unknownDate");
      const observations =
        sanitize(order?.observacoes) || t("print.noObservations");
      const safeConsumerDocument = sanitize(consumerDocument);
      const headerLabel = isReceipt ? t("print.receiptHeader") : t("print.header");
      const receiptDisclaimer = t("print.receiptDisclaimer");

      const now = formatDate(new Date()) ?? "";

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charSet="utf-8" />
            <title>${isReceipt ? t("print.receiptWindowTitle") : t("print.windowTitle")}</title>
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
              .subtitle {
                font-size: 10px;
                text-align: center;
                margin-bottom: 1.5mm;
                line-height: 1.3;
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
              <div class="row center title">${headerLabel}</div>
              ${
                isReceipt
                  ? `<div class="row center subtitle">${sanitize(receiptDisclaimer)}</div>`
                  : `<div class="row center">${t("print.ticketNumber", {
                      number: order?.id || "-"
                    })}</div>`
              }
              <div class="divider"></div>

              ${
                isReceipt && safeConsumerDocument
                  ? `
                    <div class="row">
                      <span>${t("print.consumerDocument")}</span>
                      <span>${safeConsumerDocument}</span>
                    </div>
                    <div class="divider"></div>
                  `
                  : ""
              }

              ${buildPickupNoticeSection(order)}

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
              ${isReceipt ? buildPaymentSection(order) : ""}

              <div class="divider"></div>
              <div class="row title">${t("print.items")}</div>
              ${buildItemsSection(order, hideMenuPrice)}

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
    [buildItemsSection, buildDeliverySection, buildTotalSection, buildPickupNoticeSection, buildPaymentSection, t]
  );

  const printOrder = useCallback(
    (order, options = {}) => {
      if (!order) {
        console.warn("[useKitchenPrint] Tentativa de imprimir pedido inválido");
        return;
      }

      const htmlContent = buildHtml(order, options);
      
      // Create iframe for printing (more reliable than window.open, avoids popup blocking)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      
      // Write content to iframe
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();
      
      // Handle both onload and fallback for print
      let printed = false;
      let timeoutId = null;
      
      const doPrint = () => {
        if (printed) return;
        printed = true;
        
        if (timeoutId) clearTimeout(timeoutId);
        
        try {
          // Small delay to ensure content is fully rendered
          setTimeout(() => {
            iframe.focus();
            iframe.contentWindow.print();
          }, 100);
          
          // Remove iframe after print dialog closes (user accepts or cancels)
          // Longer delay to let dialog appear
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        } catch (error) {
          console.error("[useKitchenPrint] Erro ao imprimir:", error);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }
      };
      
      // Wait for iframe content to load before printing
      iframe.onload = doPrint;
      
      // Fallback: print after delay if onload doesn't fire
      timeoutId = setTimeout(doPrint, 1000);
    },
    [buildHtml]
  );

  const printReceipt = useCallback(
    (order, consumerDocument = "") => {
      printOrder(order, { isReceipt: true, consumerDocument });
    },
    [printOrder]
  );

  return {
    printOrder,
    printReceipt,
  };
};
