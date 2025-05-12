// Sidebar
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  House03,
  ListUnordered,
  Coffee,
  FileDocument,
  ArrowDownUp,
  HamburgerLg,
} from "react-coolicons";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta o tamanho da tela para ajustar o sidebar automaticamente
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Links de navegação com seus ícones e rotas
  const navLinks = [
    { name: "Dashboard", icon: <House03 size={20} />, path: "/" },
    { name: "Pedidos", icon: <ListUnordered size={20} />, path: "/pedidos" },
    { name: "Cardápio", icon: <Coffee size={20} />, path: "/cardapio" },
    {
      name: "Relatórios",
      icon: <FileDocument size={20} />,
      path: "/relatorios",
    },
    { name: "Promoções", icon: <ArrowDownUp size={20} />, path: "/promocoes" },
  ];

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Botão de hambúrguer móvel */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed z-50 top-4 left-4 p-2 rounded-md bg-yellow-500 text-white md:hidden"
          aria-label="Toggle menu"
        >
          <HamburgerLg size={20} />
        </button>
      )}

      {/* Overlay para fechar o menu em dispositivos móveis */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar principal */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-md z-40
          transition-all duration-300 ease-in-out
          ${isOpen ? "w-74 translate-x-0" : "w-0 -translate-x-full md:w-16 md:translate-x-0"}
        `}
      >
        {/* Logo e nome do app */}
        <div className="py-5 px-4">
          <h1 className="text-yellow-500 font-medium text-lg">SmartOrder</h1>
        </div>

        {/* Links de navegação */}
        <div>
          <nav className="mt-6">
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    onClick={handleLinkClick} // Fecha a sidebar ao clicar
                    className={({ isActive }) =>
                      `flex items-center px-6 py-4 mx-6 rounded-xl text-gray-600
                      ${isActive ? "bg-orange-50 text-yellow-500 font-medium" : "hover:bg-gray-50"}`
                    }
                  >
                    <span>{link.icon}</span>
                    <span className="ml-3">{link.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
