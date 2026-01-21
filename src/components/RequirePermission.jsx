import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionDeniedPage from './PermissionDeniedPage';

/**
 * RequirePermission Component
 * 
 * Protege rotas/componentes verificando se o usuário tem a permissão necessária.
 * Exibe página de acesso negado se não tiver permissão.
 * Administradores (role === "admin") têm acesso automático.
 * 
 * @param {Object} props
 * @param {string|string[]} props.permission - Permissão ou array de permissões necessárias
 * @param {boolean} props.requireAll - Se true, requer TODAS as permissões. Se false, requer QUALQUER UMA (padrão: false)
 * @param {string} props.title - Título customizado para página de acesso negado
 * @param {string} props.message - Mensagem customizada para página de acesso negado
 * @param {React.ReactNode} props.children - Conteúdo a ser renderizado se tiver permissão
 * @param {React.ReactNode} props.fallback - Componente customizado para mostrar quando não tem permissão
 */
const RequirePermission = ({ 
  permission, 
  requireAll = false,
  title,
  message,
  children,
  fallback 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  // Admin tem acesso a tudo
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Verifica permissão única
  if (typeof permission === 'string') {
    if (!hasPermission(permission)) {
      return fallback || <PermissionDeniedPage title={title} message={message} />;
    }
    return <>{children}</>;
  }

  // Verifica múltiplas permissões
  if (Array.isArray(permission)) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
    
    if (!hasAccess) {
      return fallback || <PermissionDeniedPage title={title} message={message} />;
    }
    return <>{children}</>;
  }

  // Sem permissão especificada, nega acesso
  return fallback || <PermissionDeniedPage title={title} message={message} />;
};

export default RequirePermission;
