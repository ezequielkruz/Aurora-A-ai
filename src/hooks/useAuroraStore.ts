import { useCallback, useEffect, useState } from 'react';
import { createSeedState } from '../data/seedData';
import type {
  AuroraStoreState,
  CashflowEntry,
  Customer,
  ExpenseCategory,
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  PaymentMethod,
  Product,
  RecipeItem,
  SalesChannel,
  StockAddition,
} from '../types/aurora';
import {
  calculateProductUnitCmv,
  calculateWeightedAverageUnitCost,
  computeInventorySummaries,
  computeSaleFinancials,
  migrateStoreState,
  roundCurrency,
  roundUnitCost,
  STORAGE_KEY,
  validateAuroraStoreState,
  validateSaleStockAvailability,
} from '../utils/auroraLogic';

function loadInitialState(): AuroraStoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed: unknown = JSON.parse(raw);
    if (validateAuroraStoreState(parsed)) {
      return migrateStoreState(parsed);
    }
  } catch {
    // Fallback to seed state if storage is corrupt
  }
  return createSeedState();
}

export interface AddSaleInput {
  date: string;
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  feeDiscount: number;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface AddExpenseInput {
  date: string;
  description: string;
  expenseCategory: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface AddCustomerInput {
  name: string;
  whatsapp: string;
  neighborhood: string;
  preferredChannel: SalesChannel;
  notes: string;
}

export interface AddProductInput {
  name: string;
  sizeLabel: string;
  practicedPrice: number;
  recipe: RecipeItem[];
}

export interface AddIngredientInput {
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  unitCost: number;
  initialStock: number;
  minStock: number;
  expirationDate: string;
}

export interface AddStockEntryInput {
  ingredientId: string;
  date: string;
  quantity: number;
  totalPaid: number;
  expirationDate: string;
  note?: string;
}

export function useAuroraStore() {
  const [state, setState] = useState<AuroraStoreState>(() => loadInitialState());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors gracefully
    }
  }, [state]);

  const addSale = useCallback((input: AddSaleInput) => {
    setState((prev) => {
      const product = prev.products.find((p) => p.id === input.productId);
      const customer = prev.customers.find((c) => c.id === input.customerId);
      if (!product || !customer) return prev;
      if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !Number.isInteger(input.quantity)) {
        return prev;
      }

      const summaries = computeInventorySummaries(
        prev.ingredients,
        prev.products,
        prev.cashflow,
        prev.stockAdditions
      );
      const stockCheck = validateSaleStockAvailability({
        product,
        quantity: input.quantity,
        inventorySummaries: summaries,
      });
      if (!stockCheck.isValid) {
        return prev;
      }

      const unitCmv = calculateProductUnitCmv(product, prev.ingredients, prev.wasteRate);
      const financials = computeSaleFinancials({
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        feeDiscount: input.feeDiscount,
        unitCmv,
      });

      const entry: CashflowEntry = {
        id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: input.date,
        type: 'entrada',
        customerId: customer.id,
        customerName: customer.name,
        productId: product.id,
        productName: product.name,
        quantity: input.quantity,
        unitPrice: roundCurrency(input.unitPrice),
        grossAmount: financials.grossAmount,
        feeDiscount: financials.feeDiscount,
        netAmount: financials.netAmount,
        unitCmv: roundCurrency(unitCmv),
        totalCmv: financials.totalCmv,
        saleProfit: financials.saleProfit,
        channel: input.channel,
        description: `Venda: ${input.quantity}x ${product.name} — ${customer.name}`,
        amount: financials.netAmount,
        paymentMethod: input.paymentMethod,
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        cashflow: [...prev.cashflow, entry],
      };
    });
  }, []);

  const addExpense = useCallback((input: AddExpenseInput) => {
    setState((prev) => {
      const entry: CashflowEntry = {
        id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: input.date,
        type: 'saida',
        description: input.description.trim(),
        expenseCategory: input.expenseCategory,
        amount: roundCurrency(input.amount),
        paymentMethod: input.paymentMethod,
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        cashflow: [...prev.cashflow, entry],
      };
    });
  }, []);

  const deleteCashflowEntry = useCallback((entryId: string) => {
    setState((prev) => ({
      ...prev,
      cashflow: prev.cashflow.filter((e) => e.id !== entryId),
    }));
  }, []);

  const addIngredient = useCallback((input: AddIngredientInput) => {
    setState((prev) => {
      const newIngredient: Ingredient = {
        id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        category: input.category,
        unit: input.unit,
        unitCost: roundUnitCost(Math.max(0, input.unitCost)),
        initialStock: Math.max(0, input.initialStock),
        minStock: Math.max(0, input.minStock),
        expirationDate: input.expirationDate,
      };
      return {
        ...prev,
        ingredients: [...prev.ingredients, newIngredient],
      };
    });
  }, []);

  const deleteIngredient = useCallback((ingredientId: string) => {
    setState((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i.id !== ingredientId),
      stockAdditions: prev.stockAdditions.filter((a) => a.ingredientId !== ingredientId),
      products: prev.products.map((p) => ({
        ...p,
        recipe: p.recipe.filter((r) => r.ingredientId !== ingredientId),
      })),
    }));
  }, []);

  const addStockAddition = useCallback((input: AddStockEntryInput) => {
    setState((prev) => {
      const targetIng = prev.ingredients.find((i) => i.id === input.ingredientId);
      if (!targetIng || input.quantity <= 0) return prev;

      const summaries = computeInventorySummaries(
        prev.ingredients,
        prev.products,
        prev.cashflow,
        prev.stockAdditions
      );
      const currentSummary = summaries.find((s) => s.ingredient.id === input.ingredientId);
      const currentBalance = currentSummary ? currentSummary.currentBalance : targetIng.initialStock;

      const updatedUnitCost = calculateWeightedAverageUnitCost({
        currentBalance,
        currentUnitCost: targetIng.unitCost,
        addedQuantity: input.quantity,
        totalPaid: input.totalPaid,
      });

      const unitCostPaid = roundUnitCost(Math.max(0, input.totalPaid) / input.quantity);

      const addition: StockAddition = {
        id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ingredientId: input.ingredientId,
        date: input.date,
        quantity: input.quantity,
        totalCost: roundCurrency(Math.max(0, input.totalPaid)),
        unitCostPaid,
        expirationDate: input.expirationDate,
        note: input.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedIngredients = prev.ingredients.map((ing) =>
        ing.id === input.ingredientId
          ? {
              ...ing,
              unitCost: updatedUnitCost,
            }
          : ing
      );

      return {
        ...prev,
        ingredients: updatedIngredients,
        stockAdditions: [...prev.stockAdditions, addition],
      };
    });
  }, []);

  const deleteStockAddition = useCallback((additionId: string) => {
    setState((prev) => ({
      ...prev,
      stockAdditions: prev.stockAdditions.filter((a) => a.id !== additionId),
    }));
  }, []);

  const addCustomer = useCallback((input: AddCustomerInput) => {
    setState((prev) => {
      const customer: Customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        whatsapp: input.whatsapp.trim() || '-',
        neighborhood: input.neighborhood.trim() || '-',
        preferredChannel: input.preferredChannel,
        notes: input.notes.trim(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        customers: [...prev.customers, customer],
      };
    });
  }, []);

  const updateCustomer = useCallback((customerId: string, input: AddCustomerInput) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              name: input.name.trim(),
              whatsapp: input.whatsapp.trim() || '-',
              neighborhood: input.neighborhood.trim() || '-',
              preferredChannel: input.preferredChannel,
              notes: input.notes.trim(),
            }
          : c
      ),
    }));
  }, []);

  const deleteCustomer = useCallback((customerId: string) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== customerId),
    }));
  }, []);

  const addProduct = useCallback((input: AddProductInput) => {
    setState((prev) => {
      const product: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        sizeLabel: input.sizeLabel.trim() || 'Personalizado',
        practicedPrice: roundCurrency(Math.max(0, input.practicedPrice)),
        recipe: input.recipe.map((r) => ({
          ingredientId: r.ingredientId,
          quantity: r.quantity,
        })),
      };
      return {
        ...prev,
        products: [...prev.products, product],
      };
    });
  }, []);

  const deleteProduct = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
  }, []);

  const updateProductPrice = useCallback((productId: string, newPrice: number) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, practicedPrice: roundCurrency(Math.max(0, newPrice)) } : p
      ),
    }));
  }, []);

  const importBackup = useCallback((jsonText: string): { ok: boolean; error?: string } => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (!validateAuroraStoreState(parsed)) {
        return {
          ok: false,
          error: 'Arquivo JSON inválido ou incompatível com a estrutura do Aurora Açaí.',
        };
      }
      setState(migrateStoreState(parsed));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Não foi possível ler o arquivo JSON selecionado.' };
    }
  }, []);

  const resetToDefault = useCallback(() => {
    const seed = createSeedState();
    setState(seed);
  }, []);

  return {
    state,
    addSale,
    addExpense,
    deleteCashflowEntry,
    addIngredient,
    deleteIngredient,
    addStockAddition,
    deleteStockAddition,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addProduct,
    deleteProduct,
    updateProductPrice,
    importBackup,
    resetToDefault,
  };
}
