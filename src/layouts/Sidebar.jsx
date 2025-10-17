import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  House03,
  ListUnordered,
  Coffee,
  FileDocument,
  ArrowDownUp,
  HamburgerLg,
  Users,
  Notebook,
  Slider01,
  Lock,
} from "react-coolicons";
import { usePlan } from "@/contexts/PlanContext";
import { FEATURE_FLAGS } from "@/constants/planFeatures";

const Sidebar = () => {
  const { t } = useTranslation();
  const { hasFeatureAccess } = usePlan();
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
    { name: t("common:sidebar.dashboard"), icon: <House03 size={20} />, path: "/home", feature: null },
    { name: t("common:sidebar.orders"), icon: <ListUnordered size={20} />, path: "/home/pedidos", feature: null },
    { name: t("common:sidebar.menu"), icon: <Coffee size={20} />, path: "/home/cardapio", feature: null },
    {
      name: t("common:sidebar.reports"),
      icon: <FileDocument size={20} />,
      path: "/home/relatorios",
      feature: null
    },
    { 
      name: t("common:sidebar.promotions"), 
      icon: <ArrowDownUp size={20} />, 
      path: "/home/promocoes",
      feature: null  // Promoções disponíveis para todos os planos
    },
    { 
      name: t("common:sidebar.items"), 
      icon: <Notebook size={20} />, 
      path: "/home/itens",
      feature: FEATURE_FLAGS.INVENTORY_CONTROL
    },
    { 
      name: t("common:sidebar.movements"), 
      icon: <Slider01 size={20} />, 
      path: "/home/movimentacao",
      feature: FEATURE_FLAGS.INVENTORY_CONTROL
    },
    { 
      name: t("common:sidebar.users"), 
      icon: <Users size={20} />, 
      path: "/home/usuarios",
      feature: FEATURE_FLAGS.EMPLOYEE_MANAGEMENT
    },
  ];

  return (
    <>
      {/* Hamburger mobile */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed z-50 top-3 left-4 p-2 rounded-md bg-primary-dynamic text-white md:hidden"
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
        <Link href="/home">
          <img src="/src/assets/mesafacil.png" alt="Logo" className="w-40 py-4 px-4 ml-4" />
        </Link>

        {/* Navigation links */}
        <nav className="mt-6">
          <ul className="space-y-2">
            {navLinks.map((link) => {
              const isLocked = link.feature && !hasFeatureAccess(link.feature);
              
              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    end={link.path === "/home"}
                    className={({ isActive }) =>
                      `flex items-center px-6 py-3 mx-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all
                      ${isActive ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""}
                      ${isLocked ? "opacity-60" : ""}`
                    }
                    onClick={() => {
                      if (isMobile) setIsOpen(false);
                    }}
                  >
                    {link.icon}
                    <span className="ml-3 truncate md:inline-block flex-1">
                      {link.name}
                    </span>
                    {isLocked && (
                      <Lock size={16} className="ml-2 text-gray-400" />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
