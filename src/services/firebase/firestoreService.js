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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

/**
 * Busca todos os documentos de uma coleção com ordenação opcional
 * @param {string} collectionName
 * @param {object} [options]
 * @param {string} [options.orderByField]
 * @param {string} [options.order]
 */
export async function getAll(collectionName, options = {}) {
  const colRef = collection(db, collectionName);

  let q = colRef;
  if (options.orderByField) {
    q = query(colRef, orderBy(options.orderByField, options.order || 'asc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Busca um documento por ID
 * @param {string} collectionName
 * @param {string} docId
 */
export async function getById(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Adiciona um novo documento com createdAt opcional
 * @param {string} collectionName
 * @param {object} data
 * @param {boolean} [addTimestamp=true]
 */
export async function create(collectionName, data, addTimestamp = true) {
  const colRef = collection(db, collectionName);
  const payload = addTimestamp
    ? { ...data, criadoEm: serverTimestamp() }
    : data;
  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

/**
 * Atualiza campos de um documento
 * @param {string} collectionName
 * @param {string} docId
 * @param {object} data
 */
export async function update(collectionName, docId, data) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

/**
 * Remove um documento por ID
 * @param {string} collectionName
 * @param {string} docId
 */
export async function remove(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}
