import { useEffect } from "react";
import { db } from "@/config/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export const useFirebaseTest = () => {
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "testCollection"));
        querySnapshot.forEach((doc) => {
          console.log(`${doc.id} =>`, doc.data());
        });
      } catch (error) {
        console.error("Erro ao acessar Firestore:", error);
      }
    };

    fetchData();
  }, []);
};
