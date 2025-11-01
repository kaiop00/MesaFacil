import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanManagement } from "@/hooks/usePlanManagement";
import LoadingSpinner from "./LoadingSpinner";

const PrivateRoute = () => {
    const { user, loading } = useAuth();
    const { hasActivePlan, planLoading } = usePlanManagement();

    if (loading || planLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <LoadingSpinner/>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/home-page" replace />;
    }

    if (!hasActivePlan) {
        return <Navigate to="/selecionar-plano" replace />;
    }

    return <Outlet />;
};


export default PrivateRoute;