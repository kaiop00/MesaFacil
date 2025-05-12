// layouts/Layout.jsx
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Detecta o tamanho da tela para ajustar o sidebar automaticamente
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Inicializa com o tamanho atual da tela
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - fixa à esquerda */}
      <Sidebar />

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 md:ml-16 lg:ml-64 overflow-hidden transition-all duration-300">
        {/* Header fixo no topo */}
        <Header />

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
