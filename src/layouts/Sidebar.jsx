import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  Building03,
  Lock,
  ShoppingBag01,
  Chat,
  Printer,
} from "react-coolicons";
import { usePlan } from "@/contexts/PlanContext";
import { FEATURE_FLAGS } from "@/constants/planFeatures";
import { useAuth } from "@/contexts/AuthContext";
import { useIfoodDisputes } from "@/features/integrations/ifood/hooks/useIfoodDisputes";
import mesafacil from "@/assets/mesafacil.png";

const Sidebar = ({ isOpen = true, setIsOpen }) => {
  const ENABLE_PEDIDOS_EXIT_HARD_REFRESH = false;
  const { t } = useTranslation();
  const { hasFeatureAccess } = usePlan();
  const { idRestaurante } = useAuth();
  const { pendingCount: disputeCount } = useIfoodDisputes(idRestaurante);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isNfceOpen, setIsNfceOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (typeof setIsOpen === "function") {
      setIsOpen((open) => !open);
    }
  };
  const closeOnMobile = () => {
    if (isMobile && typeof setIsOpen === "function") setIsOpen(false);
  };

  const handlePedidosExitFallback = (event, targetPath) => {
    closeOnMobile();

    if (!targetPath) return;

    if (
      ENABLE_PEDIDOS_EXIT_HARD_REFRESH &&
      location.pathname === "/home/pedidos" &&
      targetPath !== "/home/pedidos"
    ) {
      event.preventDefault();
      window.location.assign(targetPath);
    }
  };

  const navLinks = [
    { name: t("common:sidebar.dashboard"), icon: <House03 size={20} />, path: "/home", feature: null },
    { name: t("common:sidebar.orders"), icon: <ListUnordered size={20} />, path: "/home/pedidos", feature: null },
    { name: t("common:sidebar.cash", { defaultValue: 'Caixa' }), icon: <ShoppingBag01 size={20} />, path: "/home/caixa", feature: null },
    { name: t("common:sidebar.kitchen"), icon: <Building03 size={20} />, path: "/home/cozinha", feature: null },
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

  const hiddenLinks = {
    integrations: [
      {
        name: t("common:sidebar.iFood", { defaultValue: "iFood" }),
        icon: <ShoppingBag01 size={18} />,
        path: "/home/integracoes/ifood",
        badge: disputeCount,
      },
      {
        name: t("common:sidebar.whatsapp", { defaultValue: "WhatsApp" }),
        icon: <Chat size={18} />,
        path: "/home/whatsapp",
      },
    ],
    nfce: [
      {
        name: t("common:sidebar.fiscal"),
        icon: <FileDocument size={18} />,
        path: "/home/fiscal",
      },
      {
        name: t("common:sidebar.nfceList", { defaultValue: "NFC-e List" }),
        icon: <FileDocument size={18} />,
        path: "/home/nfce-emitidas",
      },
    ],
  };

  const isInIntegrations = hiddenLinks.integrations.some((link) => location.pathname.startsWith(link.path));
  const isInNfce = hiddenLinks.nfce.some((link) => location.pathname.startsWith(link.path));
  const isInMoreSection = isInIntegrations || isInNfce;

  useEffect(() => {
    if (isInMoreSection) {
      setIsMoreOpen(true);
    }
    if (isInIntegrations) {
      setIsIntegrationsOpen(true);
    }
    if (isInNfce) {
      setIsNfceOpen(true);
    }
  }, [isInMoreSection, isInIntegrations, isInNfce]);

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
        className={`fixed top-0 left-0 h-full bg-white shadow-md z-50 transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full w-64 md:translate-x-0 md:w-16"
          }`}
      >
        {/* Logo */}
        <Link
          to="/home"
          onClick={(event) => handlePedidosExitFallback(event, "/home")}
          className="shrink-0 border-b border-gray-100 px-4 py-4 md:border-b-0 md:px-0 md:py-0"
        >
          <img src={mesafacil} alt="Logo" className="w-32 sm:w-36 md:w-40 mx-auto md:ml-4 md:py-4" />
        </Link>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto pb-6 pt-3 md:pt-2">
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
                    onClick={(event) => handlePedidosExitFallback(event, link.path)}
                  >
                    {link.icon}
                    <span className="ml-3 truncate md:inline-block flex-1">
                      {link.name}
                    </span>
                    {isLocked && (
                      <Lock size={16} className="ml-2 text-gray-400" />
                    )}
                    {link.badge > 0 && (
                      <span className="ml-2 min-w-5 h-5 px-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {link.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}

            <li>
              <button
                type="button"
                onClick={() => setIsMoreOpen((open) => !open)}
                className={`w-[calc(100%-1rem)] mx-2 flex items-center px-6 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${
                  isInMoreSection ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""
                }`}
              >
                <Slider01 size={20} />
                <span className="ml-3 flex-1 text-left">
                  {t("common:sidebar.more", { defaultValue: "Mais..." })}
                </span>
                <span className="text-xs font-semibold">{isMoreOpen ? "↓" : "→"}</span>
              </button>
            </li>

            {isMoreOpen && (
              <li className="mx-2">
                <ul className="space-y-1 pl-4 border-l border-gray-200">
                  <li>
                    <button
                      type="button"
                      onClick={() => setIsIntegrationsOpen((open) => !open)}
                      className={`w-full flex items-center px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all ${
                        isInIntegrations ? "text-amber-600 font-medium" : ""
                      }`}
                    >
                      <span className="ml-2 flex-1 text-left">
                        {t("common:sidebar.integrations")}
                      </span>
                      <span className="text-xs font-semibold">{isIntegrationsOpen ? "↓" : "→"}</span>
                    </button>
                  </li>

                  {isIntegrationsOpen && hiddenLinks.integrations.map((link) => (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 ml-3 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all ${
                            isActive ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""
                          }`
                        }
                        onClick={(event) => handlePedidosExitFallback(event, link.path)}
                      >
                        {link.icon}
                        <span className="ml-2 flex-1 truncate">{link.name}</span>
                        {link.badge > 0 && (
                          <span className="ml-2 min-w-5 h-5 px-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {link.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}

                  <li>
                    <button
                      type="button"
                      onClick={() => setIsNfceOpen((open) => !open)}
                      className={`w-full flex items-center px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all ${
                        isInNfce ? "text-amber-600 font-medium" : ""
                      }`}
                    >
                      <span className="ml-2 flex-1 text-left">
                        {t("common:sidebar.nfce", { defaultValue: "NFC-e" })}
                      </span>
                      <span className="text-xs font-semibold">{isNfceOpen ? "↓" : "→"}</span>
                    </button>
                  </li>

                  {isNfceOpen && hiddenLinks.nfce.map((link) => (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 ml-3 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all ${
                            isActive ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""
                          }`
                        }
                        onClick={(event) => handlePedidosExitFallback(event, link.path)}
                      >
                        {link.icon}
                        <span className="ml-2 truncate">{link.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
