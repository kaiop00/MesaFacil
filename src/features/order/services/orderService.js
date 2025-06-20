import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

export const getMesasPorStatus = async (idRestaurante) => {
    const mesasRef = collection(db, "restaurantes", idRestaurante, "mesas");
    const snapshot = await getDocs(mesasRef);

    const mesas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log("TODAS AS MESAS:", mesas);

    const andamento = mesas.filter((m) => {
        console.log("MESA PARA ANDAMENTO:", m);
        return m.status?.trim().toLowerCase() === "ocupada";
    });

    const livres = mesas.filter((m) => {
        console.log("MESA PARA LIVRE:", m);
        return m.status?.trim().toLowerCase() === "livre";
    });

    return { andamento, livres };
};
