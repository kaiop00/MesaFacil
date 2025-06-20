import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-16 lg:ml-64">
        {/* Header with offset */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pt-16 pb-20 sm:px-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
