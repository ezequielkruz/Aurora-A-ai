import type {
  AuroraStoreState,
  CashflowEntry,
  Customer,
  CustomerStats,
  DailyClosingExportPayload,
  DailyClosingSummary,
  DailyFinancialPoint,
  DashboardMetrics,
  ExpirationStatus,
  FifoLot,
  Ingredient,
  IngredientStockSummary,
  IngredientUnit,
  PaymentMethod,
  Product,
  PurchaseUnit,
  SalesChannel,
  SaleStockValidationResult,
  StockAddition,
  StockShortageItem,
  StockStatus,
} from '../types/aurora';

export const STORAGE_KEY = 'aurora_acai_erp_v1';

export const SALES_CHANNELS: SalesChannel[] = ['WhatsApp', 'iFood', 'Balcão', 'Instagram'];

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(baseISO: string, days: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function diffCalendarDays(targetISO: string, referenceISO: string): number {
  const [ty, tm, td] = targetISO.split('-').map(Number);
  const [ry, rm, rd] = referenceISO.split('-').map(Number);
  if (!ty || !tm || !td || !ry || !rm || !rd) return 999;
  const targetMs = Date.UTC(ty, tm - 1, td);
  const refMs = Date.UTC(ry, rm - 1, rd);
  return Math.round((targetMs - refMs) / 86400000);
}

export function computeExpirationAlert(
  expirationDate: string,
  referenceDateISO: string = getTodayISO()
): {
  status: ExpirationStatus;
  daysRemaining: number;
  label: string;
} {
  const daysRemaining = diffCalendarDays(expirationDate, referenceDateISO);

  if (daysRemaining < 0) {
    return {
      status: 'VENCIDO',
      daysRemaining,
      label: `Vencido há ${Math.abs(daysRemaining)}d`,
    };
  }
  if (daysRemaining === 0) {
    return {
      status: 'VENCE HOJE',
      daysRemaining: 0,
      label: 'Vence Hoje',
    };
  }
  if (daysRemaining <= 3) {
    return {
      status: 'VENCE EM BREVE',
      daysRemaining,
      label: `Vence em ${daysRemaining}d`,
    };
  }
  return {
    status: 'NO PRAZO',
    daysRemaining,
    label: `No prazo (${daysRemaining}d)`,
  };
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundUnitCost(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
}

export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUnitCost(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatQuantity(value: number, unit: 'g' | 'un'): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${unit}`;
}

export interface PurchaseConversionResult {
  baseUnit: IngredientUnit;
  multiplier: number;
  convertedQuantity: number;
  unitCost: number;
}

export const PURCHASE_UNIT_MULTIPLIER: Record<
  PurchaseUnit,
  { baseUnit: IngredientUnit; multiplier: number; label: string; shortLabel: string }
> = {
  kg: { baseUnit: 'g', multiplier: 1000, label: 'Quilograma (kg)', shortLabel: 'kg' },
  g: { baseUnit: 'g', multiplier: 1, label: 'Grama (g)', shortLabel: 'g' },
  L: { baseUnit: 'g', multiplier: 1000, label: 'Litro (L → ml/g)', shortLabel: 'L' },
  ml: { baseUnit: 'g', multiplier: 1, label: 'Mililitro (ml → g)', shortLabel: 'ml' },
  unidade: { baseUnit: 'un', multiplier: 1, label: 'Unidade (un)', shortLabel: 'un' },
};

/**
 * Converts a package purchase quantity & total price paid into the base stock unit ('g' or 'un')
 * and computes the resulting unit cost.
 */
export function convertPurchaseToStockUnit(params: {
  purchaseQuantity: number;
  purchaseUnit: PurchaseUnit;
  totalPaid: number;
}): PurchaseConversionResult {
  const config = PURCHASE_UNIT_MULTIPLIER[params.purchaseUnit];
  const safeQty =
    Number.isFinite(params.purchaseQuantity) && params.purchaseQuantity > 0
      ? params.purchaseQuantity
      : 0;
  const safePaid =
    Number.isFinite(params.totalPaid) && params.totalPaid > 0 ? params.totalPaid : 0;

  const convertedQuantity = roundQuantity(safeQty * config.multiplier);
  const unitCost =
    convertedQuantity > 0 && safePaid > 0 ? roundUnitCost(safePaid / convertedQuantity) : 0;

  return {
    baseUnit: config.baseUnit,
    multiplier: config.multiplier,
    convertedQuantity,
    unitCost,
  };
}

/**
 * Calculates weighted average unit cost after a stock purchase.
 */
export function calculateWeightedAverageUnitCost(params: {
  currentBalance: number;
  currentUnitCost: number;
  addedQuantity: number;
  totalPaid: number;
}): number {
  const prevQty = Math.max(0, params.currentBalance);
  const addedQty = Math.max(0, params.addedQuantity);
  if (addedQty <= 0) return params.currentUnitCost;
  const totalQty = prevQty + addedQty;
  const totalVal = prevQty * params.currentUnitCost + Math.max(0, params.totalPaid);
  return roundUnitCost(totalVal / totalQty);
}

/**
 * Calculates base ingredient cost of a product without waste.
 */
export function calculateProductBaseCost(
  product: Product,
  ingredientsMap: Map<string, Ingredient>
): number {
  return product.recipe.reduce((sum, item) => {
    const ing = ingredientsMap.get(item.ingredientId);
    if (!ing) return sum;
    return sum + item.quantity * ing.unitCost;
  }, 0);
}

/**
 * Calculates unit CMV including waste rate (e.g. 5% => * 1.05).
 */
export function calculateProductUnitCmv(
  product: Product,
  ingredients: Ingredient[],
  wasteRate: number
): number {
  const map = new Map(ingredients.map((i) => [i.id, i]));
  const base = calculateProductBaseCost(product, map);
  return base * (1 + wasteRate);
}

/**
 * Suggested price for 50% gross margin: CMV / (1 - 0.50) = CMV * 2.
 */
export function calculateSuggestedPrice(unitCmv: number, targetMargin = 0.5): number {
  if (targetMargin >= 1) return unitCmv * 2;
  return unitCmv / (1 - targetMargin);
}

/**
 * Computes sale financials given product, quantity, unit price, fee/discount, and unit CMV.
 */
export function computeSaleFinancials(params: {
  quantity: number;
  unitPrice: number;
  feeDiscount: number;
  unitCmv: number;
}): {
  grossAmount: number;
  feeDiscount: number;
  netAmount: number;
  totalCmv: number;
  saleProfit: number;
} {
  const qty = Math.max(0, params.quantity);
  const unitPrice = Math.max(0, params.unitPrice);
  const feeDiscount = Math.max(0, params.feeDiscount);
  const grossAmount = roundCurrency(qty * unitPrice);
  const netAmount = roundCurrency(grossAmount - feeDiscount);
  const totalCmv = roundCurrency(qty * params.unitCmv);
  const saleProfit = roundCurrency(netAmount - totalCmv);
  return {
    grossAmount,
    feeDiscount: roundCurrency(feeDiscount),
    netAmount,
    totalCmv,
    saleProfit,
  };
}

/**
 * Computes running cash balance for each transaction in chronological order.
 */
export function computeCashflowWithBalance(
  entries: CashflowEntry[],
  initialCashBalance: number
): Array<CashflowEntry & { runningBalance: number }> {
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  let balance = initialCashBalance;
  return sorted.map((entry) => {
    if (entry.type === 'entrada') {
      balance = roundCurrency(balance + (entry.netAmount ?? entry.amount));
    } else {
      balance = roundCurrency(balance - entry.amount);
    }
    return {
      ...entry,
      runningBalance: balance,
    };
  });
}

/**
 * Computes inventory summaries with FIFO expiration lot consumption.
 */
export function computeInventorySummaries(
  ingredients: Ingredient[],
  products: Product[],
  cashflow: CashflowEntry[],
  stockAdditions: StockAddition[],
  referenceDateISO: string = getTodayISO()
): IngredientStockSummary[] {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const exitsByIngredient = new Map<string, number>();
  const additionsByIngredient = new Map<string, StockAddition[]>();

  for (const entry of cashflow) {
    if (entry.type !== 'entrada' || !entry.productId || !entry.quantity) continue;
    const product = productMap.get(entry.productId);
    if (!product) continue;
    for (const item of product.recipe) {
      const prev = exitsByIngredient.get(item.ingredientId) ?? 0;
      exitsByIngredient.set(item.ingredientId, prev + item.quantity * entry.quantity);
    }
  }

  for (const addition of stockAdditions) {
    const list = additionsByIngredient.get(addition.ingredientId) ?? [];
    list.push(addition);
    additionsByIngredient.set(addition.ingredientId, list);
  }

  return ingredients.map((ingredient) => {
    const ingAdditions = additionsByIngredient.get(ingredient.id) ?? [];
    const manualAdditions = roundQuantity(
      ingAdditions.reduce((sum, a) => sum + a.quantity, 0)
    );
    const automaticExits = roundQuantity(exitsByIngredient.get(ingredient.id) ?? 0);
    const currentBalance = roundQuantity(
      ingredient.initialStock + manualAdditions - automaticExits
    );

    let status: StockStatus = 'OK';
    if (currentBalance <= 0) {
      status = 'CRÍTICO';
    } else if (currentBalance <= ingredient.minStock) {
      status = 'REPOR ESTOQUE';
    }

    const stockValue = roundCurrency(Math.max(0, currentBalance) * ingredient.unitCost);

    // FIFO lot simulation: sort all lots by expirationDate ascending (earliest expires out first)
    const allLots: FifoLot[] = [
      {
        expirationDate: ingredient.expirationDate,
        remainingQuantity: ingredient.initialStock,
        isInitial: true,
      },
      ...ingAdditions.map((a) => ({
        expirationDate: a.expirationDate || ingredient.expirationDate,
        remainingQuantity: a.quantity,
        isInitial: false,
      })),
    ].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));

    let exitsRemaining = automaticExits;
    for (const lot of allLots) {
      if (exitsRemaining <= 0) break;
      const deducted = Math.min(lot.remainingQuantity, exitsRemaining);
      lot.remainingQuantity = roundQuantity(lot.remainingQuantity - deducted);
      exitsRemaining = roundQuantity(exitsRemaining - deducted);
    }

    const activeLots = allLots.filter((l) => l.remainingQuantity > 0);
    const latestLotDate =
      allLots.length > 0
        ? allLots[allLots.length - 1].expirationDate
        : ingredient.expirationDate;

    const activeExpirationDate =
      activeLots[0]?.expirationDate ?? latestLotDate ?? ingredient.expirationDate;

    const distinctNext = activeLots.find(
      (l) => l.expirationDate !== activeExpirationDate
    );
    const nextExpirationDate = distinctNext ? distinctNext.expirationDate : null;

    const expAlert = computeExpirationAlert(activeExpirationDate, referenceDateISO);

    return {
      ingredient,
      initialStock: ingredient.initialStock,
      manualAdditions,
      automaticExits,
      currentBalance,
      minStock: ingredient.minStock,
      stockValue,
      status,
      activeExpirationDate,
      nextExpirationDate,
      daysRemaining: expAlert.daysRemaining,
      expirationStatus: expAlert.status,
      expirationLabel: expAlert.label,
      activeLotsCount: activeLots.length,
    };
  });
}

/**
 * Computes customer statistics linked to cashflow sales.
 */
export function computeCustomerStats(
  customers: Customer[],
  cashflow: CashflowEntry[]
): CustomerStats[] {
  return customers.map((customer) => {
    const orders = cashflow.filter(
      (entry) =>
        entry.type === 'entrada' &&
        (entry.customerId === customer.id ||
          (!entry.customerId && entry.customerName === customer.name))
    );

    const orderCount = orders.length;
    const totalSpent = roundCurrency(
      orders.reduce((sum, o) => sum + (o.grossAmount ?? o.amount), 0)
    );
    const lastPurchaseDate =
      orders.length > 0
        ? orders.reduce((latest, o) => (o.date > latest ? o.date : latest), orders[0].date)
        : null;

    return {
      customer,
      orderCount,
      totalSpent,
      lastPurchaseDate,
    };
  });
}

/**
 * Computes Dashboard KPIs, product performance comparison, and channel breakdown.
 */
export function computeDashboardMetrics(state: AuroraStoreState): DashboardMetrics {
  let grossRevenue = 0;
  let totalFees = 0;
  let netRevenue = 0;
  let totalCmv = 0;
  let totalExpenses = 0;
  let totalCupsSold = 0;

  const productStatsMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      cupsSold: number;
      grossRevenue: number;
      netRevenue: number;
      cmv: number;
      profit: number;
    }
  >();

  for (const prod of state.products) {
    productStatsMap.set(prod.id, {
      productId: prod.id,
      productName: prod.name,
      cupsSold: 0,
      grossRevenue: 0,
      netRevenue: 0,
      cmv: 0,
      profit: 0,
    });
  }

  const channelStatsMap = new Map<
    SalesChannel,
    {
      channel: SalesChannel;
      orders: number;
      cupsSold: number;
      grossRevenue: number;
      netRevenue: number;
    }
  >();

  for (const ch of SALES_CHANNELS) {
    channelStatsMap.set(ch, {
      channel: ch,
      orders: 0,
      cupsSold: 0,
      grossRevenue: 0,
      netRevenue: 0,
    });
  }

  for (const entry of state.cashflow) {
    if (entry.type === 'entrada') {
      const gross = entry.grossAmount ?? entry.amount;
      const fee = entry.feeDiscount ?? 0;
      const net = entry.netAmount ?? entry.amount;
      const cmv = entry.totalCmv ?? 0;
      const profit = entry.saleProfit ?? roundCurrency(net - cmv);
      const qty = entry.quantity ?? 0;

      grossRevenue += gross;
      totalFees += fee;
      netRevenue += net;
      totalCmv += cmv;
      totalCupsSold += qty;

      if (entry.productId) {
        const existing = productStatsMap.get(entry.productId) ?? {
          productId: entry.productId,
          productName: entry.productName ?? 'Produto',
          cupsSold: 0,
          grossRevenue: 0,
          netRevenue: 0,
          cmv: 0,
          profit: 0,
        };
        existing.cupsSold += qty;
        existing.grossRevenue = roundCurrency(existing.grossRevenue + gross);
        existing.netRevenue = roundCurrency(existing.netRevenue + net);
        existing.cmv = roundCurrency(existing.cmv + cmv);
        existing.profit = roundCurrency(existing.profit + profit);
        productStatsMap.set(entry.productId, existing);
      }

      if (entry.channel) {
        const chStat = channelStatsMap.get(entry.channel);
        if (chStat) {
          chStat.orders += 1;
          chStat.cupsSold += qty;
          chStat.grossRevenue = roundCurrency(chStat.grossRevenue + gross);
          chStat.netRevenue = roundCurrency(chStat.netRevenue + net);
        }
      }
    } else {
      totalExpenses += entry.amount;
    }
  }

  grossRevenue = roundCurrency(grossRevenue);
  totalFees = roundCurrency(totalFees);
  netRevenue = roundCurrency(netRevenue);
  totalCmv = roundCurrency(totalCmv);
  totalExpenses = roundCurrency(totalExpenses);

  const operationalNetProfit = roundCurrency(netRevenue - totalCmv - totalExpenses);
  const cashBalance = roundCurrency(state.initialCashBalance + netRevenue - totalExpenses);
  const profitMarginPercent =
    grossRevenue > 0 ? roundCurrency((operationalNetProfit / grossRevenue) * 100) : 0;

  return {
    grossRevenue,
    totalFees,
    netRevenue,
    totalCmv,
    totalExpenses,
    operationalNetProfit,
    cashBalance,
    totalCupsSold,
    profitMarginPercent,
    salesByProduct: Array.from(productStatsMap.values()),
    salesByChannel: Array.from(channelStatsMap.values()),
    dailyEvolution: computeDailyFinancialEvolution(state.cashflow),
  };
}

/**
 * Aggregates cashflow entries chronologically by date for Dashboard growth visualization.
 */
export function computeDailyFinancialEvolution(
  cashflow: CashflowEntry[]
): DailyFinancialPoint[] {
  const byDate = new Map<
    string,
    {
      grossRevenue: number;
      netRevenue: number;
      totalCmv: number;
      totalExpenses: number;
      cupsSold: number;
      ordersCount: number;
    }
  >();

  for (const entry of cashflow) {
    if (!entry.date) continue;
    const acc = byDate.get(entry.date) ?? {
      grossRevenue: 0,
      netRevenue: 0,
      totalCmv: 0,
      totalExpenses: 0,
      cupsSold: 0,
      ordersCount: 0,
    };

    if (entry.type === 'entrada') {
      acc.grossRevenue += entry.grossAmount ?? entry.amount;
      acc.netRevenue += entry.netAmount ?? entry.amount;
      acc.totalCmv += entry.totalCmv ?? 0;
      acc.cupsSold += entry.quantity ?? 0;
      acc.ordersCount += 1;
    } else {
      acc.totalExpenses += entry.amount;
    }

    byDate.set(entry.date, acc);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, acc]) => {
      const parts = dateISO.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateISO;
      const grossRevenue = roundCurrency(acc.grossRevenue);
      const netRevenue = roundCurrency(acc.netRevenue);
      const totalCmv = roundCurrency(acc.totalCmv);
      const totalExpenses = roundCurrency(acc.totalExpenses);
      const dailyNetProfit = roundCurrency(netRevenue - totalCmv - totalExpenses);

      return {
        dateISO,
        label,
        fullDateLabel: formatDateBR(dateISO),
        grossRevenue,
        netRevenue,
        totalCmv,
        totalExpenses,
        dailyNetProfit,
        cupsSold: acc.cupsSold,
        ordersCount: acc.ordersCount,
      };
    });
}

/**
 * Validates and hydrates imported/stored JSON backup structure.
 */
export function validateAuroraStoreState(data: unknown): data is AuroraStoreState {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.initialCashBalance !== 'number' || Number.isNaN(obj.initialCashBalance)) {
    return false;
  }
  if (typeof obj.wasteRate !== 'number' || Number.isNaN(obj.wasteRate)) {
    return false;
  }
  if (!Array.isArray(obj.ingredients) || !Array.isArray(obj.products)) return false;
  if (!Array.isArray(obj.customers) || !Array.isArray(obj.cashflow)) return false;
  if (!Array.isArray(obj.stockAdditions)) return false;
  return true;
}

export function migrateStoreState(rawState: AuroraStoreState): AuroraStoreState {
  const defaultExp = addDaysISO(getTodayISO(), 30);
  const ingExpMap = new Map<string, string>();

  const ingredients = rawState.ingredients.map((ing) => {
    const exp = ing.expirationDate || defaultExp;
    ingExpMap.set(ing.id, exp);
    return {
      ...ing,
      expirationDate: exp,
    };
  });

  const stockAdditions = rawState.stockAdditions.map((add) => ({
    ...add,
    expirationDate: add.expirationDate || ingExpMap.get(add.ingredientId) || defaultExp,
  }));

  return {
    ...rawState,
    ingredients,
    stockAdditions,
  };
}

/**
 * Computes daily cashflow closing metrics strictly for the selected YYYY-MM-DD date.
 */
export function computeDailyClosingSummary(
  cashflow: CashflowEntry[],
  dateISO: string
): DailyClosingSummary {
  const byMethod: Record<PaymentMethod, number> = {
    Pix: 0,
    'Cartão Crédito': 0,
    'Cartão Débito': 0,
    Dinheiro: 0,
    'iFood Online': 0,
  };

  let ordersCount = 0;
  let expensesCount = 0;
  let totalCupsSold = 0;
  let grossRevenue = 0;
  let totalFees = 0;
  let netRevenue = 0;
  let totalCmv = 0;
  let totalExpenses = 0;

  for (const entry of cashflow) {
    if (entry.date !== dateISO) continue;
    if (entry.type === 'entrada') {
      ordersCount += 1;
      totalCupsSold += entry.quantity ?? 0;
      const gross = entry.grossAmount ?? entry.amount;
      const fee = entry.feeDiscount ?? 0;
      const net = entry.netAmount ?? entry.amount;
      grossRevenue += gross;
      totalFees += fee;
      netRevenue += net;
      totalCmv += entry.totalCmv ?? 0;
      byMethod[entry.paymentMethod] = roundCurrency(
        (byMethod[entry.paymentMethod] ?? 0) + net
      );
    } else {
      expensesCount += 1;
      totalExpenses += entry.amount;
    }
  }

  grossRevenue = roundCurrency(grossRevenue);
  totalFees = roundCurrency(totalFees);
  netRevenue = roundCurrency(netRevenue);
  totalCmv = roundCurrency(totalCmv);
  totalExpenses = roundCurrency(totalExpenses);

  const dailyNetProfit = roundCurrency(netRevenue - totalCmv - totalExpenses);
  const pix = roundCurrency(byMethod.Pix);
  const cartao = roundCurrency(byMethod['Cartão Crédito'] + byMethod['Cartão Débito']);
  const dinheiro = roundCurrency(byMethod.Dinheiro);
  const ifoodOnline = roundCurrency(byMethod['iFood Online']);

  return {
    dateISO,
    ordersCount,
    expensesCount,
    totalCupsSold,
    grossRevenue,
    totalFees,
    netRevenue,
    totalCmv,
    totalExpenses,
    dailyNetProfit,
    paymentBreakdown: {
      pix,
      cartao,
      dinheiro,
      ifoodOnline,
      byMethod,
    },
  };
}

/**
 * Formats the daily closing summary as clean WhatsApp-ready text with emojis.
 */
export function formatDailyClosingWhatsAppText(summary: DailyClosingSummary): string {
  const lines = [
    '📊 *FECHAMENTO DE CAIXA — AURORA AÇAÍ*',
    `📅 Data: ${formatDateBR(summary.dateISO)}`,
    '',
    `💰 Faturamento Bruto: ${formatBRL(summary.grossRevenue)}`,
    `🏷️ Taxas / Descontos: -${formatBRL(summary.totalFees)}`,
    `✅ Faturamento Líquido: ${formatBRL(summary.netRevenue)}`,
    `📦 Copos / Produtos Vendidos: ${summary.totalCupsSold} un (${summary.ordersCount} pedido(s))`,
    `🛒 CMV Total: ${formatBRL(summary.totalCmv)}`,
    `📉 Saídas / Despesas: ${formatBRL(summary.totalExpenses)} (${summary.expensesCount} lançamento(s))`,
    `💵 *Lucro Líquido do Dia: ${formatBRL(summary.dailyNetProfit)}*`,
    '',
    '💳 *Resumo por Forma de Pagamento (Líquido):*',
    `• Pix: ${formatBRL(summary.paymentBreakdown.pix)}`,
    `• Cartão (Crédito/Débito): ${formatBRL(summary.paymentBreakdown.cartao)}`,
    `• Dinheiro: ${formatBRL(summary.paymentBreakdown.dinheiro)}`,
  ];

  if (summary.paymentBreakdown.ifoodOnline > 0) {
    lines.push(`• iFood Online: ${formatBRL(summary.paymentBreakdown.ifoodOnline)}`);
  }

  lines.push('', '🚀 Relatório gerado pelo Aurora Açaí');
  return lines.join('\n');
}

/**
 * Builds a structured JSON payload for the daily cash closing export.
 */
export function buildDailyClosingExportPayload(
  summary: DailyClosingSummary,
  exportedAt: string = new Date().toISOString()
): DailyClosingExportPayload {
  return {
    app: 'Aurora Açaí — Fechamento de Caixa Diário',
    exportedAt,
    date: summary.dateISO,
    dateFormatted: formatDateBR(summary.dateISO),
    ordersCount: summary.ordersCount,
    expensesCount: summary.expensesCount,
    totalCupsSold: summary.totalCupsSold,
    grossRevenue: summary.grossRevenue,
    totalFees: summary.totalFees,
    netRevenue: summary.netRevenue,
    totalCmv: summary.totalCmv,
    totalExpenses: summary.totalExpenses,
    dailyNetProfit: summary.dailyNetProfit,
    paymentBreakdown: summary.paymentBreakdown,
  };
}

/**
 * Validates whether current inventory balances cover all recipe ingredients
 * required to fulfill a sale of `quantity` units of `product`.
 * Prevents negative stock and blocks insufficient-stock FIFO deductions.
 */
export function validateSaleStockAvailability(params: {
  product: Product | undefined;
  quantity: number;
  inventorySummaries: IngredientStockSummary[];
}): SaleStockValidationResult {
  const { product, quantity, inventorySummaries } = params;
  if (!product || !Number.isFinite(quantity) || quantity <= 0) {
    return { isValid: true, shortages: [] };
  }

  const summaryMap = new Map(
    inventorySummaries.map((item) => [item.ingredient.id, item])
  );
  const aggregatedRequired = new Map<string, number>();

  for (const recipeItem of product.recipe) {
    if (recipeItem.quantity <= 0) continue;
    const prev = aggregatedRequired.get(recipeItem.ingredientId) ?? 0;
    aggregatedRequired.set(
      recipeItem.ingredientId,
      roundQuantity(prev + recipeItem.quantity * quantity)
    );
  }

  const shortages: StockShortageItem[] = [];
  for (const [ingredientId, requiredQuantity] of aggregatedRequired.entries()) {
    const summary = summaryMap.get(ingredientId);
    const availableQuantity = roundQuantity(Math.max(0, summary?.currentBalance ?? 0));
    if (availableQuantity < requiredQuantity) {
      shortages.push({
        ingredientId,
        ingredientName: summary?.ingredient.name ?? ingredientId,
        unit: summary?.ingredient.unit ?? 'g',
        requiredQuantity,
        availableQuantity,
        missingQuantity: roundQuantity(requiredQuantity - availableQuantity),
      });
    }
  }

  return {
    isValid: shortages.length === 0,
    shortages,
  };
}
