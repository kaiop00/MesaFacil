import AppRouter from "./routes";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}

export default App;
