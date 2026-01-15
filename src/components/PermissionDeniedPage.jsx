import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowCircleLeft } from 'react-coolicons';

/**
 * PermissionDeniedPage Component
 * 
 * Página exibida quando o usuário não tem permissão para acessar um recurso.
 * 
 * @param {Object} props
 * @param {string} props.title - Título da página (padrão: "Acesso Negado")
 * @param {string} props.message - Mensagem personalizada
 * @param {string} props.description - Descrição adicional
 */
const PermissionDeniedPage = ({ 
  title = "Acesso Negado",
  message = "Você não tem permissão para acessar este recurso.",
  description = "Entre em contato com o administrador do sistema para solicitar acesso."
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-4">
            {message}
          </p>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-500 mb-6">
              {description}
            </p>
          )}

          {/* Action Button */}
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-dynamic text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowCircleLeft size={20} className="mr-2" />
            Voltar para o Início
          </button>

          {/* Contact Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Se você acredita que isso é um erro, entre em contato com o administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionDeniedPage;
