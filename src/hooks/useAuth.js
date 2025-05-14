import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
            setUser(firebaseUser);
            setChecking(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, checking, isAuthenticated: !!user };
};
