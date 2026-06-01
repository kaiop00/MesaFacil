export const getPresetRoles = (t) => ({
  admin: {
    id: 'admin',
    label: t('users:roles.admin', 'Administrador'),
    role: 'admin' // stored as string to preserve existing admin behavior
  },
  garcom: {
    id: 'garcom',
    label: t('users:roles.garcom', 'Garçom'),
    role: {
      view_orders: true,
      create_orders: true,
      edit_orders: true,
      cancel_orders: true,
      view_menu: true
    }
  },
  caixa: {
    id: 'caixa',
    label: t('users:roles.caixa', 'Caixa'),
    role: {
      view_cash: true,
      manage_cash: true,
      view_orders: true,
      create_orders: true,
      edit_orders: true,
      view_kitchen: true
    }
  }
});

export const PRESET_KEYS = ['admin', 'garcom', 'caixa'];
