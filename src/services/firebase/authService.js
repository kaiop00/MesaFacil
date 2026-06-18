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
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
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
    stripeCustomerId: null,
    stripeSubscriptionId: null,
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
    freeTrialUsed: false,
    freeTrialClaimedAt: null,
    role: {
      ...allPermissions
    },
    createdAt: serverTimestamp(),
  });

  return { user: result.user, idRestaurante };
}

/**
 * Realiza login com e-mail e senha.
 * Garante que o documento do usuário existe no Firestore.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").User>} Usuário autenticado
 */
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const user = result.user;

  // Garante que o documento de usuário existe
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Se não existe, cria com dados básicos
      await setDoc(
        userRef,
        {
          email: user.email,
          status: "Ativo",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // Atualiza o timestamp de último acesso
      await updateDoc(userRef, {
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error ensuring user document exists:", error);
    // Não lança erro aqui - o login foi bem-sucedido, apenas falhamos em garantir o doc
  }

  return user;
}

/**
 * Realiza logout do usuário autenticado.
 * @returns {Promise<void>}
 */
export function logout() {
  localStorage.removeItem("cor-primary");
  localStorage.removeItem("mesafacil:idRestaurante");
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
  const RESTAURANTE_ID_CACHE_KEY = "mesafacil:idRestaurante";

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data() || {};
    const idRestaurante =
      data.idRestaurante ||
      data.idRestaurant ||
      data.restaurantId ||
      data.id_restaurante ||
      data?.restaurante?.id ||
      data?.restaurant?.id ||
      data.restauranteId ||
      null;

    if (idRestaurante) {
      localStorage.setItem(RESTAURANTE_ID_CACHE_KEY, idRestaurante);
      return idRestaurante;
    }
  }

  const restauranteByUid = await getDoc(doc(db, "restaurantes", uid));
  if (restauranteByUid.exists()) {
    localStorage.setItem(RESTAURANTE_ID_CACHE_KEY, restauranteByUid.id);
    return restauranteByUid.id;
  }

  const cached = localStorage.getItem(RESTAURANTE_ID_CACHE_KEY);
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Checks whether a user account has already consumed the free trial.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function hasUserUsedFreeTrial(uid) {
  if (!uid) return false;

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return false;
  }

  const data = userSnap.data() || {};
  return Boolean(data.freeTrialUsed || data.freeTrialClaimedAt);
}

/**
 * Marks the free trial as consumed for a user account (one-time claim).
 * Returns false when the trial was already consumed.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function claimUserFreeTrial(uid) {
  if (!uid) {
    throw new Error('User ID is required');
  }

  const userRef = doc(db, 'users', uid);

  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists()) {
      throw new Error('User document not found');
    }

    const data = userSnap.data() || {};
    if (data.freeTrialUsed || data.freeTrialClaimedAt) {
      return false;
    }

    transaction.update(userRef, {
      freeTrialUsed: true,
      freeTrialClaimedAt: serverTimestamp(),
    });

    return true;
  });
}
