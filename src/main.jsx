import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "@/contexts/AuthContext";
import "./i18n";

// main.jsx
const corSalva = localStorage.getItem('cor-primary');
if (corSalva) {
  document.documentElement.style.setProperty('--color-primary', corSalva);
}



createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)