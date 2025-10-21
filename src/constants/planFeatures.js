/**
 * Plan Features Constants
 * 
 * This file defines all feature flags and their mapping to subscription plans.
 * Used throughout the application to control access to features based on user plan.
 */

// Feature flags for all plan-based features
export const FEATURE_FLAGS = {
  // Dashboard
  BASIC_DASHBOARD: 'basic_dashboard',
  FULL_DASHBOARD: 'full_dashboard',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  
  // Orders
  BASIC_ORDERS: 'basic_orders',
  ADVANCED_ORDERS: 'advanced_orders',
  ORDER_HISTORY: 'order_history',
  
  // Menu
  UNLIMITED_PRODUCTS: 'unlimited_products',
  UNLIMITED_TABLES: 'unlimited_tables',
  
  // Reports
  DAILY_REPORTS: 'daily_reports',
  WEEKLY_REPORTS: 'weekly_reports',
  MONTHLY_REPORTS: 'monthly_reports',
  BIMONTHLY_REPORTS: 'bimonthly_reports',
  QUARTERLY_REPORTS: 'quarterly_reports',
  SEMIANNUAL_REPORTS: 'semiannual_reports',
  
  // Advanced Features
  INVENTORY_CONTROL: 'inventory_control',
  CUSTOM_LAYOUT: 'custom_layout',
  PROMOTIONS_ADS: 'promotions_ads',
  EMPLOYEE_MANAGEMENT: 'employee_management',
  PRIORITY_SUPPORT: 'priority_support',
  PREMIUM_SUPPORT: 'premium_support',
  AUTO_BACKUP: 'auto_backup'
};

// Plan limits for resource constraints
export const PLAN_LIMITS = {
  free: {
    maxProducts: 5,
    maxTables: 2,
    maxEmployees: 1
  },
  monthly: {
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    maxEmployees: 'unlimited'
  },
  bimonthly: {
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    maxEmployees: 'unlimited'
  },
  quarterly: {
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    maxEmployees: 'unlimited'
  },
  semiannual: {
    maxProducts: 'unlimited',
    maxTables: 'unlimited',
    maxEmployees: 'unlimited'
  }
};

// Feature map: which features are available for each plan
export const PLAN_FEATURE_MAP = {
  free: [
    FEATURE_FLAGS.BASIC_DASHBOARD,
    FEATURE_FLAGS.BASIC_ORDERS,
    FEATURE_FLAGS.DAILY_REPORTS,
    FEATURE_FLAGS.PROMOTIONS_ADS  // Promoções disponíveis desde o plano gratuito
  ],
  monthly: [
    FEATURE_FLAGS.FULL_DASHBOARD,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.ADVANCED_ORDERS,
    FEATURE_FLAGS.ORDER_HISTORY,
    FEATURE_FLAGS.UNLIMITED_PRODUCTS,
    FEATURE_FLAGS.UNLIMITED_TABLES,
    FEATURE_FLAGS.DAILY_REPORTS,
    FEATURE_FLAGS.WEEKLY_REPORTS,
    FEATURE_FLAGS.MONTHLY_REPORTS,
    FEATURE_FLAGS.PROMOTIONS_ADS,  // Promoções incluídas
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.INVENTORY_CONTROL,  // Controle de estoque incluído
    FEATURE_FLAGS.EMPLOYEE_MANAGEMENT  // Gerenciamento de funcionários incluído
  ],
  bimonthly: [
    // All monthly features
    FEATURE_FLAGS.FULL_DASHBOARD,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.ADVANCED_ORDERS,
    FEATURE_FLAGS.ORDER_HISTORY,
    FEATURE_FLAGS.UNLIMITED_PRODUCTS,
    FEATURE_FLAGS.UNLIMITED_TABLES,
    FEATURE_FLAGS.DAILY_REPORTS,
    FEATURE_FLAGS.WEEKLY_REPORTS,
    FEATURE_FLAGS.MONTHLY_REPORTS,
    FEATURE_FLAGS.PROMOTIONS_ADS,
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.INVENTORY_CONTROL,
    FEATURE_FLAGS.EMPLOYEE_MANAGEMENT,
    // Plus bimonthly features
    FEATURE_FLAGS.BIMONTHLY_REPORTS
  ],
  quarterly: [
    // All bimonthly features
    FEATURE_FLAGS.FULL_DASHBOARD,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.ADVANCED_ORDERS,
    FEATURE_FLAGS.ORDER_HISTORY,
    FEATURE_FLAGS.UNLIMITED_PRODUCTS,
    FEATURE_FLAGS.UNLIMITED_TABLES,
    FEATURE_FLAGS.DAILY_REPORTS,
    FEATURE_FLAGS.WEEKLY_REPORTS,
    FEATURE_FLAGS.MONTHLY_REPORTS,
    FEATURE_FLAGS.BIMONTHLY_REPORTS,
    FEATURE_FLAGS.PROMOTIONS_ADS,
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.INVENTORY_CONTROL,
    FEATURE_FLAGS.EMPLOYEE_MANAGEMENT,
    // Plus quarterly features
    FEATURE_FLAGS.QUARTERLY_REPORTS,
    FEATURE_FLAGS.CUSTOM_LAYOUT
  ],
  semiannual: [
    // All quarterly features
    FEATURE_FLAGS.FULL_DASHBOARD,
    FEATURE_FLAGS.ADVANCED_ANALYTICS,
    FEATURE_FLAGS.ADVANCED_ORDERS,
    FEATURE_FLAGS.ORDER_HISTORY,
    FEATURE_FLAGS.UNLIMITED_PRODUCTS,
    FEATURE_FLAGS.UNLIMITED_TABLES,
    FEATURE_FLAGS.DAILY_REPORTS,
    FEATURE_FLAGS.WEEKLY_REPORTS,
    FEATURE_FLAGS.MONTHLY_REPORTS,
    FEATURE_FLAGS.BIMONTHLY_REPORTS,
    FEATURE_FLAGS.QUARTERLY_REPORTS,
    FEATURE_FLAGS.PROMOTIONS_ADS,
    FEATURE_FLAGS.PRIORITY_SUPPORT,
    FEATURE_FLAGS.INVENTORY_CONTROL,
    FEATURE_FLAGS.EMPLOYEE_MANAGEMENT,
    FEATURE_FLAGS.CUSTOM_LAYOUT,
    // Plus semiannual features
    FEATURE_FLAGS.SEMIANNUAL_REPORTS,
    FEATURE_FLAGS.PREMIUM_SUPPORT,
    FEATURE_FLAGS.AUTO_BACKUP
  ]
};

// Plan hierarchy (for determining upgrade paths)
export const PLAN_HIERARCHY = {
  free: 0,
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 4
};

// Plan display names
export const PLAN_NAMES = {
  free: 'Gratuito',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  semiannual: 'Semestral'
};

// Plan colors for UI badges
export const PLAN_COLORS = {
  free: 'gray',
  monthly: 'blue',
  bimonthly: 'green',
  quarterly: 'purple',
  semiannual: 'gold'
};

// Report types and their required plans
export const REPORT_TYPES = [
  { value: 'daily', label: 'Diário', requiredPlan: 'free' },
  { value: 'weekly', label: 'Semanal', requiredPlan: 'monthly' },
  { value: 'monthly', label: 'Mensal', requiredPlan: 'monthly' },
  { value: 'bimonthly', label: 'Bimestral', requiredPlan: 'bimonthly' },
  { value: 'quarterly', label: 'Trimestral', requiredPlan: 'quarterly' },
  { value: 'semiannual', label: 'Semestral', requiredPlan: 'semiannual' }
];
