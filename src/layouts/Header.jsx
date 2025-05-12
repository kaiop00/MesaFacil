// layouts/Header.jsx
import { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, UserCircle } from "react-coolicons";

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Nome do restaurante (poderia vir de um contexto ou prop)
  const restaurantName = "Luna Restaurante";

  // Função para alternar o dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Fecha o dropdown quando clica fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="fixed top-0 right-0 left-72 bg-white shadow-md py-3 px-6 flex justify-between items-center z-30">
      {/* Nome do restaurante - parte esquerda */}
      <div className="text-lg font-medium">{restaurantName}</div>

      {/* Parte direita: notificações e perfil */}
      <div className="flex items-center space-x-6">
        {/* Botão de notificações */}
        <button className="relative p-1 rounded-full hover:bg-gray-100">
          <Bell size={20} className="text-gray-600" />
          {/* Indicador de notificação */}
          <span className="absolute top-0 right-0 h-2 w-2 bg-amber-500 rounded-full"></span>
        </button>

        {/* Dropdown do perfil */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-2 py-1 px-2 rounded-full hover:bg-gray-100"
          >
            {/* Avatar do usuário */}
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white">
              <UserCircle size={16} />
            </div>

            <ChevronDown size={16} className="text-gray-600" />
          </button>

          {/* Menu dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
              <a
                href="#profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Perfil
              </a>
              <a
                href="#settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Configurações
              </a>
              <hr className="my-1" />
              <a
                href="#logout"
                className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Sair
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
