import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage, auth } from "@/config/firebaseConfig";
import { v4 as uuid } from "uuid";

/**
 * Sobe a imagem e retorna { downloadURL, storagePath }.
 * Caminho: images/{uid}/{restId}/{uuid.ext}
 */
const ensureFileIsImage = (file) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
        throw new Error("Arquivo inválido (precisa ser imagem).");
    }
};

const deleteAnyImage = async (storagePath) => {
    if (!storagePath) return;

    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
    } catch (error) {
        const ignorableErrors = [
            "storage/object-not-found",
            "storage/unauthorized",
            "storage/permission-denied"
        ];

        if (ignorableErrors.includes(error?.code)) {
            console.warn("[storageUpload] Ignoring delete error:", error?.code, storagePath);
            return;
        }

        throw error;
    }
};

const buildStorageTask = async (file, storagePath) => {
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
    });

    await new Promise((resolve, reject) => {
        task.on("state_changed", undefined, reject, resolve);
    });

    const downloadURL = await getDownloadURL(task.snapshot.ref);
    return { downloadURL, storagePath };
};

export async function uploadMenuImage(file, restId) {
    const uid = auth.currentUser && auth.currentUser.uid;
    if (!uid) throw new Error("Usuário não autenticado.");
    ensureFileIsImage(file);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const imageId = `${uuid()}.${ext}`;
    const storagePath = `images/${uid}/${restId}/${imageId}`;
    return await buildStorageTask(file, storagePath);
}

export async function uploadRestaurantImage(file, restId) {
    const uid = auth.currentUser && auth.currentUser.uid;
    if (!uid) throw new Error("Usuário não autenticado.");
    ensureFileIsImage(file);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Prefixo no próprio nome do arquivo para diferenciar das imagens do cardápio,
    // mantendo o mesmo caminho que já possui permissão nas regras.
    const imageId = `restaurant-${uuid()}.${ext}`;
    const storagePath = `images/${uid}/${restId}/${imageId}`;
    return await buildStorageTask(file, storagePath);
}

export async function deleteMenuImage(storagePath) {
    await deleteAnyImage(storagePath);
}

export async function deleteRestaurantImage(storagePath) {
    await deleteAnyImage(storagePath);
}
