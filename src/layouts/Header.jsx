import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, UserCircle } from "react-coolicons";
import { useNavigate } from "react-router-dom";
import ConfigModal from "@/features/config/components/modals/ConfigModal"
import { logout } from "@/services/firebase/authService";
import NomeRestaurante from "@/components/NomeRestaurante";

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => setIsDropdownOpen((open) => !open);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 md:left-16 lg:left-64 bg-white shadow-md z-40 flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
      {/* Nome do restaurante */}
      <div className="text-lg font-medium text-gray-900 truncate">
        <NomeRestaurante />
      </div>

      {/* Ações à direita */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        <button className="relative p-1 rounded-full hover:bg-gray-100">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-amber-500 rounded-full"></span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white">
              <UserCircle size={16} />
            </div>
            <ChevronDown size={16} className="text-gray-600" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border z-50">
              <a
                href="#profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Perfil
              </a>
              <a
                href="#settings"
                onClick={(e) => {
                  e.preventDefault();
                  setIsConfigModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Configurações
              </a>
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
        </div>
      </div>
    </header>
  );
};

export default Header;
