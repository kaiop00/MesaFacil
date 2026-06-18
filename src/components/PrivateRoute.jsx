import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const PrivateRoute = () => {
    const auth = useAuth();
    const user = auth?.user ?? null;
    const loading = auth?.loading ?? true;

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <LoadingSpinner/>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/home-page" replace />;
    }

    return <Outlet />;
};


export default PrivateRoute;