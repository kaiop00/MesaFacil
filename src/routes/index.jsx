// routes/index.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "../layouts/Layout";
import PrivateRoute from "../components/PrivateRoute";
import RedirectHandler from "../components/RedirectHandler";
import { Navigate } from "react-router-dom"; 


//Importação das páginas publicas
import Login from "../pages/auth/login/index";
import Cadastro from "../pages/auth/register/index";
import ForgotPassword from "../pages/auth/forgotPassword";

// Importação das páginas privadas
import Dashboard from "../pages/HomePage";
import Pedidos from "../pages/OrderPage";
import Cardapio from "../pages/MenuPage";
import Relatorios from "../pages/AdminDashboard";
import Promocoes from "../pages/PaymentPage";

const router = createBrowserRouter([
  // redireciona para /home ou /login
  {
    path: "/",
    element: <RedirectHandler />,
  },


  //rotas publicas
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/cadastro",
    element: <Cadastro />,
  },
  {
    path: "/recuperar-senha",
    element: <ForgotPassword />,
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
          { path: "", element: <Dashboard /> },
          { path: "pedidos", element: <Pedidos /> },
          { path: "cardapio", element: <Cardapio /> },
          { path: "relatorios", element: <Relatorios /> },
          { path: "promocoes", element: <Promocoes /> },
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
