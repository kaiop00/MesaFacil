import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { app } from "@/config/firebaseConfig";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Realiza login com o provedor Google
 * @returns {Promise<import("firebase/auth").User>} Usuário autenticado
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Cadastra um novo usuário com e-mail, senha e nome do restaurente
 * @param {string} email
 * @param {string} password
 * @param {String} nomeRestaurante
 * @returns {Promise<import("firebase/auth").User>} Usuário criado
 */
export async function registerWithEmail(email, password, nomeRestaurante) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, {
    displayName: nomeRestaurante,
  });
  return result.user;
}

/**
 * Realiza login com e-mail e senha
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").User>} Usuário autenticado
 */
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Realiza logout do usuário autenticado
 * @returns {Promise<void>}
 */
export function logout() {
  return signOut(auth);
}
