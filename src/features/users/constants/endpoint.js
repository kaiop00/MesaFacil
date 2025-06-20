const FIREBASE_AUTH_REGISTER_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`;
const FIREBASE_UPDATE_USER_EMAIL_ENDPOINT = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${import.meta.env.VITE_FIREBASE_API_KEY}`;

export { FIREBASE_AUTH_REGISTER_ENDPOINT, FIREBASE_UPDATE_USER_EMAIL_ENDPOINT };
