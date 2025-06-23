import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

const PrivateRoute = () => {
    const { user, checking } = useAuth();

    if (checking) {
        return (
            <div className="h-screen flex items-center justify-center">
                <LoadingSpinner/>
            </div>
        );
    }

    return user ? <Outlet /> : <Navigate to="/home-page" replace />;
};


export default PrivateRoute;