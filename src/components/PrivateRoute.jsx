import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanManagement } from "@/hooks/usePlanManagement";
import LoadingSpinner from "./LoadingSpinner";

const PrivateRoute = () => {
    const auth = useAuth();
    const planState = usePlanManagement();
    const user = auth?.user ?? null;
    const loading = auth?.loading ?? true;
    const hasActivePlan = planState?.hasActivePlan ?? false;
    const planLoading = planState?.planLoading ?? true;

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