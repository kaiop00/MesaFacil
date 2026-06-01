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
import { usePermissions } from "@/hooks/usePermissions";
import { useIfoodDisputes } from "@/features/integrations/ifood/hooks/useIfoodDisputes";
import mesafacil from "@/assets/mesafacil.png";

const Sidebar = ({ isOpen: controlledIsOpen, setIsOpen: controlledSetIsOpen }) => {
  const { t } = useTranslation();
  const { hasFeatureAccess } = usePlan();
  const { idRestaurante } = useAuth();
  const { pendingCount: disputeCount } = useIfoodDisputes(idRestaurante);
  const location = useLocation();
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isNfceOpen, setIsNfceOpen] = useState(false);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = controlledSetIsOpen ?? setInternalIsOpen;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen((open) => !open);
  const closeOnMobile = () => {
    if (isMobile) setIsOpen(false);
  };

  const navLinks = [
    { name: t("common:sidebar.dashboard"), icon: <House03 size={20} />, path: "/home", feature: null },
    { name: t("common:sidebar.orders"), icon: <ListUnordered size={20} />, path: "/home/pedidos", feature: null },
    { name: t("common:sidebar.cash", { defaultValue: 'Caixa' }), icon: <ShoppingBag01 size={20} />, path: "/home/caixa", feature: null, permission: 'view_cash' },
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
    {
      name: t("common:sidebar.productionPrinters", { defaultValue: "Impressora por setor" }),
      icon: <Printer size={20} />,
      path: "/home/impressoras-setor",
      permission: 'manage_printers',
      feature: null,
    },
  ];

  const hiddenLinks = {
    integrations: [
      {
        name: t("common:sidebar.iFood", { defaultValue: "iFood" }),
        icon: <ShoppingBag01 size={18} />,
        path: "/home/integracoes/ifood",
        permission: 'manage_ifood_integration',
        badge: disputeCount,
      },
      {
        name: t("common:sidebar.whatsapp", { defaultValue: "WhatsApp" }),
        icon: <Chat size={18} />,
        path: "/home/whatsapp",
        permission: 'manage_whatsapp_menu',
      },
    ],
    nfce: [
      {
        name: t("common:sidebar.fiscal"),
        icon: <FileDocument size={18} />,
        path: "/home/fiscal",
        permission: 'view_fiscal',
      },
      {
        name: t("common:sidebar.nfceList", { defaultValue: "NFC-e List" }),
        icon: <FileDocument size={18} />,
        path: "/home/nfce-emitidas",
        permission: 'view_fiscal',
      },
    ],
  };

  const { hasPermission } = usePermissions();

  const isInIntegrations = hiddenLinks.integrations.some((link) => location.pathname.startsWith(link.path));
  const isInNfce = hiddenLinks.nfce.some((link) => location.pathname.startsWith(link.path));
  const isInMoreSection = isInIntegrations || isInNfce;

  // Filter hidden link groups by permission
  const visibleIntegrations = hiddenLinks.integrations.filter(link => !link.permission || hasPermission(link.permission));
  const visibleNfce = hiddenLinks.nfce.filter(link => !link.permission || hasPermission(link.permission));
  const isInIntegrationsVisible = visibleIntegrations.some((link) => location.pathname.startsWith(link.path));
  const isInNfceVisible = visibleNfce.some((link) => location.pathname.startsWith(link.path));
  const isInMoreSectionVisible = isInIntegrationsVisible || isInNfceVisible;

  useEffect(() => {
    if (isInMoreSectionVisible) {
      setIsMoreOpen(true);
    }
    if (isInIntegrationsVisible) {
      setIsIntegrationsOpen(true);
    }
    if (isInNfceVisible) {
      setIsNfceOpen(true);
    }
  }, [isInMoreSectionVisible, isInIntegrationsVisible, isInNfceVisible]);

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
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px] md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-md z-50 transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen
            ? "translate-x-0 w-[72vw] max-w-56 md:w-64"
            : "-translate-x-full w-[72vw] max-w-56 md:translate-x-0 md:w-16"
          }`}
      >
        {/* Logo */}
        <div className="relative">
          <Link to="/home" className="block">
            <img src={mesafacil} alt="Logo" className="absolute top-3 md:top-3 left-3 md:left-4 w-32 md:w-40" />
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="mt-2 flex-1 overflow-y-auto pb-6 md:pt-16">
          <ul className="space-y-2">
            {navLinks
              .filter(link => {
                // hide if feature locked
                if (link.feature && !hasFeatureAccess(link.feature)) return false;
                // hide if permission is required and user doesn't have it
                if (link.permission && !hasPermission(link.permission)) return false;
                return true;
              })
              .map((link) => {
                const isLocked = link.feature && !hasFeatureAccess(link.feature);

                return (
                  <li key={link.path}>
                    <NavLink
                      to={link.path}
                      end={link.path === "/home"}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-2.5 mx-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all md:px-6 md:py-3 md:mx-2
                      ${isActive ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""}
                      ${isLocked ? "opacity-60" : ""}`
                      }
                      onClick={closeOnMobile}
                    >
                      {link.icon}
                      <span className={`ml-2.5 truncate flex-1 text-[0.95rem] md:ml-3 md:text-base ${isOpen ? "inline-block" : "hidden md:inline-block"}`}>
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
                  className={`w-[calc(100%-0.75rem)] mx-1.5 flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all md:w-[calc(100%-1rem)] md:mx-2 md:px-6 md:py-3 ${
                    isInMoreSection ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""
                  }`}
                >
                  <Slider01 size={18} className="md:[&>svg]:size-5" />
                  <span className={`ml-2.5 flex-1 text-left text-[0.95rem] md:ml-3 md:text-base ${isOpen ? "inline-block" : "hidden md:inline-block"}`}>
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
                      className={`w-full flex items-center px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all md:px-4 ${
                        isInIntegrations ? "text-amber-600 font-medium" : ""
                      }`}
                    >
                      <span className={`ml-2 flex-1 text-left text-[0.92rem] md:text-sm ${isOpen ? "inline-block" : "hidden md:inline-block"}`}>
                        {t("common:sidebar.integrations")}
                      </span>
                      <span className="text-xs font-semibold">{isIntegrationsOpen ? "↓" : "→"}</span>
                    </button>
                  </li>

                  {isIntegrationsOpen && visibleIntegrations.map((link) => (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 ml-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all md:px-4 md:ml-3 ${
                            isActive ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""
                          }`
                        }
                        onClick={closeOnMobile}
                      >
                        {link.icon}
                        <span className={`ml-2 flex-1 truncate text-[0.92rem] md:text-sm ${isOpen ? "inline-block" : "hidden md:inline-block"}`}>{link.name}</span>
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
                      className={`w-full flex items-center px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all md:px-4 ${
                        isInNfce ? "text-amber-600 font-medium" : ""
                      }`}
                    >
                      <span className={`ml-2 flex-1 text-left text-[0.92rem] md:text-sm ${isOpen ? "inline-block" : "hidden md:inline-block"}`}>
                        {t("common:sidebar.nfce", { defaultValue: "NFC-e" })}
                      </span>
                      <span className="text-xs font-semibold">{isNfceOpen ? "↓" : "→"}</span>
                    </button>
                  </li>

                  {isNfceOpen && visibleNfce.map((link) => (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 ml-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-all md:px-4 md:ml-3 ${
                            isActive ? "bg-primary-dynamic-opacity text-amber-600 font-medium" : ""
                          }`
                        }
                        onClick={closeOnMobile}
                      >
                        {link.icon}
                        <span className={`ml-2 text-[0.92rem] md:text-sm ${isOpen ? "inline-block" : "hidden md:inline-block"} truncate`}>{link.name}</span>
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
