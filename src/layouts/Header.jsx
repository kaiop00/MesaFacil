import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, UserCircle } from "react-coolicons";
import { useNavigate } from "react-router-dom";
import ConfigModal from "@/features/config/components/modals/ConfigModal";
import ColorsConfigModal from "@/features/config/components/modals/ColorsConfigModal";
import PlanManagementModal from "@/features/config/components/modals/PlanManagementModal";
import { logout } from "@/services/firebase/authService";
import NomeRestaurante from "@/components/NomeRestaurante";
import { useImagemDoRestaurante } from "@/hooks/useImagemDoRestaurante";
import CategoriaConfigModal from "@/features/config/components/modals/CategoriasConfigModal";
import NotificationsModal from "@/features/notifications/components/NotificationsModal";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import PlanInfo from "@/components/PlanInfo";

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isColorsConfigModalOpen, setIsColorsConfigModalOpen] = useState(false);
  const [isCategoriaConfigModalOpen, setIsCategoriaConfigModalOpen] = useState(false);
  const [isPlanManagementModalOpen, setIsPlanManagementModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const imagemRestaurante = useImagemDoRestaurante();
  const { idRestaurante } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, unreadCount, loading, markAllAsRead, markOneAsRead } = useNotifications(idRestaurante);

  const toggleDropdown = () => setIsDropdownOpen((open) => !open);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setIsSubMenuOpen(false);
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
                  Configurações
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
                      Mesas
                    </button>
                    <button
                      onClick={() => {
                        setIsColorsConfigModalOpen(true);
                        setIsDropdownOpen(false);
                        setIsSubMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Foto/Cores
                    </button>
                    <button
                      onClick={() => {
                        setIsCategoriaConfigModalOpen(true);
                        setIsDropdownOpen(false);
                        setIsSubMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Categorias
                    </button>
                    <button
                      onClick={() => {
                        setIsPlanManagementModalOpen(true);
                        setIsDropdownOpen(false);
                        setIsSubMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Plano
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
                Sair
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
          <PlanManagementModal
            isOpen={isPlanManagementModalOpen}
            onClose={() => setIsPlanManagementModalOpen(false)}
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
