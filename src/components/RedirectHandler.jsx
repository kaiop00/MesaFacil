import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const RedirectHandler = () => {
  const { user, idRestaurante, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/home-page" replace />;
  }

  // Usuário sem restaurante vinculado = conta recém-criada → seleção de plano
  if (!idRestaurante) {
    return <Navigate to="/selecionar-plano" replace />;
  }

  // Usuário existente com restaurante → vai direto para o dashboard
  return <Navigate to="/home" replace />;
};

export default RedirectHandler;
