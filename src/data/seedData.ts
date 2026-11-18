import type {
  AuroraStoreState,
  CashflowEntry,
  Customer,
  Ingredient,
  Product,
} from '../types/aurora';
import {
  addDaysISO,
  calculateProductUnitCmv,
  computeSaleFinancials,
  getTodayISO,
  roundCurrency,
} from '../utils/auroraLogic';

export const INITIAL_CASH_BALANCE = 500.0;
export const WASTE_RATE = 0.05;

export function createSeedIngredients(referenceDateISO: string = getTodayISO()): Ingredient[] {
  return [
    {
      id: 'ing-1',
      name: 'Açai Tradicional',
      category: 'Base',
      unit: 'g',
      unitCost: 0.022,
      initialStock: 10000,
      minStock: 3000,
      expirationDate: addDaysISO(referenceDateISO, 30),
    },
    {
      id: 'ing-2',
      name: 'Creme de Ninho',
      category: 'Base',
      unit: 'g',
      unitCost: 0.021667,
      initialStock: 3000,
      minStock: 1000,
      expirationDate: addDaysISO(referenceDateISO, 20),
    },
    {
      id: 'ing-3',
      name: 'Morango',
      category: 'Fruta',
      unit: 'g',
      unitCost: 0.03,
      initialStock: 2000,
      minStock: 500,
      expirationDate: addDaysISO(referenceDateISO, 2),
    },
    {
      id: 'ing-4',
      name: 'Banana',
      category: 'Fruta',
      unit: 'g',
      unitCost: 0.006,
      initialStock: 3000,
      minStock: 800,
      expirationDate: addDaysISO(referenceDateISO, 3),
    },
    {
      id: 'ing-5',
      name: 'Abacaxi',
      category: 'Fruta',
      unit: 'g',
      unitCost: 0.01,
      initialStock: 2000,
      minStock: 500,
      expirationDate: addDaysISO(referenceDateISO, 5),
    },
    {
      id: 'ing-6',
      name: 'Leite em Pó',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.044725,
      initialStock: 1200,
      minStock: 400,
      expirationDate: addDaysISO(referenceDateISO, 90),
    },
    {
      id: 'ing-7',
      name: 'Cereal',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.0338,
      initialStock: 1000,
      minStock: 300,
      expirationDate: addDaysISO(referenceDateISO, 75),
    },
    {
      id: 'ing-8',
      name: 'Confeito M&M',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.0378,
      initialStock: 1000,
      minStock: 300,
      expirationDate: addDaysISO(referenceDateISO, 120),
    },
    {
      id: 'ing-9',
      name: 'Paçoca',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.0179,
      initialStock: 1000,
      minStock: 300,
      expirationDate: addDaysISO(referenceDateISO, 60),
    },
    {
      id: 'ing-10',
      name: 'Cobertura Morango',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.016915,
      initialStock: 1300,
      minStock: 400,
      expirationDate: addDaysISO(referenceDateISO, 60),
    },
    {
      id: 'ing-11',
      name: 'Leite Condensado',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.017696,
      initialStock: 1580,
      minStock: 395,
      expirationDate: addDaysISO(referenceDateISO, 45),
    },
    {
      id: 'ing-12',
      name: 'Nutella',
      category: 'Complemento',
      unit: 'g',
      unitCost: 0.1035,
      initialStock: 700,
      minStock: 140,
      expirationDate: addDaysISO(referenceDateISO, 90),
    },
    {
      id: 'ing-13',
      name: 'Copo 300ml + Tampa',
      category: 'Embalagem',
      unit: 'un',
      unitCost: 0.588,
      initialStock: 100,
      minStock: 30,
      expirationDate: addDaysISO(referenceDateISO, 365),
    },
    {
      id: 'ing-14',
      name: 'Copo 500ml + Tampa',
      category: 'Embalagem',
      unit: 'un',
      unitCost: 0.5367,
      initialStock: 100,
      minStock: 30,
      expirationDate: addDaysISO(referenceDateISO, 365),
    },
    {
      id: 'ing-15',
      name: 'Copo 700ml + Tampa',
      category: 'Embalagem',
      unit: 'un',
      unitCost: 1.272,
      initialStock: 50,
      minStock: 15,
      expirationDate: addDaysISO(referenceDateISO, 365),
    },
    {
      id: 'ing-16',
      name: 'Colher',
      category: 'Embalagem',
      unit: 'un',
      unitCost: 0.138,
      initialStock: 200,
      minStock: 50,
      expirationDate: addDaysISO(referenceDateISO, 365),
    },
    {
      id: 'ing-17',
      name: 'Guardanapo',
      category: 'Embalagem',
      unit: 'un',
      unitCost: 0.1,
      initialStock: 200,
      minStock: 50,
      expirationDate: addDaysISO(referenceDateISO, 365),
    },
    {
      id: 'ing-18',
      name: 'Sacola',
      category: 'Embalagem',
      unit: 'un',
      unitCost: 0.6,
      initialStock: 100,
      minStock: 30,
      expirationDate: addDaysISO(referenceDateISO, 365),
    },
  ];
}

export const SEED_INGREDIENTS: Ingredient[] = createSeedIngredients();

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Copo 300ml Tradicional (Banana)',
    sizeLabel: '300ml',
    practicedPrice: 16.0,
    recipe: [
      { ingredientId: 'ing-1', quantity: 200 },
      { ingredientId: 'ing-4', quantity: 60 },
      { ingredientId: 'ing-11', quantity: 20 },
      { ingredientId: 'ing-6', quantity: 20 },
      { ingredientId: 'ing-13', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Copo 300ml Tradicional (Abacaxi)',
    sizeLabel: '300ml',
    practicedPrice: 16.5,
    recipe: [
      { ingredientId: 'ing-1', quantity: 200 },
      { ingredientId: 'ing-5', quantity: 60 },
      { ingredientId: 'ing-11', quantity: 20 },
      { ingredientId: 'ing-6', quantity: 20 },
      { ingredientId: 'ing-13', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-3',
    name: 'Copo 300ml Tradicional (Morango)',
    sizeLabel: '300ml',
    practicedPrice: 20.0,
    recipe: [
      { ingredientId: 'ing-1', quantity: 220 },
      { ingredientId: 'ing-3', quantity: 60 },
      { ingredientId: 'ing-11', quantity: 20 },
      { ingredientId: 'ing-6', quantity: 20 },
      { ingredientId: 'ing-13', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-4',
    name: 'Copo 300ml Supremo',
    sizeLabel: '300ml',
    practicedPrice: 17.0,
    recipe: [
      { ingredientId: 'ing-1', quantity: 200 },
      { ingredientId: 'ing-4', quantity: 10 },
      { ingredientId: 'ing-5', quantity: 10 },
      { ingredientId: 'ing-3', quantity: 10 },
      { ingredientId: 'ing-6', quantity: 10 },
      { ingredientId: 'ing-8', quantity: 10 },
      { ingredientId: 'ing-9', quantity: 10 },
      { ingredientId: 'ing-7', quantity: 10 },
      { ingredientId: 'ing-10', quantity: 10 },
      { ingredientId: 'ing-11', quantity: 10 },
      { ingredientId: 'ing-13', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-5',
    name: 'Copo 500ml Tradicional (Banana)',
    sizeLabel: '500ml',
    practicedPrice: 25.0,
    recipe: [
      { ingredientId: 'ing-1', quantity: 400 },
      { ingredientId: 'ing-4', quantity: 60 },
      { ingredientId: 'ing-6', quantity: 20 },
      { ingredientId: 'ing-11', quantity: 20 },
      { ingredientId: 'ing-14', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-6',
    name: 'Copo 500ml Tradicional (Abacaxi)',
    sizeLabel: '500ml',
    practicedPrice: 25.5,
    recipe: [
      { ingredientId: 'ing-1', quantity: 400 },
      { ingredientId: 'ing-5', quantity: 60 },
      { ingredientId: 'ing-6', quantity: 20 },
      { ingredientId: 'ing-11', quantity: 20 },
      { ingredientId: 'ing-14', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-7',
    name: 'Copo 500ml Tradicional (Morango)',
    sizeLabel: '500ml',
    practicedPrice: 27.5,
    recipe: [
      { ingredientId: 'ing-1', quantity: 400 },
      { ingredientId: 'ing-3', quantity: 40 },
      { ingredientId: 'ing-6', quantity: 20 },
      { ingredientId: 'ing-11', quantity: 40 },
      { ingredientId: 'ing-14', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
  {
    id: 'prod-8',
    name: 'Copo 700ml Supremo',
    sizeLabel: '700ml',
    practicedPrice: 35.5,
    recipe: [
      { ingredientId: 'ing-1', quantity: 500 },
      { ingredientId: 'ing-4', quantity: 40 },
      { ingredientId: 'ing-5', quantity: 40 },
      { ingredientId: 'ing-3', quantity: 40 },
      { ingredientId: 'ing-6', quantity: 10 },
      { ingredientId: 'ing-8', quantity: 10 },
      { ingredientId: 'ing-9', quantity: 10 },
      { ingredientId: 'ing-7', quantity: 10 },
      { ingredientId: 'ing-10', quantity: 10 },
      { ingredientId: 'ing-11', quantity: 20 },
      { ingredientId: 'ing-15', quantity: 1 },
      { ingredientId: 'ing-16', quantity: 1 },
      { ingredientId: 'ing-17', quantity: 1 },
      { ingredientId: 'ing-18', quantity: 1 },
    ],
  },
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Cliente Balcão / Avulso',
    whatsapp: '-',
    neighborhood: 'Retirada no Local',
    preferredChannel: 'Balcão',
    notes: 'Atendimento presencial no balcão',
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'cust-2',
    name: 'Mariana Silva',
    whatsapp: '(67) 99214-8830',
    neighborhood: 'Centro',
    preferredChannel: 'WhatsApp',
    notes: 'Prefere banana bem madura',
    createdAt: '2026-11-05T14:20:00.000Z',
  },
  {
    id: 'cust-3',
    name: 'Lucas Oliveira',
    whatsapp: '(67) 99841-2219',
    neighborhood: 'Jardim dos Estados',
    preferredChannel: 'iFood',
    notes: 'Apartamento 402 — tocar interfone',
    createdAt: '2026-11-08T18:10:00.000Z',
  },
  {
    id: 'cust-4',
    name: 'Fernanda Costa',
    whatsapp: '(67) 99105-4472',
    neighborhood: 'Tiradentes',
    preferredChannel: 'WhatsApp',
    notes: 'Cliente recorrente de fim de tarde',
    createdAt: '2026-11-10T16:45:00.000Z',
  },
];

function buildSeedSale(params: {
  id: string;
  date: string;
  customer: Customer;
  product: Product;
  quantity: number;
  channel: 'WhatsApp' | 'iFood' | 'Balcão' | 'Instagram';
  paymentMethod: 'Pix' | 'Cartão Crédito' | 'Dinheiro';
  feeDiscount: number;
  ingredients: Ingredient[];
  createdAt: string;
}): CashflowEntry {
  const unitCmv = calculateProductUnitCmv(params.product, params.ingredients, WASTE_RATE);
  const financials = computeSaleFinancials({
    quantity: params.quantity,
    unitPrice: params.product.practicedPrice,
    feeDiscount: params.feeDiscount,
    unitCmv,
  });

  return {
    id: params.id,
    date: params.date,
    type: 'entrada',
    customerId: params.customer.id,
    customerName: params.customer.name,
    productId: params.product.id,
    productName: params.product.name,
    quantity: params.quantity,
    unitPrice: params.product.practicedPrice,
    grossAmount: financials.grossAmount,
    feeDiscount: financials.feeDiscount,
    netAmount: financials.netAmount,
    unitCmv: roundCurrency(unitCmv),
    totalCmv: financials.totalCmv,
    saleProfit: financials.saleProfit,
    channel: params.channel,
    description: `Venda: ${params.quantity}x ${params.product.name} — ${params.customer.name}`,
    amount: financials.netAmount,
    paymentMethod: params.paymentMethod,
    createdAt: params.createdAt,
  };
}

export function createSeedState(referenceDateISO: string = getTodayISO()): AuroraStoreState {
  const ingredients = createSeedIngredients(referenceDateISO);
  const prod1 = SEED_PRODUCTS[0];
  const prod4 = SEED_PRODUCTS[3];
  const prod8 = SEED_PRODUCTS[7];

  const cust1 = SEED_CUSTOMERS[0];
  const cust2 = SEED_CUSTOMERS[1];
  const cust3 = SEED_CUSTOMERS[2];

  const cashflow: CashflowEntry[] = [
    buildSeedSale({
      id: 'cf-1',
      date: '2026-11-15',
      customer: cust2,
      product: prod1,
      quantity: 2,
      channel: 'WhatsApp',
      paymentMethod: 'Pix',
      feeDiscount: 0,
      ingredients,
      createdAt: '2026-11-15T14:30:00.000Z',
    }),
    buildSeedSale({
      id: 'cf-2',
      date: '2026-11-16',
      customer: cust3,
      product: prod8,
      quantity: 1,
      channel: 'iFood',
      paymentMethod: 'Cartão Crédito',
      feeDiscount: 4.26,
      ingredients,
      createdAt: '2026-11-16T19:15:00.000Z',
    }),
    buildSeedSale({
      id: 'cf-3',
      date: '2026-11-17',
      customer: cust1,
      product: prod4,
      quantity: 3,
      channel: 'Balcão',
      paymentMethod: 'Dinheiro',
      feeDiscount: 0,
      ingredients,
      createdAt: '2026-11-17T15:40:00.000Z',
    }),
    {
      id: 'cf-4',
      date: '2026-11-17',
      type: 'saida',
      description: 'Reposição Morango e Leite Condensado',
      expenseCategory: 'Compra de Insumos',
      amount: 85.9,
      paymentMethod: 'Pix',
      createdAt: '2026-11-17T17:10:00.000Z',
    },
  ];

  return {
    version: 2,
    initialCashBalance: INITIAL_CASH_BALANCE,
    wasteRate: WASTE_RATE,
    ingredients,
    products: SEED_PRODUCTS.map((p) => ({
      ...p,
      recipe: p.recipe.map((r) => ({ ...r })),
    })),
    customers: SEED_CUSTOMERS.map((c) => ({ ...c })),
    cashflow,
    stockAdditions: [],
  };
}
