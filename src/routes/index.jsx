// routes/index.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "../layouts/Layout";

// Importação das páginas
import Dashboard from "../pages/HomePage";
import Pedidos from "../pages/OrderPage";
import Cardapio from "../pages/MenuPage";
import Relatorios from "../pages/AdminDashboard";
import Promocoes from "../pages/PaymentPage"; 

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Dashboard />,
      },
      {
        path: "/pedidos",
        element: <Pedidos />,
      },
      {
        path: "/cardapio",
        element: <Cardapio />,
      },
      {
        path: "/relatorios",
        element: <Relatorios />,
      },
      {
        path: "/promocoes",
        element: <Promocoes />,
      },
    ],
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
