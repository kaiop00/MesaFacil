import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { create, getAll } from '@/services/firebase/firestoreService';
import { WHATSAPP_TABLE_ID } from '@/constants/whatsappConstants';

/**
 * Obtém configuração WhatsApp do restaurante
 * @param {string} idRestaurante 
 * @returns {Promise<Object>}
 */
export const getWhatsAppConfig = async (idRestaurante) => {
  try {
    const docRef = doc(db, 'restaurantes', idRestaurante, 'config', 'whatsapp');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    return { enabled: false };
  } catch (error) {
    console.error('Erro ao buscar configuração WhatsApp:', error);
    throw error;
  }
};

/**
 * Atualiza configuração WhatsApp
 * @param {string} idRestaurante 
 * @param {Object} config 
 * @returns {Promise<void>}
 */
export const updateWhatsAppConfig = async (idRestaurante, config) => {
  try {
    const docRef = doc(db, 'restaurantes', idRestaurante, 'config', 'whatsapp');
    await setDoc(docRef, {
      ...config,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao atualizar configuração WhatsApp:', error);
    throw error;
  }
};

/**
 * Cria mesa virtual para pedidos WhatsApp
 * Segue o mesmo padrão do useCrudTables.js
 * @param {string} idRestaurante 
 * @returns {Promise<void>}
 */
export const createWhatsAppTable = async (idRestaurante) => {
  try {
    // Verifica se já existe uma mesa WhatsApp
    const mesas = await getAll(idRestaurante, 'mesas');
    const whatsappTableExists = mesas.some(mesa => mesa.id === WHATSAPP_TABLE_ID);
    
    if (whatsappTableExists) {
      console.log('Mesa WhatsApp já existe');
      return;
    }

    // Cria a mesa WhatsApp usando o ID fixo, seguindo o padrão do useCrudTables
    const mesaRef = doc(db, 'restaurantes', idRestaurante, 'mesas', WHATSAPP_TABLE_ID);
    
    // Gera o QRCode URL no mesmo formato que useCrudTables
    // numero: 'WA' - identificador simples sem caracteres especiais
    const qrCodeUrl = `${window.location.origin}/mesa/WA-${WHATSAPP_TABLE_ID}?restaurante=${idRestaurante}`;
    
    await setDoc(mesaRef, {
      numero: 'WA', // Número identificador simplificado (sem hífens ou caracteres especiais)
      tipo: 'virtual', // Tipo correto para mesa virtual
      status: 'livre',
      qrCodeUrl, // URL do cardápio no formato padrão
      criadoEm: serverTimestamp(),
      observacoes: 'Mesa virtual para pedidos via WhatsApp (Delivery)'
    });

    console.log('Mesa WhatsApp criada com sucesso');
  } catch (error) {
    console.error('Erro ao criar mesa WhatsApp:', error);
    throw new Error('Erro ao criar mesa WhatsApp. Tente novamente.');
  }
};

/**
 * Verifica se a mesa WhatsApp existe
 * @param {string} idRestaurante 
 * @returns {Promise<boolean>}
 */
export const whatsappTableExists = async (idRestaurante) => {
  try {
    const mesaRef = doc(db, 'restaurantes', idRestaurante, 'mesas', WHATSAPP_TABLE_ID);
    const mesaSnap = await getDoc(mesaRef);
    return mesaSnap.exists();
  } catch (error) {
    console.error('Erro ao verificar mesa WhatsApp:', error);
    return false;
  }
};

/**
 * Remove mesa WhatsApp (caso seja necessário desativar completamente)
 * @param {string} idRestaurante 
 * @returns {Promise<void>}
 */
export const deleteWhatsAppTable = async (idRestaurante) => {
  try {
    const mesaRef = doc(db, 'restaurantes', idRestaurante, 'mesas', WHATSAPP_TABLE_ID);
    await deleteDoc(mesaRef);
    console.log('Mesa WhatsApp removida');
  } catch (error) {
    console.error('Erro ao remover mesa WhatsApp:', error);
    throw error;
  }
};

/**
 * Obtém ID da mesa WhatsApp
 * @returns {string}
 */
export const getWhatsAppTableId = () => {
  return WHATSAPP_TABLE_ID;
};

export default {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  createWhatsAppTable,
  whatsappTableExists,
  deleteWhatsAppTable,
  getWhatsAppTableId
};
