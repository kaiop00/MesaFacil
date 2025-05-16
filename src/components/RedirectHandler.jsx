import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const RedirectHandler = () => {
  const { user, checking } = useAuth();

  if (checking) return null;

  return user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
};

export default RedirectHandler;
