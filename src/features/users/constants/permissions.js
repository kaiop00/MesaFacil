// This function should be called with t() from useTranslation hook
export const getPermissions = (t) => ({
  [t('users:permissionCategories.general')]: [
    { id: 'view_dashboard', label: t('users:permissionLabels.view_dashboard') },
    { id: 'edit_profile', label: t('users:permissionLabels.edit_profile') },
  ],
  [t('users:permissionCategories.users')]: [
    { id: 'view_users', label: t('users:permissionLabels.view_users') },
    { id: 'create_users', label: t('users:permissionLabels.create_users') },
    { id: 'edit_users', label: t('users:permissionLabels.edit_users') },
    { id: 'delete_users', label: t('users:permissionLabels.delete_users') },
  ],
  [t('users:permissionCategories.menu')]: [
    { id: 'view_menu', label: t('users:permissionLabels.view_menu') },
    { id: 'create_menu_items', label: t('users:permissionLabels.create_menu_items') },
    { id: 'edit_menu_items', label: t('users:permissionLabels.edit_menu_items') },
    { id: 'delete_menu_items', label: t('users:permissionLabels.delete_menu_items') },
  ],
  [t('users:permissionCategories.inventory')]: [
    { id: 'view_inventory', label: t('users:permissionLabels.view_inventory') },
    { id: 'create_inventory', label: t('users:permissionLabels.create_inventory') },
    { id: 'edit_inventory', label: t('users:permissionLabels.edit_inventory') },
    { id: 'delete_inventory', label: t('users:permissionLabels.delete_inventory') },
  ],
  [t('users:permissionCategories.orders')]: [
    { id: 'view_orders', label: t('users:permissionLabels.view_orders') },
    { id: 'create_orders', label: t('users:permissionLabels.create_orders') },
    { id: 'edit_orders', label: t('users:permissionLabels.edit_orders') },
    { id: 'cancel_orders', label: t('users:permissionLabels.cancel_orders') },
  ],
  [t('users:permissionCategories.kitchen')]: [
    { id: 'view_kitchen', label: t('users:permissionLabels.view_kitchen') },
    { id: 'manage_kitchen', label: t('users:permissionLabels.manage_kitchen') },
  ],
  [t('users:permissionCategories.reports')]: [
    { id: 'view_reports', label: t('users:permissionLabels.view_reports') },
    { id: 'export_reports', label: t('users:permissionLabels.export_reports') },
  ],
  [t('users:permissionCategories.config')]: [
    { id: 'view_config', label: t('users:permissionLabels.view_config') },
    { id: 'edit_config', label: t('users:permissionLabels.edit_config') },
  ]
});

// Legacy static export for backward compatibility
export const PERMISSIONS = {
  'Geral': [
    { id: 'view_dashboard', label: 'Visualizar Painel' },
    { id: 'edit_profile', label: 'Editar Perfil' },
  ],
  'Usuários': [
    { id: 'view_users', label: 'Visualizar Usuários' },
    { id: 'create_users', label: 'Criar Usuários' },
    { id: 'edit_users', label: 'Editar Usuários' },
    { id: 'delete_users', label: 'Excluir Usuários' },
  ],
  'Cardápio': [
    { id: 'view_menu', label: 'Visualizar Cardápio' },
    { id: 'create_menu_items', label: 'Adicionar Itens' },
    { id: 'edit_menu_items', label: 'Editar Itens' },
    { id: 'delete_menu_items', label: 'Remover Itens' },
  ],
  'Estoque': [
    { id: 'view_inventory', label: 'Visualizar Estoque' },
    { id: 'create_inventory', label: 'Criar Itens de Estoque' },
    { id: 'edit_inventory', label: 'Editar Estoque' },
    { id: 'delete_inventory', label: 'Excluir do Estoque' },
  ],
  'Pedidos': [
    { id: 'view_orders', label: 'Visualizar Pedidos' },
    { id: 'create_orders', label: 'Criar Pedidos' },
    { id: 'edit_orders', label: 'Editar Pedidos' },
    { id: 'cancel_orders', label: 'Cancelar Pedidos' },
  ],
  'Cozinha': [
    { id: 'view_kitchen', label: 'Visualizar Cozinha' },
    { id: 'manage_kitchen', label: 'Gerenciar Cozinha' },
  ],
  'Relatórios': [
    { id: 'view_reports', label: 'Visualizar Relatórios' },
    { id: 'export_reports', label: 'Exportar Relatórios' },
  ],
  'Configurações': [
    { id: 'view_config', label: 'Visualizar Configurações' },
    { id: 'edit_config', label: 'Editar Configurações' },
  ]
};
