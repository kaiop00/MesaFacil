import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const NotFoundPage = () => {
  const { user } = useAuth();
  const homeLink = user ? "/home" : "/home-page";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-8xl font-bold text-orange-500 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Página não encontrada
        </h1>
        <p className="text-gray-600 mb-8">
          Desculpe, a página que você está procurando não existe ou foi removida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={homeLink}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium inline-flex items-center justify-center"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
            Ir para início
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium inline-flex items-center justify-center"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Voltar
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Precisa de ajuda? Entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
