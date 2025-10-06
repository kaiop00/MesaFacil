/**
 * Serviço para conversão de unidades de medida
 */

const CONVERSION_TABLE = {
  // Conversões de peso para gramas (unidade base)
  weight: {
    'Grama': 1,
    'Quilograma': 1000
  },
  
  // Conversões de volume para mililitros (unidade base)
  volume: {
    'Mililitro': 1,
    'Litro': 1000
  },
  
  // Unidades que não podem ser convertidas
  count: {
    'Unidade': 1
  }
};

const UNIT_CATEGORIES = {
  'Grama': 'weight',
  'Quilograma': 'weight',
  'Mililitro': 'volume',
  'Litro': 'volume',
  'Unidade': 'count'
};

/**
 * Verifica se duas unidades são compatíveis para conversão
 * @param {string} fromUnit - Unidade de origem
 * @param {string} toUnit - Unidade de destino
 * @returns {boolean}
 */
export const areUnitsCompatible = (fromUnit, toUnit) => {
  if (fromUnit === toUnit) return true;
  
  const fromCategory = UNIT_CATEGORIES[fromUnit];
  const toCategory = UNIT_CATEGORIES[toUnit];
  
  return fromCategory && toCategory && fromCategory === toCategory;
};

/**
 * Converte uma quantidade de uma unidade para outra
 * @param {number} quantity - Quantidade a ser convertida
 * @param {string} fromUnit - Unidade de origem
 * @param {string} toUnit - Unidade de destino
 * @returns {number|null} - Quantidade convertida ou null se não for possível converter
 */
export const convertUnit = (quantity, fromUnit, toUnit) => {
  if (!quantity || quantity <= 0) return 0;
  
  // Se as unidades são iguais, não há conversão
  if (fromUnit === toUnit) return quantity;
  
  // Verifica se as unidades são compatíveis
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    console.warn(`Não é possível converter de ${fromUnit} para ${toUnit}: unidades incompatíveis`);
    return null;
  }
  
  const category = UNIT_CATEGORIES[fromUnit];
  const conversionTable = CONVERSION_TABLE[category];
  
  if (!conversionTable[fromUnit] || !conversionTable[toUnit]) {
    console.warn(`Unidade não suportada para conversão: ${fromUnit} ou ${toUnit}`);
    return null;
  }
  
  // Converter para unidade base e depois para unidade destino
  const baseValue = quantity * conversionTable[fromUnit];
  const convertedValue = baseValue / conversionTable[toUnit];
  
  return convertedValue;
};

/**
 * Converte quantidade de ingrediente para a unidade de armazenamento do item
 * @param {number} ingredientQuantity - Quantidade do ingrediente na receita
 * @param {string} ingredientUnit - Unidade usada na receita
 * @param {string} storageUnit - Unidade de armazenamento do item no estoque
 * @returns {Object} - Resultado da conversão {success, convertedQuantity, errorMessage}
 */
export const convertIngredientToStorage = (ingredientQuantity, ingredientUnit, storageUnit) => {
  if (!ingredientQuantity || ingredientQuantity <= 0) {
    return {
      success: false,
      convertedQuantity: 0,
      errorMessage: 'Quantidade inválida'
    };
  }
  
  // Se as unidades são iguais, não há necessidade de conversão
  if (ingredientUnit === storageUnit) {
    return {
      success: true,
      convertedQuantity: ingredientQuantity,
      errorMessage: null
    };
  }
  
  // Tentar conversão
  const convertedQuantity = convertUnit(ingredientQuantity, ingredientUnit, storageUnit);
  
  if (convertedQuantity === null) {
    return {
      success: false,
      convertedQuantity: 0,
      errorMessage: `Não é possível converter de ${ingredientUnit} para ${storageUnit}: unidades incompatíveis`
    };
  }
  
  return {
    success: true,
    convertedQuantity: convertedQuantity,
    errorMessage: null
  };
};

/**
 * Obtém todas as unidades compatíveis com uma unidade específica
 * @param {string} unit - Unidade de referência
 * @returns {string[]} - Array com unidades compatíveis
 */
export const getCompatibleUnits = (unit) => {
  const category = UNIT_CATEGORIES[unit];
  if (!category) return [unit];
  
  return Object.keys(UNIT_CATEGORIES).filter(u => UNIT_CATEGORIES[u] === category);
};

/**
 * Pluraliza uma unidade baseada na quantidade
 * @param {string} unit - Unidade no singular
 * @param {number} quantity - Quantidade
 * @returns {string} - Unidade no singular ou plural
 */
export const pluralizeUnit = (unit, quantity) => {
  const numQuantity = parseFloat(quantity);
  
  // Se quantidade é 0, 1 ou NaN, usar singular
  if (isNaN(numQuantity) || numQuantity === 1) return unit;
  
  // Mapeamento de unidades para plural
  const pluralMap = {
    'Grama': 'Gramas',
    'Quilograma': 'Quilogramas', 
    'Mililitro': 'Mililitros',
    'Litro': 'Litros',
    'Unidade': 'Unidades',
    'Caixa': 'Caixas',
    'Pacote': 'Pacotes',
    'Fardo': 'Fardos'
  };
  
  return pluralMap[unit] || unit;
};

/**
 * Formata uma quantidade com sua unidade de forma legível
 * @param {number} quantity - Quantidade
 * @param {string} unit - Unidade
 * @returns {string} - Texto formatado
 */
export const formatQuantityWithUnit = (quantity, unit) => {
  const numQuantity = parseFloat(quantity);
  
  if (!numQuantity || isNaN(numQuantity) || numQuantity <= 0) return `0 ${pluralizeUnit(unit, 0)}`;
  
  // Formatar com até 2 casas decimais, removendo zeros desnecessários
  const formattedQuantity = parseFloat(numQuantity.toFixed(2));
  const pluralizedUnit = pluralizeUnit(unit, formattedQuantity);
  
  return `${formattedQuantity} ${pluralizedUnit}`;
};

/**
 * Validação de entrada para verificar se os dados são válidos para conversão
 * @param {number} quantity - Quantidade
 * @param {string} fromUnit - Unidade origem
 * @param {string} toUnit - Unidade destino
 * @returns {Object} - {isValid, errorMessage}
 */
export const validateConversionInput = (quantity, fromUnit, toUnit) => {
  if (!quantity || isNaN(quantity) || quantity <= 0) {
    return {
      isValid: false,
      errorMessage: 'Quantidade deve ser um número positivo'
    };
  }
  
  if (!fromUnit || !toUnit) {
    return {
      isValid: false,
      errorMessage: 'Unidades de origem e destino devem ser especificadas'
    };
  }
  
  if (!UNIT_CATEGORIES[fromUnit]) {
    return {
      isValid: false,
      errorMessage: `Unidade de origem '${fromUnit}' não é suportada`
    };
  }
  
  if (!UNIT_CATEGORIES[toUnit]) {
    return {
      isValid: false,
      errorMessage: `Unidade de destino '${toUnit}' não é suportada`
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
};