import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

/**
 * Gera a referência da subcoleção dentro do restaurante
 * @param {string} idRestaurante
 * @param {string} subcollectionName
 * @returns {CollectionReference}
 */
function getSubcollectionRef(idRestaurante, subcollectionName) {
  return collection(db, 'restaurantes', idRestaurante, subcollectionName);
}

/**
 * Busca todos os documentos de uma subcoleção com ordenação opcional
 * @param {string} idRestaurante
 * @param {string} subcollectionName
 * @param {object} [options]
 * @param {string} [options.orderByField]
 * @param {string} [options.order]
 */
export async function getAll(idRestaurante, subcollectionName, options = {}) {
  const colRef = getSubcollectionRef(idRestaurante, subcollectionName);

  let q = colRef;
  if (options.orderByField) {
    q = query(colRef, orderBy(options.orderByField, options.order || 'asc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Busca um documento por ID na subcoleção
 * @param {string} idRestaurante
 * @param {string} subcollectionName
 * @param {string} docId
 */
export async function getById(idRestaurante, subcollectionName, docId) {
  const docRef = doc(db, 'restaurantes', idRestaurante, subcollectionName, docId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Adiciona um novo documento na subcoleção com createdAt opcional
 * @param {string} idRestaurante
 * @param {string} subcollectionName
 * @param {object} data
 * @param {boolean} [addTimestamp=true]
 */
export async function create(idRestaurante, subcollectionName, data, addTimestamp = true) {
  const colRef = getSubcollectionRef(idRestaurante, subcollectionName);
  const payload = addTimestamp
    ? { ...data, criadoEm: serverTimestamp() }
    : data;
  const docRef = await addDoc(colRef, payload);
  return docRef;
}

/**
 * Atualiza campos de um documento na subcoleção
 * @param {string} idRestaurante
 * @param {string} subcollectionName
 * @param {string} docId
 * @param {object} data
 */
export async function update(idRestaurante, subcollectionName, docId, data) {
  const docRef = doc(db, 'restaurantes', idRestaurante, subcollectionName, docId);
  await updateDoc(docRef, data);
}

/**
 * Remove um documento por ID na subcoleção
 * @param {string} idRestaurante
 * @param {string} subcollectionName
 * @param {string} docId
 */
export async function remove(idRestaurante, subcollectionName, docId) {
  const docRef = doc(db, 'restaurantes', idRestaurante, subcollectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Busca movimentações com filtros aplicados no Firestore
 * @param {string} idRestaurante
 * @param {string} itemId
 * @param {object} [options]
 * @param {number} [options.limit=10]
 * @param {string} [options.orderByField='createdAt']
 * @param {string} [options.order='desc']
 */
export async function getMovimentacoesByItem(idRestaurante, itemId, options = {}) {
  const colRef = getSubcollectionRef(idRestaurante, 'movimentos');
  
  const queryConstraints = [
    where('itemId', '==', itemId)
  ];

  if (options.orderByField) {
    queryConstraints.push(orderBy(options.orderByField, options.order || 'desc'));
  }

  if (options.limit) {
    queryConstraints.push(limit(options.limit));
  }

  const q = query(colRef, ...queryConstraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
