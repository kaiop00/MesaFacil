import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

async function addUserToFirestore(uid, name, email, role, idRestaurante) {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, {
    name,
    email,
    role,
    idRestaurante,
    status: 'Ativo',
    createdAt: serverTimestamp()
  });
}

export default addUserToFirestore;