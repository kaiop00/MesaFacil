import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/config/firebaseConfig";

const db = getFirestore(app);

export const salvarNovoItem = async (formData) => {
  const { nome, categorias, valor, descricao, imagemUrl } = formData;

  if (!nome || !valor || !imagemUrl || categorias.length === 0) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  await addDoc(collection(db, "cardapio"), {
    nome,
    descricao,
    valor: parseFloat(valor),
    categorias: categorias.map((c) => c.value),
    imagemUrl,
    criadoEm: serverTimestamp(),
  });
};
