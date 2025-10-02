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
    features: [
      { text: 'Cadastro ilimitado de produtos e mesas', included: true },
      { text: 'Relatórios completos (diário, semanal e mensal)', included: true },
      { text: 'Dashboard completo', included: true },
      { text: 'Visualização avançada dos pedidos', included: true },
      { text: 'Suporte técnico prioritário', included: true },
      { text: 'Controle de estoque', included: false },
      { text: 'Personalização de layout', included: false },
      { text: 'Anúncios de promoções', included: false },
      { text: 'Gerenciamento de funcionários', included: false }
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
    features: [
      { text: 'Todas as funcionalidades do Plano Mensal', included: true },
      { text: 'Controle de estoque', included: true },
      { text: 'Renovação automática a cada 2 meses', included: true },
      { text: 'Relatórios bimestrais especiais', included: true },
      { text: 'Desconto em relação ao plano mensal', included: true },
      { text: 'Personalização de layout', included: false },
      { text: 'Anúncios de promoções', included: false },
      { text: 'Gerenciamento de funcionários', included: false }
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
    features: [
      { text: 'Todas as funcionalidades do Plano Bimestral', included: true },
      { text: 'Personalização de layout (cores, logo e fotos)', included: true },
      { text: 'Relatórios de desempenho trimestrais', included: true },
      { text: 'Maior desconto em relação ao bimestral', included: true },
      { text: 'Análises avançadas de vendas', included: true },
      { text: 'Anúncios de promoções', included: false },
      { text: 'Gerenciamento de funcionários', included: false }
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
    features: [
      { text: 'Todas as funcionalidades dos planos anteriores', included: true },
      { text: 'Anúncios de promoções', included: true },
      { text: 'Gerenciamento de funcionários', included: true },
      { text: 'Maior desconto entre todos os planos', included: true },
      { text: 'Suporte técnico premium', included: true },
      { text: 'Relatórios semestrais completos', included: true },
      { text: 'Integração com delivery avançada', included: true },
      { text: 'Backup automático dos dados', included: true }
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
    features: ['basic_orders', 'simple_dashboard']
  },
  monthly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support']
  },
  bimonthly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'bimonthly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'inventory_control']
  },
  quarterly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'quarterly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'inventory_control', 'custom_layout']
  },
  semiannual: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'semiannual'],
    features: [
      'advanced_orders', 
      'full_dashboard', 
      'premium_support', 
      'inventory_control', 
      'custom_layout',
      'promotions_ads',
      'employee_management',
      'advanced_delivery',
      'auto_backup'
    ]
  }
};