import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanManagement } from "@/hooks/usePlanManagement";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useState, useEffect } from "react";

const RedirectHandler = () => {
  const { user, loading } = useAuth();
  const { hasActivePlan, planLoading } = usePlanManagement();
  const [shouldCheckPlans, setShouldCheckPlans] = useState(false);

  // Aguarda a autenticação antes de verificar planos
  useEffect(() => {
    if (!loading && user) {
      setShouldCheckPlans(true);
    }
  }, [loading, user]);

  console.log('RedirectHandler - loading:', loading, 'user:', !!user, 'planLoading:', planLoading, 'hasActivePlan:', hasActivePlan);

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

  // Se ainda não deve verificar planos ou está carregando, aguarda
  if (!shouldCheckPlans || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Se o usuário está logado mas não tem plano ativo, redireciona para seleção de plano
  if (!hasActivePlan) {
    return <Navigate to="/selecionar-plano" replace />;
  }

  // Se tem plano ativo, vai para o dashboard
  return <Navigate to="/home" replace />;
};

export default RedirectHandler;
