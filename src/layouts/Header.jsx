import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, UserCircle } from "react-coolicons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";
import ConfigModal from "@/features/config/components/modals/ConfigModal";
import ColorsConfigModal from "@/features/config/components/modals/ColorsConfigModal";
import ServiceFeeConfigModal from "@/features/config/components/modals/ServiceFeeConfigModal";
import { logout } from "@/services/firebase/authService";
import NomeRestaurante from "@/components/NomeRestaurante";
import { useImagemDoRestaurante } from "@/hooks/useImagemDoRestaurante";
import CategoriaConfigModal from "@/features/config/components/modals/CategoriasConfigModal";
import NotificationsModal from "@/features/notifications/components/NotificationsModal";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import PlanInfo from "@/components/PlanInfo";
import PixConfigModal from "@/features/config/components/modals/PixConfigModal";
import stripeService from "@/services/stripeService";
import { useToast } from "@/hooks/useToast";
import { db } from "@/config/firebaseConfig";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isColorsConfigModalOpen, setIsColorsConfigModalOpen] = useState(false);
  const [isCategoriaConfigModalOpen, setIsCategoriaConfigModalOpen] = useState(false);
  const [isServiceFeeModalOpen, setIsServiceFeeModalOpen] = useState(false);
  const [isPixConfigModalOpen, setIsPixConfigModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const languageDropdownRef = useRef(null);
  const navigate = useNavigate();
  const imagemRestaurante = useImagemDoRestaurante();
  const { idRestaurante, user } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAllAsRead, markOneAsRead } = useNotifications(idRestaurante);
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
      
      // Fetch user data from Firestore to get stripeCustomerId
      if (!user?.uid) {
        notify('Usuário não autenticado.', 'error');
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        notify('Dados do usuário não encontrados.', 'error');
        return;
      }

      const userData = userDocSnap.data();
      const stripeCustomerId = userData?.stripeCustomerId;

      // Check if user has a Stripe customer ID
      if (!stripeCustomerId) {
        notify('Você está no plano gratuito. Escolha um plano pago para continuar.', 'info');
        navigate('/selecionar-plano');
        return;
      }

      notify('Redirecionando para o portal de faturamento...', 'info');
      await stripeService.redirectToBillingPortal(stripeCustomerId);
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
              {i18n.language === "pt-BR" ? "🇧🇷" : "🇺🇸"}
            </span>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {i18n.language === "pt-BR" ? "PT-BR" : "EN"}
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
            </div>
          )}
        </div>

        <button
          className="relative p-1 rounded-full hover:bg-gray-100"
          onClick={() => setIsNotificationsOpen(true)}
        >
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-primary-dynamic text-white text-[10px] leading-4 rounded-full flex items-center justify-center">
              {unreadCount}
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
                    <button
                      onClick={() => {
                        setIsPixConfigModalOpen(true);
                        setIsDropdownOpen(false);
                        setIsSubMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {t("common:header.pix")}
                    </button>
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
                    <button
                      onClick={handleBillingPortal}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Gerenciar Assinatura
                    </button>
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
          <PixConfigModal
            isOpen={isPixConfigModalOpen}
            onClose={() => setIsPixConfigModalOpen(false)}
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
      />
    </header>
  );
};

export default Header;
