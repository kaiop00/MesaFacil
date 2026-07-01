import { useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    console.error("[useDetailOrderPrint] Erro ao formatar data:", error);
    return null;
  }
};

const PAYMENT_LABELS = {
  dinheiro: "Dinheiro",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
  pix: "PIX",
  ifood: "iFood",
  voucher: "Voucher/Cortesia",
};

const CARD_BRAND_LABELS = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  MASTER: "Mastercard",
  ELO: "Elo",
  AMEX: "American Express",
  AMERICAN_EXPRESS: "American Express",
  HIPERCARD: "Hipercard",
  DINERS: "Diners Club",
  DINERS_CLUB: "Diners Club",
  AURA: "Aura",
  CABAL: "Cabal",
};

const formatPaymentLabel = (method) => {
  const normalized = String(method || "").trim().toLowerCase();
  return PAYMENT_LABELS[normalized] || method || "Pagamento";
};

const formatCardBrandLabel = (brand) => {
  const normalized = String(brand || "").trim().toUpperCase();
  return CARD_BRAND_LABELS[normalized] || brand || "";
};

const getPaymentEntriesFromPedido = (pedido) => {
  if (!pedido || typeof pedido !== "object") return [];

  if (Array.isArray(pedido.pagamentos) && pedido.pagamentos.length > 0) {
    return pedido.pagamentos.map((entry) => ({
      method: entry?.formaPagamento || entry?.method || "",
      amount: Number(entry?.valor || entry?.amount || 0),
      cardBrand:
        entry?.card?.brand ||
        entry?.pagamentoCartao?.brand ||
        entry?.cardBrand ||
        entry?.brand ||
        "",
    }));
  }
    const buildCanceledItemsSection = useCallback((pedidos) => {
      const cancelamentos = [];

      pedidos.forEach((pedido) => {
        if (Array.isArray(pedido?.cancelamentos)) {
          pedido.cancelamentos.forEach((cancelamento) => {
            cancelamentos.push(cancelamento);
          });
        }
      });

      if (cancelamentos.length === 0) {
        return "";
      }

      const lines = cancelamentos
        .map((cancelamento) => {
          const qty = Number(cancelamento?.quantidade || 0);
          const nome = sanitize(cancelamento?.itemNome || "Item");
          const motivo = sanitize(cancelamento?.motivoCancelamento || "Sem motivo informado");
          return `
            <div class="item">
              <div class="item-line">
                <span class="name">${qty}x ${nome}</span>
              </div>
              <div class="item-extra">Motivo: ${motivo}</div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="divider"></div>
        <div class="row title">Itens cancelados</div>
        ${lines}
      `;
    }, []);

  if (pedido.formaPagamento) {
    return [{
      method: pedido.formaPagamento,
      amount: Number(pedido.total || 0),
      cardBrand: pedido?.pagamentoCartao?.brand || pedido?.cardBrand || pedido?.card?.brand || "",
    }];
  }

  return [];
};

/**
 * Hook para impressão de comanda com detalhes do pedido incluindo couvert e taxas
 */
export const useDetailOrderPrint = () => {
  /**
   * Constrói a seção de itens
   */
  const buildItemsSection = useCallback((pedidos) => {
    let allItems = [];
    pedidos.forEach((pedido) => {
      if (Array.isArray(pedido?.items)) {
        allItems = allItems.concat(pedido.items);
      }
    });

    if (allItems.length === 0) {
      return `<div class="row">Nenhum item registrado.</div>`;
    }

    return allItems
      .map((item, index) => {
        const lineIndex = String(index + 1).padStart(2, "0");
        const quantityLabel = `${item?.quantity || 0}`.padStart(2, " ");
        const itemName = sanitize(item?.nome);
        const itemTotal = (item?.price || 0) * (item?.quantity || 1);
        const price = currencyFormatter.format(Number(itemTotal));

        const extras = [];
        if (item?.descricao) extras.push(sanitize(item.descricao));

        if (Array.isArray(item?.alergias) && item.alergias.length > 0) {
          extras.push(
            `Complementos: ${item.alergias.map((allergy) => sanitize(allergy)).join(", ")}`
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
  }, []);

  /**
   * Constrói a seção de totais com taxa de serviço e couvert
   */
  const buildTotalSection = useCallback(({
    totalSemTaxa,
    serviceFeePercent,
    valorServico,
    serviceFeeExempt,
    coverChargeEnabled,
    coverChargeValue,
    numeroPessoas,
    valorCouvert,
    totalComServico,
    totalAdiantado = 0,
    totalLiquido = null,
  }) => {
    let html = '';

    // Subtotal
    html += `
      <div class="row">
        <span>Subtotal</span>
        <span>${currencyFormatter.format(totalSemTaxa)}</span>
      </div>
    `;

    // Taxa de serviço
    if (!serviceFeeExempt && serviceFeePercent > 0) {
      html += `
        <div class="row">
          <span>Taxa de serviço (${serviceFeePercent}%)</span>
          <span>${currencyFormatter.format(valorServico)}</span>
        </div>
      `;
    } else {
      html += `
        <div class="row">
          <span>Taxa de serviço</span>
          <span>Isento</span>
        </div>
      `;
    }

    // Couvert artístico
    if (coverChargeEnabled && coverChargeValue > 0) {
      html += `
        <div class="row">
          <span>Couvert (${currencyFormatter.format(coverChargeValue)}/pessoa)</span>
          <span>${numeroPessoas}x = ${currencyFormatter.format(valorCouvert)}</span>
        </div>
      `;
    }

    // Total final
    html += `
      <div class="divider"></div>
      <div class="row" style="font-weight: 700; font-size: 14px;">
        <span>TOTAL</span>
        <span>${currencyFormatter.format(totalComServico)}</span>
      </div>
    `;

    if (Number(totalAdiantado) > 0) {
      html += `
        <div class="row">
          <span>Adiantamentos</span>
          <span>- ${currencyFormatter.format(Number(totalAdiantado || 0))}</span>
        </div>
      `;
    }

    const saldoFinal = totalLiquido === null
      ? Math.max(0, Number(totalComServico || 0) - Number(totalAdiantado || 0))
      : Number(totalLiquido || 0);

    html += `
      <div class="row" style="font-weight: 700; font-size: 14px;">
        <span>SALDO</span>
        <span>${currencyFormatter.format(saldoFinal)}</span>
      </div>
    `;

    return html;
  }, []);

  /**
   * Constrói a seção de pagamentos quando o pedido tiver múltiplas formas ou cartão com bandeira.
   */
  const buildPaymentSection = useCallback((pedidos) => {
    const paymentEntries = [];

    pedidos.forEach((pedido) => {
      const entries = getPaymentEntriesFromPedido(pedido);
      if (entries.length === 0) return;

      paymentEntries.push({
        pedidoId: pedido?.id || "",
        entries,
        troco: pedido?.troco || null,
      });
    });

    if (paymentEntries.length === 0) {
      return "";
    }

    let html = `
      <div class="divider"></div>
      <div class="row title">Pagamentos</div>
    `;

    paymentEntries.forEach((paymentGroup) => {
      if (paymentGroup.pedidoId) {
        html += `
          <div class="row" style="font-weight: 700; margin-top: 1mm;">
            <span>Pedido ${sanitize(paymentGroup.pedidoId)}</span>
            <span></span>
          </div>
        `;
      }

      paymentGroup.entries.forEach((entry) => {
        const label = formatPaymentLabel(entry.method);
        const amount = currencyFormatter.format(Number(entry.amount || 0));
        const brandLabel = formatCardBrandLabel(entry.cardBrand);
        const suffix = brandLabel ? ` (${brandLabel})` : "";

        html += `
          <div class="row">
            <span>${sanitize(label)}${sanitize(suffix)}</span>
            <span>${amount}</span>
          </div>
        `;
      });

      if (paymentGroup.troco?.precisaTroco) {
        html += `
          <div class="row">
            <span>Troco para</span>
            <span>${currencyFormatter.format(Number(paymentGroup.troco.valorPagamento || 0))}</span>
          </div>
          <div class="row">
            <span>Troco</span>
            <span>${currencyFormatter.format(Number(paymentGroup.troco.valorTroco || 0))}</span>
          </div>
        `;
      }
    });

    return html;
  }, []);

  /**
   * Constrói o HTML completo para impressão
   */
  const buildHtml = useCallback(
    ({ 
      mesaNumero, 
      pedidos, 
      totalSemTaxa,
      serviceFeePercent,
      valorServico,
      serviceFeeExempt,
      coverChargeEnabled,
      coverChargeValue,
      numeroPessoas,
      valorCouvert,
      totalComServico,
      totalAdiantado,
      totalLiquido,
    }) => {
      const now = formatDate(new Date()) ?? "";

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charSet="utf-8" />
            <title>Comanda - Mesa ${mesaNumero}</title>
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
              .highlight {
                background: #f3f4f6;
                padding: 2mm;
                border-radius: 2mm;
                margin: 2mm 0;
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
              <div class="row center title">Mesa Fácil - Comanda</div>
              <div class="row center">Mesa ${sanitize(mesaNumero)}</div>
              <div class="divider"></div>

              <div class="row">
                <span>Pessoas na mesa</span>
                <span>${numeroPessoas}</span>
              </div>
              <div class="row">
                <span>Data/Hora</span>
                <span>${now}</span>
              </div>

              <div class="divider"></div>
              <div class="row title">Itens</div>
              ${buildItemsSection(pedidos)}
              ${buildCanceledItemsSection(pedidos)}

              <div class="divider"></div>
              ${buildTotalSection({
                totalSemTaxa,
                serviceFeePercent,
                valorServico,
                serviceFeeExempt,
                coverChargeEnabled,
                coverChargeValue,
                numeroPessoas,
                valorCouvert,
                totalComServico,
                totalAdiantado,
                totalLiquido,
              })}

              ${buildPaymentSection(pedidos)}

              <div class="divider"></div>
              <div class="footer">
                <div>Obrigado pela preferência!</div>
                <div>Gerado em ${now}</div>
              </div>
            </section>
          </body>
        </html>
      `;
    },
    [buildItemsSection, buildTotalSection, buildPaymentSection]
  );

  /**
   * Imprime a comanda
   */
  const printDetailOrder = useCallback(
    (data) => {
      if (!data) {
        console.warn("[useDetailOrderPrint] Tentativa de imprimir dados inválidos");
        return;
      }

      const htmlContent = buildHtml(data);
      
      // Create iframe for printing (more reliable than window.open)
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
          console.error("[useDetailOrderPrint] Erro ao imprimir:", error);
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

  return {
    printDetailOrder,
  };
};
