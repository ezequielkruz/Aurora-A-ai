export type TabId = 'dashboard' | 'cashflow' | 'inventory' | 'customers' | 'menu';

export type IngredientCategory = 'Base' | 'Fruta' | 'Complemento' | 'Embalagem';

export type IngredientUnit = 'g' | 'un';

export type PurchaseUnit = 'kg' | 'g' | 'L' | 'ml' | 'unidade';

export type SalesChannel = 'WhatsApp' | 'iFood' | 'Balcão' | 'Instagram';

export type PaymentMethod = 'Pix' | 'Cartão Crédito' | 'Cartão Débito' | 'Dinheiro' | 'iFood Online';

export type ExpenseCategory =
  | 'Compra de Insumos'
  | 'Embalagens'
  | 'Entrega / Motoboy'
  | 'Marketing'
  | 'Fixo / Energia / Aluguel'
  | 'Outros';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  unitCost: number;
  initialStock: number;
  minStock: number;
  expirationDate: string; // YYYY-MM-DD
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  sizeLabel: string;
  practicedPrice: number;
  recipe: RecipeItem[];
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  neighborhood: string;
  preferredChannel: SalesChannel;
  notes: string;
  createdAt: string;
}

export interface CashflowEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'entrada' | 'saida';
  customerId?: string;
  customerName?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  grossAmount?: number;
  feeDiscount?: number;
  netAmount?: number;
  unitCmv?: number;
  totalCmv?: number;
  saleProfit?: number;
  channel?: SalesChannel;
  description: string;
  expenseCategory?: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface StockAddition {
  id: string;
  ingredientId: string;
  date: string;
  quantity: number;
  totalCost?: number;
  unitCostPaid?: number;
  expirationDate: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export interface AuroraStoreState {
  version: number;
  initialCashBalance: number;
  wasteRate: number; // 0.05 = 5%
  ingredients: Ingredient[];
  products: Product[];
  customers: Customer[];
  cashflow: CashflowEntry[];
  stockAdditions: StockAddition[];
}

export type StockStatus = 'OK' | 'REPOR ESTOQUE' | 'CRÍTICO';

export type ExpirationStatus = 'VENCIDO' | 'VENCE HOJE' | 'VENCE EM BREVE' | 'NO PRAZO';

export interface FifoLot {
  expirationDate: string;
  remainingQuantity: number;
  isInitial: boolean;
}

export interface IngredientStockSummary {
  ingredient: Ingredient;
  initialStock: number;
  manualAdditions: number;
  automaticExits: number;
  currentBalance: number;
  minStock: number;
  stockValue: number;
  status: StockStatus;
  activeExpirationDate: string;
  nextExpirationDate: string | null;
  daysRemaining: number;
  expirationStatus: ExpirationStatus;
  expirationLabel: string;
  activeLotsCount: number;
}

export interface CustomerStats {
  customer: Customer;
  orderCount: number;
  totalSpent: number;
  lastPurchaseDate: string | null;
}

export interface DailyFinancialPoint {
  dateISO: string;
  label: string;
  fullDateLabel: string;
  grossRevenue: number;
  netRevenue: number;
  totalCmv: number;
  totalExpenses: number;
  dailyNetProfit: number;
  cupsSold: number;
  ordersCount: number;
}

export interface DashboardMetrics {
  grossRevenue: number;
  totalFees: number;
  netRevenue: number;
  totalCmv: number;
  totalExpenses: number;
  operationalNetProfit: number;
  cashBalance: number;
  totalCupsSold: number;
  profitMarginPercent: number;
  salesByProduct: Array<{
    productId: string;
    productName: string;
    cupsSold: number;
    grossRevenue: number;
    netRevenue: number;
    cmv: number;
    profit: number;
  }>;
  salesByChannel: Array<{
    channel: SalesChannel;
    orders: number;
    cupsSold: number;
    grossRevenue: number;
    netRevenue: number;
  }>;
  dailyEvolution: DailyFinancialPoint[];
}

export interface DailyClosingPaymentBreakdown {
  pix: number;
  cartao: number;
  dinheiro: number;
  ifoodOnline: number;
  byMethod: Record<PaymentMethod, number>;
}

export interface DailyClosingSummary {
  dateISO: string;
  ordersCount: number;
  expensesCount: number;
  totalCupsSold: number;
  grossRevenue: number;
  totalFees: number;
  netRevenue: number;
  totalCmv: number;
  totalExpenses: number;
  dailyNetProfit: number;
  paymentBreakdown: DailyClosingPaymentBreakdown;
}

export interface DailyClosingExportPayload {
  app: string;
  exportedAt: string;
  date: string;
  dateFormatted: string;
  ordersCount: number;
  expensesCount: number;
  totalCupsSold: number;
  grossRevenue: number;
  totalFees: number;
  netRevenue: number;
  totalCmv: number;
  totalExpenses: number;
  dailyNetProfit: number;
  paymentBreakdown: DailyClosingPaymentBreakdown;
}

export interface StockShortageItem {
  ingredientId: string;
  ingredientName: string;
  unit: IngredientUnit;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
}

export interface SaleStockValidationResult {
  isValid: boolean;
  shortages: StockShortageItem[];
}
