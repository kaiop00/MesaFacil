// src/services/firebase/firestoreService.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';

/**
 * Busca todos os documentos de uma coleção
 * @param {string} collectionName
 */
export async function getAll(collectionName) {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
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
 * Adiciona um novo documento
 * @param {string} collectionName
 * @param {object} data
 */
export async function create(collectionName, data) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, data);
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
