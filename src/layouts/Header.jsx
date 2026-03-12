import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, UserCircle } from "react-coolicons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ConfigModal from "@/features/config/components/modals/ConfigModal";
import ColorsConfigModal from "@/features/config/components/modals/ColorsConfigModal";
import ServiceFeeConfigModal from "@/features/config/components/modals/ServiceFeeConfigModal";
import CoverChargeConfigModal from "@/features/config/components/modals/CoverChargeConfigModal";
import { logout } from "@/services/firebase/authService";
import NomeRestaurante from "@/components/NomeRestaurante";
import { useImagemDoRestaurante } from "@/hooks/useImagemDoRestaurante";
import CategoriaConfigModal from "@/features/config/components/modals/CategoriasConfigModal";
import WhatsAppConfigModal from "@/features/config/components/modals/WhatsAppConfigModal";
import NotificationsModal from "@/features/notifications/components/NotificationsModal";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useIfoodDisputes } from "@/features/integrations/ifood/hooks/useIfoodDisputes";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import PlanInfo from "@/components/PlanInfo";
import stripeService from "@/services/stripeService";
import { useToast } from "@/hooks/useToast";
import { getStripeCustomerId } from "@/services/firebase/restaurantService";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isColorsConfigModalOpen, setIsColorsConfigModalOpen] = useState(false);
  const [isCategoriaConfigModalOpen, setIsCategoriaConfigModalOpen] = useState(false);
  const [isServiceFeeModalOpen, setIsServiceFeeModalOpen] = useState(false);
  const [isCoverChargeModalOpen, setIsCoverChargeModalOpen] = useState(false);
  const [isWhatsAppConfigModalOpen, setIsWhatsAppConfigModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const languageDropdownRef = useRef(null);
  const navigate = useNavigate();
  const imagemRestaurante = useImagemDoRestaurante();
  const { idRestaurante } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAllAsRead, markOneAsRead } = useNotifications(idRestaurante);
  const { disputes: pendingDisputes, pendingCount: disputeCount } = useIfoodDisputes(idRestaurante);
  const totalBadgeCount = unreadCount + disputeCount;
  const { notify } = useToast();

  const toggleDropdown = () => setIsDropdownOpen((open) => !open);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setIsLanguageDropdownOpen(false);
  };

  const handleBillingPortal = async () => {
    try {
      setIsDropdownOpen(false);
      setIsSubMenuOpen(false);
      
      // Check if restaurant has Stripe customer ID
      if (!idRestaurante) {
        notify('ID do restaurante não encontrado.', 'error');
        return;
      }

      // Get Stripe customer ID from restaurant document
      const stripeCustomerId = await getStripeCustomerId(idRestaurante);

      // Check if restaurant has a Stripe customer ID
      if (!stripeCustomerId) {
        notify('Você está no plano gratuito. Escolha um plano pago para continuar.', 'info');
        navigate('/selecionar-plano');
        return;
      }

      // Check if restaurant has an active subscription
      try {
        const subscriptionData = await stripeService.getCustomerSubscription(stripeCustomerId);
        
        if (!subscriptionData.subscription) {
          // No subscription found, redirect to plan selection
          notify('Você não possui uma assinatura ativa. Escolha um plano para continuar.', 'info');
          navigate('/selecionar-plano');
          return;
        }

        // Has subscription, redirect to billing portal
        notify('Redirecionando para o portal de faturamento...', 'info');
        await stripeService.redirectToBillingPortal(stripeCustomerId);
      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        // On error checking subscription, redirect to plan selection as fallback
        notify('Redirecionando para seleção de planos...', 'info');
        navigate('/selecionar-plano');
      }
    } catch (error) {
      console.error('Erro ao acessar portal de faturamento:', error);
      notify('Erro ao acessar o portal de faturamento. Tente novamente.', 'error');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setIsSubMenuOpen(false);
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target)) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 md:left-16 lg:left-64 bg-white shadow-md z-40 flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">  
      {/* Nome do restaurante */}
      <div className="text-lg font-medium text-gray-900 truncate ml-12 md:ml-0">
        <NomeRestaurante />
      </div>

      {/* Ações à direita */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Informações do plano (oculto em mobile) */}
        <div className="hidden lg:block">
          <PlanInfo />
        </div>
        {/* Language Selector */}
        <div className="relative" ref={languageDropdownRef}>
          <button
            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">
              {i18n.language === "pt-BR" ? "🇧🇷" : i18n.language === "es" ? "🇪🇸" : i18n.language === "it" ? "🇮🇹" : i18n.language === "fr" ? "🇫🇷" : "🇺🇸"}
            </span>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {i18n.language === "pt-BR" ? "PT-BR" : i18n.language === "es" ? "ES" : i18n.language === "it" ? "IT" : i18n.language === "fr" ? "FR" : "EN"}
            </span>
            <ChevronDown size={14} className="text-gray-600" />
          </button>

          {isLanguageDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 border z-50">
              <button
                onClick={() => changeLanguage("pt-BR")}
                className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  i18n.language === "pt-BR" ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="mr-2 text-lg">🇧🇷</span>
                {t("common:languages.pt-BR")}
              </button>
              <button
                onClick={() => changeLanguage("en")}
                className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  i18n.language === "en" ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="mr-2 text-lg">🇺🇸</span>
                {t("common:languages.en")}
              </button>
              <button
                onClick={() => changeLanguage("es")}
                className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  i18n.language === "es" ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="mr-2 text-lg">🇪🇸</span>
                {t("common:languages.es")}
              </button>
              <button
                onClick={() => changeLanguage("it")}
                className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  i18n.language === "it" ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="mr-2 text-lg">🇮🇹</span>
                {t("common:languages.it")}
              </button>
              <button
                onClick={() => changeLanguage("fr")}
                className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  i18n.language === "fr" ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="mr-2 text-lg">🇫🇷</span>
                {t("common:languages.fr")}
              </button>
            </div>
          )}
        </div>

        <button
          className="relative p-1 rounded-full hover:bg-gray-100"
          onClick={() => setIsNotificationsOpen(true)}
        >
          <Bell size={20} className="text-gray-600" />
          {totalBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-primary-dynamic text-white text-[10px] leading-4 rounded-full flex items-center justify-center">
              {totalBadgeCount}
            </span>
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-primary-dynamic flex items-center justify-center text-white overflow-hidden">
              {imagemRestaurante ? (
                <img
                  src={imagemRestaurante}
                  alt="Logo Restaurante"
                  className="w-full h-full object-cover circle"
                />
              ) : (
                <UserCircle size={16} />
              )}
            </div>
            <ChevronDown size={16} className="text-gray-600" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border z-50">
              {/* Submenu Configurações */}
              <div
                className="relative"
                onMouseEnter={() => setIsSubMenuOpen(true)}
              >
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {t("common:header.settings")}
                </button>

                {isSubMenuOpen && (
                  <div className="absolute top-0 right-full mr-1 w-48 bg-white rounded-md shadow-lg py-1 border z-50">
                    {(isAdmin() || hasPermission('manage_tables')) && (
                      <button
                        onClick={() => {
                          setIsConfigModalOpen(true);
                          setIsDropdownOpen(false);
                          setIsSubMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t("common:header.tables")}
                      </button>
                    )}
                    {(isAdmin() || hasPermission('manage_colors')) && (
                      <button
                        onClick={() => {
                          setIsColorsConfigModalOpen(true);
                          setIsDropdownOpen(false);
                          setIsSubMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t("common:header.photoColors")}
                      </button>
                    )}
                    {(isAdmin() || hasPermission('manage_categories')) && (
                      <button
                        onClick={() => {
                          setIsCategoriaConfigModalOpen(true);
                          setIsDropdownOpen(false);
                          setIsSubMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t("common:header.categories")}
                      </button>
                    )}
                    {(isAdmin() || hasPermission('manage_service_fee')) && (
                      <button
                        onClick={() => {
                          setIsServiceFeeModalOpen(true);
                          setIsDropdownOpen(false);
                          setIsSubMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t("common:header.serviceFee", "Taxa de serviço")}
                      </button>
                    )}
                    {(isAdmin() || hasPermission('manage_cover_charge')) && (
                      <button
                        onClick={() => {
                          setIsCoverChargeModalOpen(true);
                          setIsDropdownOpen(false);
                          setIsSubMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t("common:header.coverCharge", "Couvert Artístico")}
                      </button>
                    )}
                    {(isAdmin() || hasPermission('manage_whatsapp_menu')) && (
                      <button
                        onClick={() => {
                          setIsWhatsAppConfigModalOpen(true);
                          setIsDropdownOpen(false);
                          setIsSubMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Cardápio para WhatsApp
                      </button>
                    )}
                    {(isAdmin() || hasPermission('manage_billing')) && (
                      <button
                        onClick={handleBillingPortal}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Gerenciar Assinatura
                      </button>
                    )}
                  </div>
                )}
              </div>

              <hr className="my-1" />
              <a
                href="#logout"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await logout();
                    navigate("/home-page");
                  } catch (error) {
                    console.error("Erro ao fazer logout:", error.message);
                  }
                }}
                className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                {t("common:header.logout")}
              </a>
            </div>
          )}

          <ConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
          />
          <ColorsConfigModal
            isOpen={isColorsConfigModalOpen}
            onClose={() => setIsColorsConfigModalOpen(false)}
          />
          <CategoriaConfigModal
            isOpen={isCategoriaConfigModalOpen}
            onClose={() => setIsCategoriaConfigModalOpen(false)}
          />
          <ServiceFeeConfigModal
            isOpen={isServiceFeeModalOpen}
            onClose={() => setIsServiceFeeModalOpen(false)}
          />
          <CoverChargeConfigModal
            isOpen={isCoverChargeModalOpen}
            onClose={() => setIsCoverChargeModalOpen(false)}
          />
          <WhatsAppConfigModal
            isOpen={isWhatsAppConfigModalOpen}
            onClose={() => setIsWhatsAppConfigModalOpen(false)}
          />
        </div>
      </div>

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAll={markAllAsRead}
        onMarkOne={markOneAsRead}
        onView={(mesaId) => {
          setIsNotificationsOpen(false);
          navigate(`/home/pedidos?mesaId=${encodeURIComponent(mesaId)}`);
        }}
        loading={loading}
        pendingDisputes={pendingDisputes}
        onViewDisputes={() => {
          setIsNotificationsOpen(false);
          navigate("/home/integracoes/ifood?tab=disputes");
        }}
      />
    </header>
  );
};

export default Header;
