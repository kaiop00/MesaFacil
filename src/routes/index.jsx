// routes/index.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/layouts/Layout";
import PrivateRoute from "@/components/PrivateRoute";
import RequireFeature from "@/components/RequireFeature";
import RedirectHandler from "@/components/RedirectHandler";
import ErrorBoundary from "@/components/ErrorBoundary";

//Importação das páginas de erro
import ErrorPage from "@/pages/ErrorPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { FEATURE_FLAGS } from "@/constants/planFeatures";

//Importação das páginas estáticas
import PrivacyPage from "@/static/privacy/PrivacyPage";
import TermsPage from "@/static/terms/TermsPage.jsx";

//Importação das páginas publicas
import LoginPage from "@/features/auth/pages/login/LoginPage";
import RegisterPage from "@/features/auth/pages/register/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/forgotPassword/ForgotPasswordPage";
import MainPage from "@/features/auth/pages/MainPage";
import PlanSelectionPage from "@/features/auth/pages/planSelection/PlanSelectionPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";


// Importação das páginas privadas
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrderPage from "@/features/order/pages/OrderPage";
import FoodListPage from "@/features/foodList/pages/FoodListPage";
import ReportPage from "@/features/reports/pages/ReportPage";
import PromotionPage from "@/features/promotions/pages/PromotionPage";
import UsersPage from "@/features/users/pages/UsersPage";
import ItemsPage from "@/features/items/pages/ItemsPage";
import MovementsPage from "@/features/movements/pages/MovementsPage";
import KitchenPage from "@/features/kitchen/pages/KitchenPage";

//providers
import { CardapioProvider } from "@/features/foodList/context/CardapioContext";
import { TablesProvider } from "@/features/config/context/TablesContext";
import MesaPage from "@/features/cliente/pages/MesaPage";
import ClienteLayout from "@/features/cliente/layout/ClienteLayout";
import SacolaPage from "@/features/cliente/pages/SacolaPage";
import PedidoClientePage from "@/features/cliente/pages/PedidoClientePage";

const router = createBrowserRouter([
  // redireciona para /home ou /login
  {
    path: "/",
    element: <RedirectHandler />,
    errorElement: <ErrorPage />,
  },

  //rotas publicas
  {
    path: "/home-page",
    element: <MainPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/cadastro",
    element: <RegisterPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/recuperar-senha",
    element: <ForgotPasswordPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/selecionar-plano",
    element: <PlanSelectionPage />,
  },
  {
    path: "/payment-success",
    element: <PaymentSuccessPage />,
  },
  {
    path: "/politica-privacidade",
    element: <PrivacyPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/termos",
    element: <TermsPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "mesa/:slug",
    element: <ClienteLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <MesaPage /> },
      { path: "sacola", element: <SacolaPage /> },
      { path: "pedido", element: <PedidoClientePage /> }
    ]
  },

  //rotas privadas
  {
    path: "/home",
    element: <PrivateRoute />, // garante proteção total do path
    errorElement: <ErrorPage />,
    children: [
      {
        path: "",
        element: (
          <TablesProvider>
            <Layout />
          </TablesProvider>
        ),
        children: [
          { path: "", element: <DashboardPage /> },
          { path: "pedidos", element: <OrderPage /> },
          { path: "cozinha", element: <KitchenPage /> },
          { path: "cardapio", element: <CardapioProvider> <FoodListPage /> </CardapioProvider> },
          { path: "relatorios", element: <ReportPage /> },
          { 
            path: "promocoes", 
            element: <PromotionPage />  // Promoções disponíveis para todos os planos
          },
        { 
          path: "usuarios", 
          element: (
            <RequireFeature
              feature={FEATURE_FLAGS.EMPLOYEE_MANAGEMENT}
              featureName="Gerenciamento de Funcionários"
              requiredPlan="monthly"
              description="Gerencie sua equipe com controle completo de permissões e acessos. Adicione funcionários, defina papéis e acompanhe atividades."
              benefits={[
                "Criação ilimitada de usuários",
                "Controle granular de permissões",
                "Diferentes papéis (admin, garçom, cozinha)",
                "Histórico de atividades por usuário",
                "Ativação e desativação de contas",
                "Gerenciamento de senhas e acessos"
              ]}
            >
              <UsersPage />
            </RequireFeature>
          )
        },
        { 
          path: "itens", 
          element: (
              <RequireFeature
                feature={FEATURE_FLAGS.INVENTORY_CONTROL}
                featureName="Controle de Estoque"
                requiredPlan="monthly"
                description="Gerencie seu estoque de ingredientes e itens com precisão. Controle entradas, saídas e acompanhe o saldo em tempo real."
                benefits={[
                  "Cadastro ilimitado de itens e ingredientes",
                  "Controle de estoque em tempo real",
                  "Histórico completo de movimentações",
                  "Alertas de estoque baixo",
                  "Relatórios de consumo e desperdício"
                ]}
              >
                <ItemsPage />
              </RequireFeature>
            )
          },
          { 
            path: "movimentacao", 
            element: (
              <RequireFeature
                feature={FEATURE_FLAGS.INVENTORY_CONTROL}
                featureName="Movimentações de Estoque"
                requiredPlan="monthly"
                description="Registre e acompanhe todas as movimentações do seu estoque. Controle entradas, saídas e ajustes com histórico detalhado."
                benefits={[
                  "Registro de todas as entradas e saídas",
                  "Histórico completo de movimentações",
                  "Rastreabilidade de produtos",
                  "Análise de consumo por período",
                  "Identificação de perdas e desperdícios"
                ]}
              >
                <MovementsPage />
              </RequireFeature>
            )
          },
        ],
      }
    ]
  },

  //redirecionamento de rota errada
  {
    path: "*",
    element: <NotFoundPage />,
  }
]);

const AppRouter = () => {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
};

export default AppRouter;
