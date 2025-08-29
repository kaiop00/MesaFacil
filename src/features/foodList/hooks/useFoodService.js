import { create, getAll } from "@/services/firebase/firestoreService";
import { uploadMenuImage } from "@/services/firebase/storageUpload";
import { useAuth } from "@/contexts/AuthContext";

export function useFoodService() {
  const { idRestaurante } = useAuth();

  const listarItensCardapio = async () => {
    return await getAll(idRestaurante, "cardapio", { orderByField: "criadoEm", order: "desc" });
  };

  const salvarNovoItem = async (formData) => {
    const { nome, categorias, valor, descricao, file, alergias } = formData;

    if (!nome || !valor || !file || categorias.length === 0) {
      throw new Error("Preencha todos os campos obrigatórios (inclua uma imagem).");
    }

    // 1) sobe a imagem
    const { downloadURL, storagePath } = await uploadMenuImage(file, idRestaurante);

    // 2) monta o payload (mantendo imagemUrl)
    const data = {
      nome,
      descricao,
      valor: parseFloat(valor),
      categorias: categorias.map((c) => c.value),
      imagemUrl: downloadURL,  // <- compatível com seu front
      storagePath,             // opcional: útil para deletar/trocar depois
      alergias: alergias || [],
    };

    // 3) cria o doc
    return await create(idRestaurante, "cardapio", data);
  };

  return { listarItensCardapio, salvarNovoItem };
}
