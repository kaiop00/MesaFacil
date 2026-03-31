import { create, getAll, update, remove } from "@/services/firebase/firestoreService";
import { uploadMenuImage, deleteMenuImage } from "@/services/firebase/storageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { adicionarIngredientes } from "@/services/ingredientes/ingredientesService";

export function useFoodService() {
  const { idRestaurante } = useAuth();

  const listarItensCardapio = async () => {
    return await getAll(idRestaurante, "cardapio", { orderByField: "criadoEm", order: "desc" });
  };

  const salvarNovoItem = async (formData) => {
    const { nome, categorias, valor, descricao, file, alergias, ingredientes, tipoTributacao } = formData;
    const tipoTributacaoNormalizado = tipoTributacao === "monofasico" ? "monofasico" : "normal";
    const monofasico = tipoTributacaoNormalizado === "monofasico";

    if (!nome || !valor || !file || categorias.length === 0) {
      throw new Error("Preencha todos os campos obrigatórios (inclua uma imagem).");
    }

    // Validar ingredientes se foram fornecidos
    if (ingredientes && ingredientes.length > 0) {
      const ingredientesInvalidos = ingredientes.filter(ing => 
        !ing.itemId || !ing.quantidade || parseFloat(ing.quantidade) <= 0
      );
      
      if (ingredientesInvalidos.length > 0) {
        throw new Error("Todos os ingredientes devem ter um item do estoque selecionado e quantidade válida.");
      }
    }

    // 1) sobe a imagem
    const { downloadURL, storagePath } = await uploadMenuImage(file, idRestaurante);

    // 2) monta o payload (mantendo imagemUrl)
    const data = {
      nome,
      descricao,
      valor: parseFloat(valor),
      categorias: categorias.map((c) => c.value),
      tipoTributacao: tipoTributacaoNormalizado,
      monofasico,
      imagemUrl: downloadURL,  // <- compatível com seu front
      storagePath,             // opcional: útil para deletar/trocar depois
      alergias: alergias || [],
    };

    // 3) cria o doc
    const docRef = await create(idRestaurante, "cardapio", data);
    
    // 4) salva os ingredientes se existirem
    if (ingredientes && ingredientes.length > 0) {
      try {
        await adicionarIngredientes(idRestaurante, docRef.id, ingredientes);
      } catch (error) {
        console.error("Erro ao salvar ingredientes:", error);
        // Se falhar ao salvar ingredientes, ainda manteremos o item do cardápio
        // mas notificaremos o usuário
        throw new Error("Item salvo, mas houve erro ao salvar os ingredientes. Edite o item para configurá-los novamente.");
      }
    }

    return docRef;
  };

  const atualizarItemCardapio = async (itemId, dados) => {
    if (!itemId) throw new Error("ID do item não informado para atualização.");

    const tipoTributacaoNormalizado = dados.tipoTributacao === "monofasico" ? "monofasico" : "normal";
    const monofasico = tipoTributacaoNormalizado === "monofasico";

    const payload = {
      nome: dados.nome,
      descricao: dados.descricao ?? "",
      categorias: Array.isArray(dados.categorias) ? dados.categorias : [],
      valor: dados.valor != null ? Number(dados.valor) : 0,
      tipoTributacao: tipoTributacaoNormalizado,
      monofasico,
    };

    await update(idRestaurante, "cardapio", itemId, payload);
  };

  const removerItemCardapio = async (itemId, storagePath) => {
    if (!itemId) throw new Error("ID do item não informado para exclusão.");

    await remove(idRestaurante, "cardapio", itemId);

    if (storagePath) {
      try {
        await deleteMenuImage(storagePath);
      } catch (err) {
        console.warn("Não foi possível remover a imagem do armazenamento:", err);
      }
    }
  };

  return { listarItensCardapio, salvarNovoItem, atualizarItemCardapio, removerItemCardapio };
}
