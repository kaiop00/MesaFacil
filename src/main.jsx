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

// Global handler: torna a inicialização resiliente a erros de extensions/content-scripts
// que retornam `true` em listeners e não respondem (causando o erro observado).
// Ignora a mensagem específica e evita que a app fique travada por um unhandled rejection.
window.addEventListener('unhandledrejection', (event) => {
  try {
    const reason = event.reason;
    const msg = reason && (reason.message || (typeof reason === 'string' ? reason : reason.toString && reason.toString())) || '';
    if (msg && msg.includes('A listener indicated an asynchronous response by returning true')) {
      console.warn('Ignored extension MessageChannel error (non-fatal):', reason);
      // impede que o erro apareça como não-capturado e interrompa o carregamento
      event.preventDefault();
    }
  } catch (e) {
    // não quebrar a aplicação se algo falhar aqui
    console.error('Error in global unhandledrejection handler', e);
  }
});



createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <PlanProvider>
        <App />
      </PlanProvider>
    </AuthProvider>
  </StrictMode>
)