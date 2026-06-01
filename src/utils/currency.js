export function parseCurrencyToNumber(input) {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return input;
  let s = String(input).trim();
  if (!s) return 0;

  const hasComma = s.indexOf(',') > -1;
  const hasDot = s.indexOf('.') > -1;

  if (hasComma && hasDot) {
    // Decide which is decimal separator by looking at last occurrences
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
      // dot is decimal separator (US style): remove commas
      s = s.replace(/,/g, '');
    } else {
      // comma is decimal separator (pt-BR): remove dots (thousands) and replace comma
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (hasComma) {
    // assume comma is decimal separator
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else {
    // no comma present. If dot exists and matches thousand separator pattern like 1.000 or 12.345
    if (hasDot && /\.\d{3}$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    // otherwise keep as-is (dot as decimal separator or plain integer)
  }

  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

export default {
  parseCurrencyToNumber,
};

export function formatCurrencyToString(input) {
  const num = parseCurrencyToNumber(input);
  try {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return (num || 0).toString();
  }
}
