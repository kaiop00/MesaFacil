import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";
import Layout from "@/layouts/Layout";
import PrivateRoute from "@/components/PrivateRoute";
import RequireFeature from "@/components/RequireFeature";
import RequirePermission from "@/components/RequirePermission";
import RedirectHandler from "@/components/RedirectHandler";
import ErrorBoundary from "@/components/ErrorBoundary";

import ErrorPage from "@/pages/ErrorPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { FEATURE_FLAGS } from "@/constants/planFeatures";

import PrivacyPage from "@/static/privacy/PrivacyPage";
import TermsPage from "@/static/terms/TermsPage.jsx";

import LoginPage from "@/features/auth/pages/login/LoginPage";
import RegisterPage from "@/features/auth/pages/register/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/forgotPassword/ForgotPasswordPage";
import MainPage from "@/features/auth/pages/MainPage";
import PlanSelectionPage from "@/features/auth/pages/planSelection/PlanSelectionPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrderPage from "@/features/order/pages/OrderPage";
import FoodListPage from "@/features/foodList/pages/FoodListPage";
import ReportPage from "@/features/reports/pages/ReportPage";
import PromotionPage from "@/features/promotions/pages/PromotionPage";
import UsersPage from "@/features/users/pages/UsersPage";
import ItemsPage from "@/features/items/pages/ItemsPage";
import MovementsPage from "@/features/movements/pages/MovementsPage";
import KitchenPage from "@/features/kitchen/pages/KitchenPage";
import IfoodIntegrationPage from "@/features/integrations/ifood/pages/IfoodIntegrationPage";
import WhatsAppPage from "@/features/config/pages/WhatsAppPage";
import ImpressoraSetorPage from "@/features/config/pages/ImpressoraSetorPage";
import ConfigFiscalPage from "@/features/fiscal/pages/ConfigFiscalPage";
import NfceListPage from "@/features/fiscal/pages/NfceListPage";
import NfceDemoPage from "@/features/fiscal/pages/NfceDemoPage";
import CaixaAtual from "@/features/caixa/pages/CaixaAtual";
import AbrirCaixa from "@/features/caixa/pages/AbrirCaixa";
import LancamentoManual from "@/features/caixa/pages/LancamentoManual";
import Movimentacoes from "@/features/caixa/pages/Movimentacoes";
import HistoricoCaixas from "@/features/caixa/pages/HistoricoCaixas";

import { CardapioProvider } from "@/features/foodList/context/CardapioContext";
import { TablesProvider } from "@/features/config/context/TablesContext";
import MesaPage from "@/features/cliente/pages/MesaPage";
import ClienteLayout from "@/features/cliente/layout/ClienteLayout";
import SacolaPage from "@/features/cliente/pages/SacolaPage";
import PedidoClientePage from "@/features/cliente/pages/PedidoClientePage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RedirectHandler />} />

      <Route path="/home-page" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      <Route path="/selecionar-plano" element={<PlanSelectionPage />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="/politica-privacidade" element={<PrivacyPage />} />
      <Route path="/termos" element={<TermsPage />} />

      <Route path="mesa/:slug" element={<ClienteLayout />}>
        <Route index element={<MesaPage />} />
        <Route path="sacola" element={<SacolaPage />} />
        <Route path="pedido" element={<PedidoClientePage />} />
      </Route>

      <Route
        path="/home"
        element={<PrivateRoute />}
      >
        <Route
          element={
            <TablesProvider>
              <Layout />
            </TablesProvider>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pedidos" element={<OrderPage />} />
          <Route path="cozinha" element={<KitchenPage />} />
          <Route
            path="cardapio"
            element={
              <CardapioProvider>
                <FoodListPage />
              </CardapioProvider>
            }
          />
          <Route path="relatorios" element={<ReportPage />} />
          <Route path="promocoes" element={<PromotionPage />} />

          <Route
            path="usuarios"
            element={
              <RequireFeature
                feature={FEATURE_FLAGS.EMPLOYEE_MANAGEMENT}
                featureName="Gerenciamento de Funcionarios"
                requiredPlan="monthly"
                description="Gerencie sua equipe com controle completo de permissões e acessos. Adicione funcionarios, defina papeis e acompanhe atividades."
                benefits={[
                  "Criacao ilimitada de usuarios",
                  "Controle granular de permissoes",
                  "Diferentes papeis (admin, garcom, cozinha)",
                  "Historico de atividades por usuario",
                  "Ativacao e desativacao de contas",
                  "Gerenciamento de senhas e acessos",
                ]}
              >
                <UsersPage />
              </RequireFeature>
            }
          />

          <Route
            path="itens"
            element={
              <RequireFeature
                feature={FEATURE_FLAGS.INVENTORY_CONTROL}
                featureName="Controle de Estoque"
                requiredPlan="monthly"
                description="Gerencie seu estoque de ingredientes e itens com precisão. Controle entradas, saidas e acompanhe o saldo em tempo real."
                benefits={[
                  "Cadastro ilimitado de itens e ingredientes",
                  "Controle de estoque em tempo real",
                  "Historico completo de movimentacoes",
                  "Alertas de estoque baixo",
                  "Relatorios de consumo e desperdicio",
                ]}
              >
                <ItemsPage />
              </RequireFeature>
            }
          />

          <Route
            path="movimentacao"
            element={
              <RequireFeature
                feature={FEATURE_FLAGS.INVENTORY_CONTROL}
                featureName="Movimentacoes de Estoque"
                requiredPlan="monthly"
                description="Registre e acompanhe todas as movimentacoes do seu estoque. Controle entradas, saidas e ajustes com historico detalhado."
                benefits={[
                  "Registro de todas as entradas e saidas",
                  "Historico completo de movimentacoes",
                  "Rastreabilidade de produtos",
                  "Analise de consumo por periodo",
                  "Identificacao de perdas e desperdicios",
                ]}
              >
                <MovementsPage />
              </RequireFeature>
            }
          />

          <Route
            path="integracoes/ifood"
            element={
              <RequirePermission permission="manage_ifood_integration">
                <IfoodIntegrationPage />
              </RequirePermission>
            }
          />
          <Route path="whatsapp" element={<WhatsAppPage />} />
          <Route path="impressoras-setor" element={<ImpressoraSetorPage />} />
          <Route path="fiscal" element={<ConfigFiscalPage />} />
          <Route path="nfce-emitidas" element={<NfceListPage />} />
          <Route path="nfce-demo" element={<NfceDemoPage />} />
          <Route path="caixa" element={<CaixaAtual />} />
          <Route path="caixa/abrir" element={<AbrirCaixa />} />
          <Route path="caixa/lancamento" element={<LancamentoManual />} />
          <Route path="caixa/movimentacoes" element={<Movimentacoes />} />
          <Route path="caixa/historico" element={<HistoricoCaixas />} />
        </Route>
      </Route>

      <Route path="/erro" element={<ErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const AppRouter = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default AppRouter;
