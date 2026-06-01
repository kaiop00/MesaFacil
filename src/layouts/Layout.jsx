import React from "react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        <main className="flex-1 overflow-y-auto bg-gray-100 pt-16 pb-20 sm:px-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
