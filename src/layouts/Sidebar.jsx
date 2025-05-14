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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen((open) => !open);
  const navLinks = [
    { name: "Dashboard", icon: <House03 size={20} />, path: "/home" },
    { name: "Pedidos", icon: <ListUnordered size={20} />, path: "/home/pedidos" },
    { name: "Cardápio", icon: <Coffee size={20} />, path: "/home/cardapio" },
    {
      name: "Relatórios",
      icon: <FileDocument size={20} />,
      path: "/home/relatorios",
    },
    { name: "Promoções", icon: <ArrowDownUp size={20} />, path: "/home/promocoes" },
  ];

  return (
    <>
      {/* Hamburger mobile */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed z-50 top-4 left-4 p-2 rounded-md bg-yellow-500 text-white md:hidden"
          aria-label="Toggle menu"
        >
          <HamburgerLg size={20} />
        </button>
      )}

      {/* Overlay on mobile when open */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-md z-50 transition-transform duration-300 ease-in-out
          ${isOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full w-64 md:translate-x-0 md:w-16"
          }`}
      >
        {/* Logo */}
        <div className="py-5 px-4">
          <h1 className="text-yellow-500 font-bold text-xl">SmartOrder</h1>
        </div>

        {/* Navigation links */}
        <nav className="mt-6">
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.path}>
                <NavLink
                  to={link.path}
                  end={link.path === "/home"}
                  className={({ isActive }) =>
                    `flex items-center px-6 py-3 mx-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all
    ${isActive ? "bg-amber-50 text-amber-600 font-medium" : ""}`
                  }
                  onClick={() => {
                    if (isMobile) setIsOpen(false);
                  }}
                >
                  {link.icon}
                  <span className="ml-3 truncate md:inline-block">
                    {link.name}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
