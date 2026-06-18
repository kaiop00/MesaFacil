import React from "react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const LayoutContent = () => {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 pt-16 pb-20 sm:px-6 md:px-8">
      <Outlet />
    </main>
  );
};

const Layout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const syncSidebarState = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };

    syncSidebarState();
    window.addEventListener("resize", syncSidebarState);

    return () => window.removeEventListener("resize", syncSidebarState);
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col overflow-hidden bg-gray-100 transition-all duration-300 ${
          isSidebarOpen ? "md:ml-64 lg:ml-64" : "md:ml-16 lg:ml-16"
        }`}
      >
        {/* Header with offset */}
        <Header isSidebarOpen={isSidebarOpen} />

        {/* Page content */}
        <LayoutContent key={location.pathname} />
      </div>
    </div>
  );
};

export default Layout;
