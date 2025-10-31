const FIREBASE_API_KEY = (() => {
  const value = import.meta.env.VITE_FIREBASE_API_KEY;
  const normalized = typeof value === "string" ? value.trim() : value;

  if (!normalized) {
    throw new Error(
      "[firebase:endpoint] VITE_FIREBASE_API_KEY não definido. Verifique seu arquivo de ambiente."
    );
  }

  return normalized;
})();

const FIREBASE_AUTH_REGISTER_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
const FIREBASE_UPDATE_USER_EMAIL_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`;

export { FIREBASE_AUTH_REGISTER_ENDPOINT, FIREBASE_UPDATE_USER_EMAIL_ENDPOINT };
