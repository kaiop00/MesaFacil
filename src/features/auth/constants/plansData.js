export const PLANS_DATA = [
  {
    id: 'free',
    name: 'Teste Grátis',
    price: 0,
    duration: '30 dias',
    discount: null,
    isPopular: false,
    features: [
      { text: 'Cadastro ilimitado de produtos', included: true },
      { text: 'Controle de mesas e pedidos', included: true },
      { text: 'Emissão de pedidos e comandas', included: true },
      { text: 'Integração com iFood', included: true },
      { text: 'Relatórios básicos de vendas', included: true },
      { text: 'Suporte via WhatsApp', included: true },
      { text: 'Treinamento inicial guiado', included: true }
    ],
    limitations: [
      'Sem cobrança durante 30 dias',
      'Sem necessidade de cartão para começar'
    ]
  },
  {
    id: 'monthly',
    name: 'Mensal',
    price: 200,
    duration: '30 dias',
    discount: null,
    isPopular: true,
    stripePriceId: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
    features: [
      { text: 'Tudo do período de teste', included: true },
      { text: 'Emissão de NFC-e integrada', included: true },
      { text: 'Controle de estoque automático', included: true },
      { text: 'Relatórios completos (financeiro e produtos)', included: true },
      { text: 'Multiusuários (garçom, caixa, gerente)', included: true },
      { text: 'Atualizações automáticas do sistema', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    limitations: []
  },
  {
    id: 'bimonthly',
    name: 'Bimestral',
    price: 360,
    duration: '60 dias',
    discount: 'R$ 180/mês',
    isPopular: false,
    stripePriceId: import.meta.env.VITE_STRIPE_BIMONTHLY_PRICE_ID,
    features: [
      { text: 'Tudo do Plano Mensal', included: true },
      { text: 'Desconto automático na mensalidade', included: true },
      { text: 'Prioridade maior no suporte', included: true },
      { text: 'Relatórios avançados de desempenho', included: true },
      { text: 'Acesso remoto ao sistema', included: true },
    ],
    limitations: []
  },
  {
    id: 'semiannual',
    name: 'Semestral',
    price: 960,
    duration: '180 dias',
    discount: '20% OFF',
    isPopular: false,
    stripePriceId: import.meta.env.VITE_STRIPE_SEMIANNUAL_PRICE_ID,
    features: [
      { text: 'Todas as funcionalidades dos planos anteriores', included: true },
      { text: 'Maior economia no período (20% OFF)', included: true },
      { text: 'Ajuda na configuração de cardápio e fluxo', included: true },
      { text: 'Prioridade máxima no suporte', included: true },
      { text: 'Acesso antecipado a novas funcionalidades', included: true },
    ],
    limitations: []
  }
];

export const PLAN_BENEFITS = {
  free: {
    accessLevel: 70,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily'],
    features: ['basic_orders', 'simple_dashboard', 'promotions_ads', 'unlimited_products', 'unlimited_tables']
  },
  monthly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'promotions_ads', 'inventory_control', 'employee_management']
  },
  Essbimonthly: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'bimonthly'],
    features: ['advanced_orders', 'full_dashboard', 'priority_support', 'promotions_ads', 'inventory_control', 'employee_management']
  },
  semiannual: {
    accessLevel: 100,
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    reports: ['daily', 'weekly', 'monthly', 'bimonthly', 'semiannual'],
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