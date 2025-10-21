export const PLANS_DATA = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    duration: 'Ilimitada',
    discount: null,
    isPopular: false,
    features: [
      { text: 'Cadastro de até 5 produtos no cardápio', included: true },
      { text: 'Cadastro de até 2 mesas', included: true },
      { text: 'Visualização básica dos pedidos', included: true },
      { text: 'Relatório simples (apenas pedidos do dia)', included: true },
      { text: 'Promoções', included: false },
      { text: 'Cadastro ilimitado de produtos', included: false },
      { text: 'Relatórios completos', included: false },
      { text: 'Dashboard completo', included: false },
      { text: 'Controle de estoque', included: false },
      { text: 'Personalização de layout', included: false }
    ],
    limitations: [
      'Acesso a apenas 40% das funcionalidades',
      'Máximo de 5 produtos no cardápio',
      'Máximo de 2 mesas'
    ]
  },
  {
    id: 'monthly',
    name: 'Mensal',
    price: 89.90,
    duration: '30 dias',
    discount: null,
    isPopular: true,
    stripePriceId: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
    features: [
      { text: 'Cadastro ilimitado de produtos e mesas', included: true },
      { text: 'Relatórios completos (diário, semanal e mensal)', included: true },
      { text: 'Dashboard completo', included: true },
      { text: 'Visualização avançada dos pedidos', included: true },
      { text: 'Promoções', included: true },
      { text: 'Controle de estoque (itens e movimentações)', included: true },
      { text: 'Gerenciamento de funcionários ilimitado', included: true },
      { text: 'Suporte técnico prioritário', included: true },
    ],
    limitations: []
  },
  {
    id: 'bimonthly',
    name: 'Bimestral',
    price: 159.90,
    duration: '60 dias',
    discount: 'Economize 11%',
    isPopular: false,
    stripePriceId: import.meta.env.VITE_STRIPE_BIMONTHLY_PRICE_ID,
    features: [
      { text: 'Todas as funcionalidades do Plano Mensal', included: true },
      { text: 'Relatórios bimestrais', included: true },
      { text: 'Renovação automática a cada 2 meses', included: true },
      { text: 'Desconto em relação ao plano mensal', included: true },
    ],
    limitations: []
  },
  {
    id: 'quarterly',
    name: 'Trimestral',
    price: 224.90,
    duration: '90 dias',
    discount: 'Economize 17%',
    isPopular: false,
    stripePriceId: import.meta.env.VITE_STRIPE_QUARTERLY_PRICE_ID,
    features: [
      { text: 'Todas as funcionalidades do Plano Bimestral', included: true },
      { text: 'Personalização de layout (cores, logo e fotos)', included: true },
      { text: 'Relatórios trimestrais', included: true },
      { text: 'Maior desconto em relação ao bimestral', included: true },
    ],
    limitations: []
  },
  {
    id: 'semiannual',
    name: 'Semestral',
    price: 404.90,
    duration: '180 dias',
    discount: 'Economize 25%',
    isPopular: false,
    stripePriceId: import.meta.env.VITE_STRIPE_SEMIANNUAL_PRICE_ID,
    features: [
      { text: 'Todas as funcionalidades dos planos anteriores', included: true },
      { text: 'Relatórios semestrais', included: true },
      { text: 'Backup automático', included: true },
      { text: 'Suporte técnico premium', included: true },
      { text: 'Maior desconto entre todos os planos', included: true },
    ],
    limitations: []
  }
];

export const PLAN_BENEFITS = {
  free: {
    accessLevel: 40, // 40% das funcionalidades
    maxProducts: 5,
    maxTables: 2,
    reports: ['daily'],
    features: ['basic_orders', 'simple_dashboard', 'promotions_ads']  // Promoções no Free!
  },
  monthly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'promotions_ads', 'inventory_control', 'employee_management']
  },
  bimonthly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'bimonthly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'promotions_ads', 'inventory_control', 'employee_management']
  },
  quarterly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'bimonthly', 'quarterly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'promotions_ads', 'inventory_control', 'employee_management', 'custom_layout']
  },
  semiannual: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual'],
    features: [
      'advanced_orders', 
      'full_dashboard', 
      'premium_support', 
      'inventory_control', 
      'custom_layout',
      'promotions_ads',
      'employee_management',
      'auto_backup'
    ]
  }
};