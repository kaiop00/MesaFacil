/**
 * Firebase Auth REST API error translator with i18n support
 * Based on: https://firebase.google.com/docs/reference/rest/auth
 * 
 * API Response Example:
 * {
 *   "error": {
 *     "code": 400,
 *     "message": "WEAK_PASSWORD : Password should be at least 6 characters",
 *     "errors": [...]
 *   }
 * }
 */

/**
 * Extracts the error code from Firebase Auth API error message
 * The message format is: "ERROR_CODE : Description"
 * @param {string} message - Full error message from Firebase
 * @returns {string} Error code (e.g., 'WEAK_PASSWORD')
 */
function extractErrorCode(message) {
  if (!message) return null;
  
  // Firebase returns error in format "ERROR_CODE : Description"
  const parts = message.split(':');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  
  return message;
}

/**
 * Translates Firebase Auth REST API error messages using i18next
 * @param {string} errorCode - Error code from Firebase (e.g., 'EMAIL_EXISTS', 'WEAK_PASSWORD')
 * @param {Function} t - i18next translation function
 * @returns {string} Translated error message
 */
export function translateFirebaseAuthError(errorCode, t) {
  if (!errorCode) {
    return t ? t('users:errors.unknown') : "Ocorreu um erro inesperado.";
  }
  
  // If t function is not provided, return a default Portuguese message
  if (!t) {
    const defaultMessages = {
      "EMAIL_EXISTS": "Este e-mail já está em uso.",
      "INVALID_EMAIL": "E-mail inválido.",
      "WEAK_PASSWORD": "A senha deve conter no mínimo 6 caracteres.",
      "MISSING_PASSWORD": "A senha é obrigatória.",
      "TOO_MANY_ATTEMPTS_TRY_LATER": "Muitas tentativas. Tente novamente mais tarde.",
    };
    return defaultMessages[errorCode] || `Erro: ${errorCode}`;
  }
  
  // Try to get translation for specific error code
  const translationKey = `users:errors.${errorCode}`;
  const translation = t(translationKey);
  
  // If translation key is returned as-is, it means translation doesn't exist
  if (translation === translationKey) {
    return t('users:errors.unknown');
  }
  
  return translation;
}

/**
 * Extracts and translates error from Firebase Auth REST API response
 * @param {Response} response - Fetch response object
 * @param {Object} data - Parsed JSON response data
 * @param {Function} t - Optional i18next translation function
 * @returns {string} Translated error message
 */
export function handleFirebaseAuthResponse(response, data, t) {
  // Success case
  if (response.ok) {
    return null;
  }
  
  // Handle specific error cases from Firebase Auth REST API
  if (data?.error?.message) {
    const errorCode = extractErrorCode(data.error.message);
    return translateFirebaseAuthError(errorCode, t);
  }
  
  // Handle HTTP errors with i18n support
  if (t) {
    if (response.status === 400) {
      return t('users:errors.invalidData');
    }
    
    if (response.status === 401) {
      return t('users:errors.unauthorized');
    }
    
    if (response.status === 403) {
      return t('users:errors.forbidden');
    }
    
    if (response.status >= 500) {
      return t('users:errors.serverError');
    }
    
    return t('users:errors.requestError') + `: ${response.status} ${response.statusText}`;
  }
  
  // Fallback to Portuguese
  if (response.status === 400) {
    return "Dados inválidos. Verifique as informações e tente novamente.";
  }
  
  if (response.status === 401) {
    return "Não autorizado. Verifique suas credenciais.";
  }
  
  if (response.status === 403) {
    return "Acesso negado.";
  }
  
  if (response.status >= 500) {
    return "Erro no servidor. Tente novamente mais tarde.";
  }
  
  return `Erro ao processar solicitação: ${response.status} ${response.statusText}`;
}
