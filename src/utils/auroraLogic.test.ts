import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedState } from '../data/seedData';
import {
  addDaysISO,
  buildDailyClosingExportPayload,
  calculateProductUnitCmv,
  calculateSuggestedPrice,
  calculateWeightedAverageUnitCost,
  computeCashflowWithBalance,
  computeCustomerStats,
  computeDailyClosingSummary,
  computeDailyFinancialEvolution,
  computeDashboardMetrics,
  computeExpirationAlert,
  computeInventorySummaries,
  computeSaleFinancials,
  convertPurchaseToStockUnit,
  formatDailyClosingWhatsAppText,
  migrateStoreState,
  validateAuroraStoreState,
  validateSaleStockAvailability,
} from './auroraLogic';

test('seed state contains exact 18 ingredients, 8 products, 4 customers, 4 cashflow entries', () => {
  const state = createSeedState();
  assert.equal(state.ingredients.length, 18);
  assert.equal(state.products.length, 8);
  assert.equal(state.customers.length, 4);
  assert.equal(state.cashflow.length, 4);
  assert.equal(state.initialCashBalance, 500);
  assert.equal(state.wasteRate, 0.05);
});

test('product CMV with 5% waste and suggested price at 50% margin calculate accurately', () => {
  const state = createSeedState();
  const banana300 = state.products[0];
  const unitCmv = calculateProductUnitCmv(banana300, state.ingredients, state.wasteRate);
  assert.ok(Math.abs(unitCmv - 7.806141) < 0.0001);
  const suggested = calculateSuggestedPrice(unitCmv, 0.5);
  assert.ok(Math.abs(suggested - 15.612282) < 0.0001);
});

test('sale financials compute gross, net, cmv, and profit properly', () => {
  const res = computeSaleFinancials({
    quantity: 1,
    unitPrice: 35.5,
    feeDiscount: 4.26,
    unitCmv: 17.656086,
  });
  assert.equal(res.grossAmount, 35.5);
  assert.equal(res.netAmount, 31.24);
  assert.equal(res.totalCmv, 17.66);
  assert.equal(res.saleProfit, 13.58);
});

test('cashflow running balance starts at R$ 500.00 and reflects seed transactions', () => {
  const state = createSeedState();
  const ledger = computeCashflowWithBalance(state.cashflow, state.initialCashBalance);
  assert.equal(ledger.length, 4);
  assert.equal(ledger[0].runningBalance, 532.0);
  assert.equal(ledger[1].runningBalance, 563.24);
  assert.equal(ledger[2].runningBalance, 614.24);
  assert.equal(ledger[3].runningBalance, 528.34);
});

test('inventory automatic exits deduct exact recipe quantities multiplied by cups sold', () => {
  const state = createSeedState();
  const summaries = computeInventorySummaries(
    state.ingredients,
    state.products,
    state.cashflow,
    state.stockAdditions
  );

  const acai = summaries.find((s) => s.ingredient.name === 'Açai Tradicional');
  assert.ok(acai);
  assert.equal(acai.automaticExits, 1500);
  assert.equal(acai.currentBalance, 8500);
  assert.equal(acai.status, 'OK');

  const morango = summaries.find((s) => s.ingredient.name === 'Morango');
  assert.ok(morango);
  assert.equal(morango.automaticExits, 70);
  assert.equal(morango.currentBalance, 1930);

  const withAddition = computeInventorySummaries(
    state.ingredients,
    state.products,
    state.cashflow,
    [
      {
        id: 'add-1',
        ingredientId: 'ing-3',
        date: '2026-11-17',
        quantity: 70,
        expirationDate: '2026-12-01',
        createdAt: '2026-11-17T18:00:00.000Z',
      },
    ],
    '2026-11-17'
  );
  const morangoUpdated = withAddition.find((s) => s.ingredient.name === 'Morango');
  assert.equal(morangoUpdated?.currentBalance, 2000);
});

test('stock status transitions to REPOR ESTOQUE and CRÍTICO accurately', () => {
  const state = createSeedState();
  const extraSale = computeSaleFinancials({
    quantity: 35,
    unitPrice: 35.5,
    feeDiscount: 0,
    unitCmv: 17.66,
  });
  const cashflow = [
    ...state.cashflow,
    {
      id: 'cf-test',
      date: '2026-11-18',
      type: 'entrada' as const,
      productId: 'prod-8',
      quantity: 35,
      grossAmount: extraSale.grossAmount,
      netAmount: extraSale.netAmount,
      totalCmv: extraSale.totalCmv,
      saleProfit: extraSale.saleProfit,
      description: 'Teste estoque',
      amount: extraSale.netAmount,
      paymentMethod: 'Pix' as const,
      createdAt: '2026-11-18T10:00:00.000Z',
    },
  ];
  const summaries = computeInventorySummaries(
    state.ingredients,
    state.products,
    cashflow,
    []
  );
  const copo700 = summaries.find((s) => s.ingredient.id === 'ing-15');
  assert.equal(copo700?.currentBalance, 14);
  assert.equal(copo700?.status, 'REPOR ESTOQUE');

  const cashflowCritical = [
    ...cashflow,
    {
      id: 'cf-test-2',
      date: '2026-11-18',
      type: 'entrada' as const,
      productId: 'prod-8',
      quantity: 14,
      grossAmount: 497,
      netAmount: 497,
      totalCmv: 247.24,
      saleProfit: 249.76,
      description: 'Teste crítico',
      amount: 497,
      paymentMethod: 'Pix' as const,
      createdAt: '2026-11-18T11:00:00.000Z',
    },
  ];
  const summariesCrit = computeInventorySummaries(
    state.ingredients,
    state.products,
    cashflowCritical,
    []
  );
  const copo700Crit = summariesCrit.find((s) => s.ingredient.id === 'ing-15');
  assert.equal(copo700Crit?.currentBalance, 0);
  assert.equal(copo700Crit?.status, 'CRÍTICO');
});

test('dashboard metrics and customer stats aggregate seed data accurately', () => {
  const state = createSeedState();
  const metrics = computeDashboardMetrics(state);
  assert.equal(metrics.grossRevenue, 118.5);
  assert.equal(metrics.totalFees, 4.26);
  assert.equal(metrics.netRevenue, 114.24);
  assert.equal(metrics.totalExpenses, 85.9);
  assert.equal(metrics.cashBalance, 528.34);
  assert.equal(metrics.totalCupsSold, 6);

  const custStats = computeCustomerStats(state.customers, state.cashflow);
  const mariana = custStats.find((c) => c.customer.name === 'Mariana Silva');
  assert.equal(mariana?.orderCount, 1);
  assert.equal(mariana?.totalSpent, 32.0);
  assert.equal(mariana?.lastPurchaseDate, '2026-11-15');

  const fernanda = custStats.find((c) => c.customer.name === 'Fernanda Costa');
  assert.equal(fernanda?.orderCount, 0);
  assert.equal(fernanda?.totalSpent, 0);
  assert.equal(fernanda?.lastPurchaseDate, null);

  assert.equal(validateAuroraStoreState(state), true);
  assert.equal(validateAuroraStoreState({ foo: 'bar' }), false);
});

test('custom product recipe calculates CMV and deducts stock when sold', () => {
  const state = createSeedState();
  const customProduct = {
    id: 'prod-custom',
    name: 'Copo 400ml Especial',
    sizeLabel: '400ml',
    practicedPrice: 22.0,
    recipe: [
      { ingredientId: 'ing-1', quantity: 300 }, // Açai Tradicional 300 * 0.022 = 6.60
      { ingredientId: 'ing-12', quantity: 20 }, // Nutella 20 * 0.1035 = 2.07
      { ingredientId: 'ing-14', quantity: 1 }, // Copo 500ml 1 * 0.5367 = 0.5367
    ],
  };

  const unitCmv = calculateProductUnitCmv(customProduct, state.ingredients, state.wasteRate);
  // Base = 9.2067, with 5% waste = 9.667035
  assert.ok(Math.abs(unitCmv - 9.667035) < 0.0001);

  const sale = computeSaleFinancials({
    quantity: 2,
    unitPrice: customProduct.practicedPrice,
    feeDiscount: 0,
    unitCmv,
  });

  const summaries = computeInventorySummaries(
    state.ingredients,
    [...state.products, customProduct],
    [
      ...state.cashflow,
      {
        id: 'cf-custom',
        date: '2026-11-18',
        type: 'entrada',
        productId: customProduct.id,
        productName: customProduct.name,
        quantity: 2,
        grossAmount: sale.grossAmount,
        netAmount: sale.netAmount,
        totalCmv: sale.totalCmv,
        saleProfit: sale.saleProfit,
        description: 'Venda custom',
        amount: sale.netAmount,
        paymentMethod: 'Pix',
        createdAt: '2026-11-18T12:00:00.000Z',
      },
    ],
    []
  );

  const nutella = summaries.find((s) => s.ingredient.id === 'ing-12');
  assert.equal(nutella?.automaticExits, 40);
  assert.equal(nutella?.currentBalance, 660);
});

test('expiration alert statuses classify VENCIDO, VENCE HOJE, VENCE EM BREVE and NO PRAZO', () => {
  const ref = '2026-11-17';
  const expired = computeExpirationAlert(addDaysISO(ref, -2), ref);
  assert.equal(expired.status, 'VENCIDO');
  assert.equal(expired.daysRemaining, -2);

  const today = computeExpirationAlert(ref, ref);
  assert.equal(today.status, 'VENCE HOJE');
  assert.equal(today.daysRemaining, 0);

  const soon = computeExpirationAlert(addDaysISO(ref, 3), ref);
  assert.equal(soon.status, 'VENCE EM BREVE');
  assert.equal(soon.daysRemaining, 3);

  const ok = computeExpirationAlert(addDaysISO(ref, 10), ref);
  assert.equal(ok.status, 'NO PRAZO');
  assert.equal(ok.daysRemaining, 10);
});

test('FIFO lot consumption advances activeExpirationDate to newer lot once initial lot depletes', () => {
  const ref = '2026-11-17';
  const state = createSeedState(ref);
  // Copo 700ml (ing-15) starts with 49 un expiring +365d.
  // Override ing-15 to expire in +2d and add a new lot expiring in +90d.
  const ingredients = state.ingredients.map((ing) =>
    ing.id === 'ing-15' ? { ...ing, initialStock: 5, expirationDate: addDaysISO(ref, 2) } : ing
  );
  // Seed cashflow already sold 1x prod-8 (uses 1 Copo 700ml). Add 4 more prod-8 sales to consume all 5 from initial lot.
  const cashflow = [
    ...state.cashflow,
    {
      id: 'cf-fifo',
      date: ref,
      type: 'entrada' as const,
      productId: 'prod-8',
      quantity: 4,
      grossAmount: 142,
      netAmount: 142,
      totalCmv: 70.64,
      saleProfit: 71.36,
      description: 'Teste FIFO',
      amount: 142,
      paymentMethod: 'Pix' as const,
      createdAt: '2026-11-17T12:00:00.000Z',
    },
  ];
  const newerLotDate = addDaysISO(ref, 90);
  const summaries = computeInventorySummaries(
    ingredients,
    state.products,
    cashflow,
    [
      {
        id: 'add-fifo-1',
        ingredientId: 'ing-15',
        date: ref,
        quantity: 50,
        totalCost: 30,
        unitCostPaid: 0.6,
        expirationDate: newerLotDate,
        createdAt: '2026-11-17T11:00:00.000Z',
      },
    ],
    ref
  );

  const copo700 = summaries.find((s) => s.ingredient.id === 'ing-15');
  assert.ok(copo700);
  assert.equal(copo700.currentBalance, 50);
  assert.equal(copo700.activeExpirationDate, newerLotDate);
  assert.equal(copo700.expirationStatus, 'NO PRAZO');
});

test('weighted average unit cost recalculates ingredient cost and cascades to product CMV', () => {
  const newCost = calculateWeightedAverageUnitCost({
    currentBalance: 1000,
    currentUnitCost: 0.02,
    addedQuantity: 1000,
    totalPaid: 40, // 0.04 per g
  });
  assert.equal(newCost, 0.03);

  const state = createSeedState('2026-11-17');
  const originalCmv = calculateProductUnitCmv(state.products[0], state.ingredients, state.wasteRate);
  const updatedIngredients = state.ingredients.map((i) =>
    i.id === 'ing-1' ? { ...i, unitCost: 0.04 } : i
  );
  const updatedCmv = calculateProductUnitCmv(state.products[0], updatedIngredients, state.wasteRate);
  assert.ok(updatedCmv > originalCmv);
});

test('migrateStoreState backfills expirationDate for legacy v1 localStorage payloads', () => {
  const state = createSeedState('2026-11-17');
  const legacy = {
    ...state,
    ingredients: state.ingredients.map(({ expirationDate: _exp, ...rest }) => rest),
    stockAdditions: [
      {
        id: 'add-legacy',
        ingredientId: 'ing-1',
        date: '2026-11-10',
        quantity: 500,
        createdAt: '2026-11-10T10:00:00.000Z',
      },
    ],
  };

  const migrated = migrateStoreState(legacy as unknown as typeof state);
  assert.ok(migrated.ingredients.every((i) => typeof i.expirationDate === 'string' && i.expirationDate.length === 10));
  assert.ok(migrated.stockAdditions[0].expirationDate.length === 10);
});

test('computeDailyClosingSummary filters strictly by selected date and breaks down payment methods', () => {
  const targetDate = '2026-11-17';
  const cashflow = [
    {
      id: 'cf-1',
      date: targetDate,
      type: 'entrada' as const,
      quantity: 2,
      grossAmount: 40,
      feeDiscount: 0,
      netAmount: 40,
      totalCmv: 15,
      saleProfit: 25,
      description: 'Venda Pix',
      amount: 40,
      paymentMethod: 'Pix' as const,
      createdAt: '2026-11-17T10:00:00.000Z',
    },
    {
      id: 'cf-2',
      date: targetDate,
      type: 'entrada' as const,
      quantity: 3,
      grossAmount: 60,
      feeDiscount: 5,
      netAmount: 55,
      totalCmv: 20,
      saleProfit: 35,
      description: 'Venda Cartão',
      amount: 55,
      paymentMethod: 'Cartão Crédito' as const,
      createdAt: '2026-11-17T11:00:00.000Z',
    },
    {
      id: 'cf-3',
      date: targetDate,
      type: 'entrada' as const,
      quantity: 1,
      grossAmount: 20,
      feeDiscount: 0,
      netAmount: 20,
      totalCmv: 7,
      saleProfit: 13,
      description: 'Venda Dinheiro',
      amount: 20,
      paymentMethod: 'Dinheiro' as const,
      createdAt: '2026-11-17T12:00:00.000Z',
    },
    {
      id: 'cf-4',
      date: targetDate,
      type: 'saida' as const,
      description: 'Gelo e limpeza',
      amount: 18,
      paymentMethod: 'Dinheiro' as const,
      createdAt: '2026-11-17T13:00:00.000Z',
    },
    {
      id: 'cf-other-day',
      date: '2026-11-16',
      type: 'entrada' as const,
      quantity: 10,
      grossAmount: 500,
      feeDiscount: 0,
      netAmount: 500,
      totalCmv: 200,
      saleProfit: 300,
      description: 'Outro dia',
      amount: 500,
      paymentMethod: 'Pix' as const,
      createdAt: '2026-11-16T10:00:00.000Z',
    },
  ];

  const summary = computeDailyClosingSummary(cashflow, targetDate);
  assert.equal(summary.ordersCount, 3);
  assert.equal(summary.expensesCount, 1);
  assert.equal(summary.totalCupsSold, 6);
  assert.equal(summary.grossRevenue, 120);
  assert.equal(summary.totalFees, 5);
  assert.equal(summary.netRevenue, 115);
  assert.equal(summary.totalCmv, 42);
  assert.equal(summary.totalExpenses, 18);
  assert.equal(summary.dailyNetProfit, 55); // 115 - 42 - 18
  assert.equal(summary.paymentBreakdown.pix, 40);
  assert.equal(summary.paymentBreakdown.cartao, 55);
  assert.equal(summary.paymentBreakdown.dinheiro, 20);

  const text = formatDailyClosingWhatsAppText(summary);
  assert.match(text, /FECHAMENTO DE CAIXA — AURORA AÇAÍ/);
  assert.match(text, /17\/11\/2026/);
  assert.match(text, /120,00/);
  assert.match(text, /115,00/);
  assert.match(text, /6 un/);
  assert.match(text, /55,00/);
  assert.match(text, /Pix:/);
  assert.match(text, /Cartão/);
  assert.match(text, /Dinheiro:/);
});

test('convertPurchaseToStockUnit converts kg, L, ml, g, and unidade to base stock unit and unit cost', () => {
  const kgRes = convertPurchaseToStockUnit({
    purchaseQuantity: 1,
    purchaseUnit: 'kg',
    totalPaid: 30,
  });
  assert.equal(kgRes.baseUnit, 'g');
  assert.equal(kgRes.multiplier, 1000);
  assert.equal(kgRes.convertedQuantity, 1000);
  assert.equal(kgRes.unitCost, 0.03);

  const literRes = convertPurchaseToStockUnit({
    purchaseQuantity: 2.5,
    purchaseUnit: 'L',
    totalPaid: 25,
  });
  assert.equal(literRes.baseUnit, 'g');
  assert.equal(literRes.convertedQuantity, 2500);
  assert.equal(literRes.unitCost, 0.01);

  const mlRes = convertPurchaseToStockUnit({
    purchaseQuantity: 500,
    purchaseUnit: 'ml',
    totalPaid: 10,
  });
  assert.equal(mlRes.baseUnit, 'g');
  assert.equal(mlRes.convertedQuantity, 500);
  assert.equal(mlRes.unitCost, 0.02);

  const gRes = convertPurchaseToStockUnit({
    purchaseQuantity: 250,
    purchaseUnit: 'g',
    totalPaid: 12.5,
  });
  assert.equal(gRes.baseUnit, 'g');
  assert.equal(gRes.convertedQuantity, 250);
  assert.equal(gRes.unitCost, 0.05);

  const unRes = convertPurchaseToStockUnit({
    purchaseQuantity: 50,
    purchaseUnit: 'unidade',
    totalPaid: 22.5,
  });
  assert.equal(unRes.baseUnit, 'un');
  assert.equal(unRes.convertedQuantity, 50);
  assert.equal(unRes.unitCost, 0.45);

  const zeroRes = convertPurchaseToStockUnit({
    purchaseQuantity: 0,
    purchaseUnit: 'kg',
    totalPaid: 30,
  });
  assert.equal(zeroRes.convertedQuantity, 0);
  assert.equal(zeroRes.unitCost, 0);
});

test('validateSaleStockAvailability blocks sales when any recipe ingredient has insufficient stock', () => {
  const state = createSeedState('2026-11-17');
  const summaries = computeInventorySummaries(
    state.ingredients,
    state.products,
    state.cashflow,
    state.stockAdditions,
    '2026-11-17'
  );
  // Copo 300ml Tradicional (Banana) uses 200g Açai Tradicional (8.500g available => max 42 cups)
  // and 1x Copo 300ml + Tampa (95 available).
  const banana300 = state.products[0];

  const validCheck = validateSaleStockAvailability({
    product: banana300,
    quantity: 5,
    inventorySummaries: summaries,
  });
  assert.equal(validCheck.isValid, true);
  assert.equal(validCheck.shortages.length, 0);

  // Ordering 50 cups requires 10.000g Açai Tradicional (available 8.500g => shortage 1.500g)
  const blockedCheck = validateSaleStockAvailability({
    product: banana300,
    quantity: 50,
    inventorySummaries: summaries,
  });
  assert.equal(blockedCheck.isValid, false);
  const acaiShortage = blockedCheck.shortages.find((s) => s.ingredientId === 'ing-1');
  assert.ok(acaiShortage);
  assert.equal(acaiShortage.ingredientName, 'Açai Tradicional');
  assert.equal(acaiShortage.requiredQuantity, 10000);
  assert.equal(acaiShortage.availableQuantity, 8500);
  assert.equal(acaiShortage.missingQuantity, 1500);
  assert.equal(acaiShortage.unit, 'g');
});

test('computeDailyFinancialEvolution aggregates chronological daily revenue and net profit', () => {
  const state = createSeedState('2026-11-17');
  const metrics = computeDashboardMetrics(state);
  assert.equal(metrics.dailyEvolution.length, 3);
  assert.deepEqual(
    metrics.dailyEvolution.map((d) => d.dateISO),
    ['2026-11-15', '2026-11-16', '2026-11-17']
  );

  const day15 = metrics.dailyEvolution[0];
  assert.equal(day15.label, '15/11');
  assert.equal(day15.grossRevenue, 32);
  assert.equal(day15.cupsSold, 2);
  assert.ok(day15.dailyNetProfit > 0);

  const day17 = metrics.dailyEvolution[2];
  assert.equal(day17.label, '17/11');
  assert.equal(day17.grossRevenue, 51);
  assert.equal(day17.totalExpenses, 85.9);
  assert.equal(
    day17.dailyNetProfit,
    Math.round((day17.netRevenue - day17.totalCmv - day17.totalExpenses) * 100) / 100
  );

  const direct = computeDailyFinancialEvolution(state.cashflow);
  assert.equal(direct.length, 3);
});

test('buildDailyClosingExportPayload creates complete JSON closing structure', () => {
  const state = createSeedState('2026-11-17');
  const summary = computeDailyClosingSummary(state.cashflow, '2026-11-17');
  const payload = buildDailyClosingExportPayload(summary, '2026-11-17T23:59:00.000Z');

  assert.equal(payload.date, '2026-11-17');
  assert.equal(payload.dateFormatted, '17/11/2026');
  assert.equal(payload.grossRevenue, 51);
  assert.equal(payload.netRevenue, 51);
  assert.equal(payload.totalCupsSold, 3);
  assert.equal(payload.totalExpenses, 85.9);
  assert.equal(payload.dailyNetProfit, summary.dailyNetProfit);
  assert.equal(payload.paymentBreakdown.dinheiro, 51);
  assert.equal(payload.exportedAt, '2026-11-17T23:59:00.000Z');
});
