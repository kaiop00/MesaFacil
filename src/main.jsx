import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlanProvider } from "@/contexts/PlanContext";
import "./i18n";

// main.jsx
const corSalva = localStorage.getItem('cor-primary');
if (corSalva) {
  document.documentElement.style.setProperty('--color-primary', corSalva);
}



createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <PlanProvider>
        <App />
      </PlanProvider>
    </AuthProvider>
  </StrictMode>
)