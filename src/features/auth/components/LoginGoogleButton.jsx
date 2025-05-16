import React from "react";
import { loginWithGoogle } from "@/services/firebase/authService";

const LoginGoogleButton = () => {
  const handleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      console.log("Usuário logado:", user);
    } catch (error) {
      console.error("Erro no login:", error.message);
    }
  };

  return <button onClick={handleLogin}>Login com Google</button>;
};

export default LoginGoogleButton;
