// routes/index.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/layouts/Layout";
import PrivateRoute from "@/components/PrivateRoute";
import RedirectHandler from "@/components/RedirectHandler";
import { Navigate } from "react-router-dom";

//Importação das páginas estáticas
import PrivacyPage from "@/static/privacy/PrivacyPage";
import TermsPage from "@/static/terms/TermsPage.jsx";

//Importação das páginas publicas
import LoginPage from "@/features/auth/pages/login/LoginPage";
import RegisterPage from "@/features/auth/pages/register/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/forgotPassword/ForgotPasswordPage";
import MainPage from "@/features/auth/pages/MainPage";


// Importação das páginas privadas
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrderPage from "@/features/order/pages/OrderPage";
import FoodListPage from "@/features/foodList/pages/FoodListPage";
import ReportPage from "@/features/reports/pages/ReportPage";
import PromotionPage from "@/features/promotions/pages/PromotionPage";
import UsersPage from "@/features/users/pages/UsersPage";
import ItemsPage from "@/features/items/pages/ItemsPage";

//providers
import { CardapioProvider } from "@/features/foodList/context/CardapioContext";
import { TablesProvider } from "@/features/config/context/TablesContext";
import MesaPage from "@/features/cliente/pages/MesaPage";

const router = createBrowserRouter([
  // redireciona para /home ou /login
  {
    path: "/",
    element: <RedirectHandler />,
  },

  //rotas publicas
  {
    path: "/home-page",
    element: <MainPage />,
  },
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
  {
    path: "/politica-privacidade",
    element: <PrivacyPage />
  },
  {
    path: "/termos",
    element: <TermsPage />
  },
  {
    path: "mesa/:slug",
    element: (
      <MesaPage />
    )
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
          { path: "pedidos", element: <TablesProvider> <OrderPage /> </TablesProvider> },
          { path: "cardapio", element: <CardapioProvider> <FoodListPage /> </CardapioProvider> },
          { path: "relatorios", element: <ReportPage /> },
          { path: "promocoes", element: <PromotionPage /> },
          { path: "usuarios", element: <UsersPage /> },
          { path: "itens", element: <ItemsPage /> },
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
