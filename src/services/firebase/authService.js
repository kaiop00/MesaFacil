import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { app } from "@/config/firebaseConfig";
import { PERMISSIONS } from "@/features/users/constants/permissions";

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Cria ou associa um restaurante pelo nome.
 * Se já existir, retorna o ID existente.
 * Caso contrário, cria um novo e retorna o ID.
 * @param {string} nomeRestaurante
 * @returns {Promise<string>} ID do restaurante
 */
async function criarOuAssociarRestaurante(nomeRestaurante) {
  const q = query(
    collection(db, "restaurantes"),
    where("nome", "==", nomeRestaurante)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }

  const docRef = await addDoc(collection(db, "restaurantes"), {
    nome: nomeRestaurante,
    cor_base: "#D9A23B",   
    imagem_restaurante: null, 
    taxa_servico: 10,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Realiza login com o provedor Google.
 * @returns {Promise<import("firebase/auth").User>} Usuário autenticado
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Cadastra um novo usuário com e-mail, senha e nome do restaurante.
 * Cria ou associa o restaurante e salva o ID no perfil do usuário.
 * @param {string} email
 * @param {string} password
 * @param {string} nomeRestaurante
 * @returns {Promise<import("firebase/auth").User>} Usuário criado
 */
export async function registerWithEmail(email, password, nomeRestaurante) {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(result.user, {
    displayName: nomeRestaurante,
  });

  const idRestaurante = await criarOuAssociarRestaurante(nomeRestaurante);

  // Create an object with all permissions set to true
  const allPermissions = Object.values(PERMISSIONS)
    .flat()
    .reduce((acc, permission) => {
      acc[permission.id] = true;
      return acc;
    }, {});

  await setDoc(doc(db, "users", result.user.uid), {
    email: result.user.email,
    idRestaurante,
    status: 'Ativo',
    role: {
      ...allPermissions
    },
    createdAt: serverTimestamp(),
  });

  return { user: result.user, idRestaurante };
}

/**
 * Realiza login com e-mail e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").User>} Usuário autenticado
 */
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Realiza logout do usuário autenticado.
 * @returns {Promise<void>}
 */
export function logout() {
  localStorage.removeItem("cor-primary");
  return signOut(auth);
}

/**
 * Envia e-mail de recuperação de senha.
 * @param {string} email
 * @returns {Promise<void>}
 */
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Recupera o ID do restaurante associado ao usuário.
 * @param {string} uid
 * @returns {Promise<string|null>} ID do restaurante ou null
 */
export async function getUserRestauranteId(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().idRestaurante || null;
  }

  return null;
}
