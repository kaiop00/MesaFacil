import { useRouteError, Link } from "react-router-dom";
import { useEffect } from "react";

const ErrorPage = () => {
  const error = useRouteError();

  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  const getErrorMessage = () => {
    if (error?.status === 404) {
      return {
        title: "404 - Página não encontrada",
        message: "A página que você está procurando não existe.",
        emoji: "🔍"
      };
    }

    if (error?.status === 403) {
      return {
        title: "403 - Acesso negado",
        message: "Você não tem permissão para acessar esta página.",
        emoji: "🔒"
      };
    }

    if (error?.status >= 500) {
      return {
        title: `${error.status} - Erro no servidor`,
        message: "Algo deu errado. Tente novamente mais tarde.",
        emoji: "⚠️"
      };
    }

    return {
      title: "Ops! Algo deu errado",
      message: error?.message || "Ocorreu um erro inesperado.",
      emoji: "😕"
    };
  };

  const { title, message, emoji } = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">{emoji}</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        
        {error?.statusText && (
          <p className="text-sm text-gray-500 mb-6 italic">{error.statusText}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Voltar ao início
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Voltar
          </button>
        </div>

        {import.meta.env.DEV && error?.stack && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Detalhes do erro (dev)
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;
