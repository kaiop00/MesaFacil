import React from "react";
import { logout } from "@/services/firebase/authService";

const LogoutButton = () => {
  const handleLogout = async () => {
    try {
      await logout();
      console.log("Usuário desconectado");
    } catch (error) {
      console.error("Erro ao fazer logout:", error.message);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
};

export default LogoutButton;
