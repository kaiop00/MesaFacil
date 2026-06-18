import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const RedirectHandler = () => {
  const { user, loading } = useAuth();

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

  // Usuário autenticado → sempre vai para o dashboard
  // Novos usuários chegam via /cadastro → /selecionar-plano (com state.idRestaurante)
  // e nunca passam por aqui
  return <Navigate to="/home" replace />;
};

export default RedirectHandler;
