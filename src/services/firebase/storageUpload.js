import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage, auth } from "@/config/firebaseConfig";
import { v4 as uuid } from "uuid";

/**
 * Sobe a imagem e retorna { downloadURL, storagePath }.
 * Caminho: images/{uid}/{restId}/{uuid.ext}
 */
export async function uploadMenuImage(file, restId) {
    const uid = auth.currentUser && auth.currentUser.uid;
    if (!uid) throw new Error("Usuário não autenticado.");
    if (!file || !file.type || !file.type.startsWith("image/")) {
        throw new Error("Arquivo inválido (precisa ser imagem).");
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const imageId = `${uuid()}.${ext}`;
    const storagePath = `images/${uid}/${restId}/${imageId}`;
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
}
