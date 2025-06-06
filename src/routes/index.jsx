// routes/index.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/layouts/Layout";
import PrivateRoute from "@/components/PrivateRoute";
import RedirectHandler from "@/components/RedirectHandler";
import { Navigate } from "react-router-dom";


//Importação das páginas publicas
import LoginPage from "@/features/auth/pages/login/LoginPage";
import RegisterPage from "@/features/auth/pages/register/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/forgotPassword/ForgotPasswordPage";

// Importação das páginas privadas
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrderPage from "@/features/order/pages/OrderPage";
import FoodListPage from "@/features/foodList/pages/FoodListPage";
import ReportPage from "@/features/reports/pages/ReportPage";
import PromotionPage from "@/features/promotions/pages/PromotionPage";
import UsersPage from "@/features/users/pages/UsersPage";

//providers
import { CardapioProvider } from "@/features/foodList/context/CardapioContext";

const router = createBrowserRouter([
  // redireciona para /home ou /login
  {
    path: "/",
    element: <RedirectHandler />,
  },


  //rotas publicas
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/cadastro",
    element: <RegisterPage />,
  },
  {
    path: "/recuperar-senha",
    element: <ForgotPasswordPage />,
  },

  //rotas privadas
  {
    path: "/home",
    element: <PrivateRoute />, // garante proteção total do path
    children: [
      {
        path: "",
        element: <Layout />,
        children: [
          { path: "", element: <DashboardPage /> },
          { path: "pedidos", element: <OrderPage /> },
          { path: "cardapio", element: <CardapioProvider> <FoodListPage /> </CardapioProvider> },
          { path: "relatorios", element: <ReportPage /> },
          { path: "promocoes", element: <PromotionPage /> },
          { path: "usuarios", element: <UsersPage />}
        ],
      }
    ]
  },

  //redirecionamento de rota errada
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }

]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
