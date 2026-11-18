import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  PackagePlus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AddIngredientInput, AddStockEntryInput } from '../hooks/useAuroraStore';
import type {
  ExpirationStatus,
  IngredientCategory,
  IngredientStockSummary,
  IngredientUnit,
  PurchaseUnit,
  StockAddition,
  StockStatus,
} from '../types/aurora';
import {
  addDaysISO,
  calculateWeightedAverageUnitCost,
  convertPurchaseToStockUnit,
  formatBRL,
  formatDateBR,
  formatQuantity,
  formatUnitCost,
  getTodayISO,
  PURCHASE_UNIT_MULTIPLIER,
} from '../utils/auroraLogic';
import { ConfirmModal } from './ConfirmModal';

interface InventoryTabProps {
  summaries: IngredientStockSummary[];
  stockAdditions: StockAddition[];
  onAddIngredient: (input: AddIngredientInput) => void;
  onDeleteIngredient: (ingredientId: string, ingredientName: string) => void;
  onAddStockAddition: (input: AddStockEntryInput) => void;
  onDeleteStockAddition: (additionId: string) => void;
}

const CATEGORIES: Array<'Todos' | IngredientCategory> = [
  'Todos',
  'Base',
  'Fruta',
  'Complemento',
  'Embalagem',
];

const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'Base',
  'Fruta',
  'Complemento',
  'Embalagem',
];

export function InventoryTab({
  summaries,
  stockAdditions,
  onAddIngredient,
  onDeleteIngredient,
  onAddStockAddition,
  onDeleteStockAddition,
}: InventoryTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | IngredientCategory>('Todos');
  const [statusFilter, setStatusFilter] = useState<
    'Todos' | StockStatus | 'VENCIMENTO_URGENTE' | 'VENCIMENTO_BREVE'
  >('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal state: Manual Stock Replenishment (+ Entrada)
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null);
  const [entryQuantity, setEntryQuantity] = useState<string>('');
  const [entryPurchaseUnit, setEntryPurchaseUnit] = useState<PurchaseUnit>('kg');
  const [entryTotalPaid, setEntryTotalPaid] = useState<string>('');
  const [entryExpirationDate, setEntryExpirationDate] = useState<string>(() =>
    addDaysISO(getTodayISO(), 30)
  );
  const [entryDate, setEntryDate] = useState<string>(getTodayISO);
  const [entryNote, setEntryNote] = useState<string>('');
  const [entryError, setEntryError] = useState<string | null>(null);

  // Modal state: + Novo Insumo
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<IngredientCategory>('Complemento');
  const [newUnit, setNewUnit] = useState<IngredientUnit>('g');
  const [newTotalPaid, setNewTotalPaid] = useState('');
  const [newPurchaseQty, setNewPurchaseQty] = useState('');
  const [newPurchaseUnit, setNewPurchaseUnit] = useState<PurchaseUnit>('kg');
  const [newExpirationDate, setNewExpirationDate] = useState<string>(() =>
    addDaysISO(getTodayISO(), 30)
  );
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newInitialStock, setNewInitialStock] = useState('');
  const [newMinStock, setNewMinStock] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Confirmation Modal: Excluir Insumo
  const [ingredientToDelete, setIngredientToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const activeSummary = useMemo(
    () => summaries.find((s) => s.ingredient.id === activeIngredientId) ?? null,
    [summaries, activeIngredientId]
  );

  const stats = useMemo(() => {
    const okCount = summaries.filter((s) => s.status === 'OK').length;
    const lowOrCriticalCount = summaries.filter((s) => s.status !== 'OK').length;
    const expiringSoonCount = summaries.filter(
      (s) => s.expirationStatus !== 'NO PRAZO'
    ).length;
    const totalValue = summaries.reduce((sum, s) => sum + s.stockValue, 0);
    return { okCount, lowOrCriticalCount, expiringSoonCount, totalValue };
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summaries.filter((item) => {
      if (categoryFilter !== 'Todos' && item.ingredient.category !== categoryFilter) {
        return false;
      }
      if (statusFilter === 'VENCIMENTO_URGENTE') {
        if (item.expirationStatus !== 'VENCIDO' && item.expirationStatus !== 'VENCE HOJE') {
          return false;
        }
      } else if (statusFilter === 'VENCIMENTO_BREVE') {
        if (item.expirationStatus !== 'VENCE EM BREVE') {
          return false;
        }
      } else if (statusFilter !== 'Todos' && item.status !== statusFilter) {
        return false;
      }
      if (q && !item.ingredient.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [summaries, categoryFilter, statusFilter, searchQuery]);

  const ingredientNameMap = useMemo(
    () => new Map(summaries.map((s) => [s.ingredient.id, s.ingredient])),
    [summaries]
  );

  const openAdditionModal = (item: IngredientStockSummary) => {
    setActiveIngredientId(item.ingredient.id);
    setEntryQuantity('');
    setEntryPurchaseUnit(item.ingredient.unit === 'un' ? 'unidade' : 'kg');
    setEntryTotalPaid('');
    setEntryExpirationDate(addDaysISO(getTodayISO(), 30));
    setEntryDate(getTodayISO());
    setEntryNote('');
    setEntryError(null);
  };

  const syncNewIngredientConverter = (
    paidStr: string,
    qtyStr: string,
    purchaseUnit: PurchaseUnit
  ) => {
    const config = PURCHASE_UNIT_MULTIPLIER[purchaseUnit];
    setNewUnit(config.baseUnit);

    const parsedQty = Number(qtyStr.replace(',', '.'));
    const parsedPaid = Number(paidStr.replace(',', '.'));

    if (!qtyStr.trim() || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      setNewInitialStock('');
      setNewUnitCost('');
      return;
    }

    const conversion = convertPurchaseToStockUnit({
      purchaseQuantity: parsedQty,
      purchaseUnit,
      totalPaid: Number.isFinite(parsedPaid) && parsedPaid > 0 ? parsedPaid : 0,
    });

    setNewInitialStock(String(conversion.convertedQuantity));
    setNewUnitCost(
      paidStr.trim() && Number.isFinite(parsedPaid) && parsedPaid > 0
        ? String(conversion.unitCost)
        : ''
    );
  };

  const openCreateModal = () => {
    setNewName('');
    setNewCategory('Complemento');
    setNewUnit('g');
    setNewTotalPaid('');
    setNewPurchaseQty('');
    setNewPurchaseUnit('kg');
    setNewExpirationDate(addDaysISO(getTodayISO(), 30));
    setNewUnitCost('');
    setNewInitialStock('');
    setNewMinStock('');
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const newIngredientConversionPreview = useMemo(() => {
    const qty = Number(newPurchaseQty.replace(',', '.'));
    const paid = Number(newTotalPaid.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const conv = convertPurchaseToStockUnit({
      purchaseQuantity: qty,
      purchaseUnit: newPurchaseUnit,
      totalPaid: Number.isFinite(paid) && paid > 0 ? paid : 0,
    });
    return {
      purchaseQty: qty,
      totalPaid: Number.isFinite(paid) && paid > 0 ? paid : 0,
      ...conv,
    };
  }, [newPurchaseQty, newPurchaseUnit, newTotalPaid]);

  const additionPreview = useMemo(() => {
    if (!activeSummary) return null;
    const qty = Number(entryQuantity.replace(',', '.'));
    const paid = Number(entryTotalPaid.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) {
      return null;
    }
    const conv = convertPurchaseToStockUnit({
      purchaseQuantity: qty,
      purchaseUnit: entryPurchaseUnit,
      totalPaid: Number.isFinite(paid) && paid > 0 ? paid : 0,
    });
    if (conv.convertedQuantity <= 0 || !Number.isFinite(paid) || paid <= 0) {
      return {
        convertedQuantity: conv.convertedQuantity,
        lotUnitCost: null as number | null,
        newAverageCost: null as number | null,
      };
    }
    const lotUnitCost = conv.unitCost;
    const newAverageCost = calculateWeightedAverageUnitCost({
      currentBalance: activeSummary.currentBalance,
      currentUnitCost: activeSummary.ingredient.unitCost,
      addedQuantity: conv.convertedQuantity,
      totalPaid: paid,
    });
    return {
      convertedQuantity: conv.convertedQuantity,
      lotUnitCost,
      newAverageCost,
    };
  }, [activeSummary, entryQuantity, entryPurchaseUnit, entryTotalPaid]);

  const handleSubmitAddition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSummary) return;

    const qtyNum = Number(entryQuantity.replace(',', '.'));
    const paidNum = Number(entryTotalPaid.replace(',', '.'));

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setEntryError('Informe uma quantidade positiva para a entrada.');
      return;
    }
    if (!Number.isFinite(paidNum) || paidNum <= 0) {
      setEntryError('Informe o preço total pago (R$) maior que zero.');
      return;
    }
    if (!entryExpirationDate) {
      setEntryError('Informe a nova data de validade do lote.');
      return;
    }

    const conversion = convertPurchaseToStockUnit({
      purchaseQuantity: qtyNum,
      purchaseUnit: entryPurchaseUnit,
      totalPaid: paidNum,
    });

    onAddStockAddition({
      ingredientId: activeSummary.ingredient.id,
      date: entryDate,
      quantity: conversion.convertedQuantity,
      totalPaid: paidNum,
      expirationDate: entryExpirationDate,
      note: entryNote,
    });
    setActiveIngredientId(null);
  };

  const handleSubmitNewIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Informe o nome do insumo.');
      return;
    }
    if (!newExpirationDate) {
      setCreateError('Informe a data de validade obrigatória.');
      return;
    }
    const costNum = Number(newUnitCost.replace(',', '.'));
    const qtyNum = Number(newInitialStock.replace(',', '.'));
    const minNum = Number(newMinStock.replace(',', '.'));

    if (!Number.isFinite(costNum) || costNum <= 0) {
      setCreateError('Informe um custo unitário válido maior que zero.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      setCreateError('Informe uma quantidade inicial válida.');
      return;
    }
    if (!Number.isFinite(minNum) || minNum < 0) {
      setCreateError('Informe um estoque mínimo válido.');
      return;
    }

    onAddIngredient({
      name: newName,
      category: newCategory,
      unit: newUnit,
      unitCost: costNum,
      initialStock: qtyNum,
      minStock: minNum,
      expirationDate: newExpirationDate,
    });
    setCreateModalOpen(false);
  };

  const renderExpirationBadge = (status: ExpirationStatus, label: string) => {
    if (status === 'VENCIDO' || status === 'VENCE HOJE') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 whitespace-nowrap">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    if (status === 'VENCE EM BREVE') {
      return (
        <span
          title="Sair mais rápido no giro FIFO"
          className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 whitespace-nowrap"
        >
          <Clock className="h-3 w-3 shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div
      className="aurora-page-bg space-y-6"
      style={{ backgroundColor: 'var(--aurora-page-bg)' }}
    >
      {/* Top Inventory KPIs + Action Bar */}
      <section className="aurora-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 shadow-sm shadow-purple-950/5">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Estoque, Giro FIFO &amp; Validades ({summaries.length} insumos)
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Controle automático por ficha técnica consumindo lotes mais próximos do vencimento primeiro
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-[#2E0B2F] shadow-xs transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-600"
        >
          <PackagePlus className="h-4 w-4 shrink-0" />
          <span>+ Novo Insumo</span>
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="aurora-card rounded-xl border p-4 shadow-sm shadow-purple-950/5">
          <p className="text-xs font-medium text-slate-600">Valor Total em Estoque</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#4A154B] tabular-nums">
            {formatBRL(stats.totalValue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{summaries.length} insumos ativos</p>
        </div>

        <div className="aurora-card rounded-xl border p-4 shadow-sm shadow-purple-950/5">
          <p className="text-xs font-medium text-slate-600">Saldo Regular (OK)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {stats.okCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Acima do estoque mínimo</p>
        </div>

        <div className="aurora-card rounded-xl border p-4 shadow-sm shadow-purple-950/5">
          <p className="text-xs font-medium text-slate-600">Reposição / Crítico</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-rose-600 tabular-nums">
            {stats.lowOrCriticalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Abaixo ou igual ao mínimo</p>
        </div>

        <div className="aurora-card rounded-xl border p-4 shadow-sm shadow-purple-950/5">
          <p className="text-xs font-medium text-slate-600">Alertas de Vencimento</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-600 tabular-nums">
            {stats.expiringSoonCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Vencidos ou vencendo em até 3 dias</p>
        </div>
      </section>

      {/* Main Inventory Table */}
      <section className="aurora-card rounded-xl border shadow-sm shadow-purple-950/5">
        <div className="aurora-divider flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div className="aurora-pill-group flex flex-wrap items-center gap-1 rounded-lg p-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'aurora-pill-active font-semibold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filtrar por status ou validade"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | 'Todos'
                    | StockStatus
                    | 'VENCIMENTO_URGENTE'
                    | 'VENCIMENTO_BREVE'
                )
              }
              className="aurora-input rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#4A154B] focus:bg-white focus:outline-none"
            >
              <option value="Todos">Todos os Status</option>
              <option value="OK">Estoque: OK</option>
              <option value="REPOR ESTOQUE">Estoque: REPOR ESTOQUE</option>
              <option value="CRÍTICO">Estoque: CRÍTICO</option>
              <option value="VENCIMENTO_URGENTE">Validade: Vencido / Hoje</option>
              <option value="VENCIMENTO_BREVE">Validade: Vence em até 3d</option>
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Buscar insumo"
                placeholder="Buscar insumo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="aurora-input w-52 rounded-lg border py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#4A154B] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
            <thead>
              <tr className="aurora-table-head border-b text-slate-600">
                <th className="px-3.5 py-3 font-semibold">Insumo / Cat.</th>
                <th className="px-2.5 py-3 text-right font-semibold">Custo Unit.</th>
                <th className="px-2.5 py-3 text-right font-semibold">Inicial</th>
                <th className="px-2.5 py-3 text-right font-semibold">Entradas</th>
                <th className="px-2.5 py-3 text-right font-semibold">Saídas</th>
                <th className="px-2.5 py-3 text-right font-semibold">Saldo Atual</th>
                <th className="px-2.5 py-3 text-right font-semibold">Mínimo</th>
                <th className="px-2.5 py-3 font-semibold">Validade (FIFO)</th>
                <th className="px-2.5 py-3 text-right font-semibold">Valor Estoque</th>
                <th className="px-2.5 py-3 font-semibold">Status</th>
                <th className="px-3.5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhum insumo encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((item) => {
                  const { ingredient } = item;
                  return (
                    <tr key={ingredient.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">{ingredient.name}</p>
                        <p className="text-[11px] text-slate-500">{ingredient.category}</p>
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {formatUnitCost(ingredient.unitCost)}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {formatQuantity(item.initialStock, ingredient.unit)}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono text-emerald-700 tabular-nums whitespace-nowrap">
                        +{formatQuantity(item.manualAdditions, ingredient.unit)}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono text-rose-600 tabular-nums whitespace-nowrap">
                        -{formatQuantity(item.automaticExits, ingredient.unit)}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatQuantity(item.currentBalance, ingredient.unit)}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {formatQuantity(item.minStock, ingredient.unit)}
                      </td>
                      <td className="px-2.5 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono text-slate-800 font-medium tabular-nums">
                            {formatDateBR(item.activeExpirationDate)}
                          </span>
                          {renderExpirationBadge(item.expirationStatus, item.expirationLabel)}
                          {item.nextExpirationDate && (
                            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                              Próx. lote: {formatDateBR(item.nextExpirationDate)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono font-medium text-slate-800 tabular-nums whitespace-nowrap">
                        {formatBRL(item.stockValue)}
                      </td>
                      <td className="px-2.5 py-3 whitespace-nowrap">
                        {item.status === 'OK' && (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </span>
                        )}
                        {item.status === 'REPOR ESTOQUE' && (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            <AlertCircle className="h-3 w-3" />
                            REPOR ESTOQUE
                          </span>
                        )}
                        {item.status === 'CRÍTICO' && (
                          <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            <AlertCircle className="h-3 w-3" />
                            CRÍTICO
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAdditionModal(item)}
                            aria-label={`Lançar entrada de ${ingredient.name}`}
                            className="inline-flex items-center gap-1 rounded-md border border-[#4A154B]/20 bg-[#F3E8F4]/70 px-2.5 py-1 text-xs font-semibold text-[#4A154B] hover:bg-[#4A154B] hover:text-white transition-colors"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            <span>+ Entrada</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setIngredientToDelete({
                                id: ingredient.id,
                                name: ingredient.name,
                              })
                            }
                            aria-label={`Excluir insumo ${ingredient.name}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manual Stock Entries History */}
      {stockAdditions.length > 0 && (
        <section className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5">
          <h3 className="font-display text-sm font-bold text-slate-900">
            Histórico de Reposições e Lotes Registrados
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-purple-100 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Compra</th>
                  <th className="py-2 pr-4 font-semibold">Insumo</th>
                  <th className="py-2 pr-4 text-right font-semibold">Quantidade</th>
                  <th className="py-2 pr-4 text-right font-semibold">Total Pago</th>
                  <th className="py-2 pr-4 font-semibold">Validade Lote</th>
                  <th className="py-2 pr-4 font-semibold">Observação</th>
                  <th className="py-2 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {[...stockAdditions].reverse().map((add) => {
                  const ing = ingredientNameMap.get(add.ingredientId);
                  return (
                    <tr key={add.id}>
                      <td className="py-2.5 pr-4 font-mono text-slate-600 tabular-nums">
                        {formatDateBR(add.date)}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {ing?.name ?? add.ingredientId}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        +{formatQuantity(add.quantity, ing?.unit ?? 'g')}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-slate-800 tabular-nums">
                        {add.totalCost !== undefined ? formatBRL(add.totalCost) : '-'}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-700 tabular-nums">
                        {formatDateBR(add.expirationDate)}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{add.note || '-'}</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteStockAddition(add.id)}
                          aria-label={`Remover entrada de ${ing?.name ?? 'insumo'}`}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal: Reposição (+ Entrada) com Preço, Conversor e Validade */}
      {activeSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-modal-title"
        >
          <div className="aurora-card max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="stock-modal-title" className="font-display text-base font-bold text-slate-900">
                  Reposição de Estoque (+ Entrada)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeSummary.ingredient.name} · Saldo:{' '}
                  <strong className="font-mono text-slate-800">
                    {formatQuantity(activeSummary.currentBalance, activeSummary.ingredient.unit)}
                  </strong>{' '}
                  · Custo atual:{' '}
                  <strong className="font-mono text-slate-800">
                    {formatUnitCost(activeSummary.ingredient.unitCost)}/{activeSummary.ingredient.unit}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveIngredientId(null)}
                aria-label="Fechar janela de entrada de estoque"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {entryError && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                {entryError}
              </div>
            )}

            <form onSubmit={handleSubmitAddition} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="stock-paid" className="block text-xs font-medium text-slate-700">
                    Preço Total Pago (R$)
                  </label>
                  <input
                    id="stock-paid"
                    type="number"
                    min="0.01"
                    step="0.01"
                    autoFocus
                    placeholder="Ex: 30.00"
                    value={entryTotalPaid}
                    onChange={(e) => {
                      setEntryTotalPaid(e.target.value);
                      setEntryError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="stock-qty" className="block text-xs font-medium text-slate-700">
                    Quantidade da Embalagem / Compra
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="stock-qty"
                      type="number"
                      min="0.001"
                      step="any"
                      placeholder={
                        entryPurchaseUnit === 'kg' || entryPurchaseUnit === 'L'
                          ? 'Ex: 1'
                          : entryPurchaseUnit === 'unidade'
                            ? 'Ex: 50'
                            : 'Ex: 1000'
                      }
                      value={entryQuantity}
                      onChange={(e) => {
                        setEntryQuantity(e.target.value);
                        setEntryError(null);
                      }}
                      className="aurora-input min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:bg-white focus:outline-none"
                    />
                    <select
                      id="stock-purchase-unit"
                      aria-label="Unidade de compra da entrada"
                      value={entryPurchaseUnit}
                      onChange={(e) => {
                        setEntryPurchaseUnit(e.target.value as PurchaseUnit);
                        setEntryError(null);
                      }}
                      className="aurora-input w-28 shrink-0 rounded-lg border px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                    >
                      {activeSummary.ingredient.unit === 'un' ? (
                        <option value="unidade">unidade</option>
                      ) : (
                        <>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="stock-exp" className="block text-xs font-medium text-slate-700">
                    Nova Data de Validade
                  </label>
                  <input
                    id="stock-exp"
                    type="date"
                    value={entryExpirationDate}
                    onChange={(e) => {
                      setEntryExpirationDate(e.target.value);
                      setEntryError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="stock-date" className="block text-xs font-medium text-slate-700">
                    Data da Compra
                  </label>
                  <input
                    id="stock-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="stock-note" className="block text-xs font-medium text-slate-700">
                  Observação / Fornecedor (opcional)
                </label>
                <input
                  id="stock-note"
                  type="text"
                  placeholder="Ex: Reposição distribuidor central"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                />
              </div>

              {additionPreview && (
                <div className="rounded-lg border border-[#4A154B]/15 bg-[#F3E8F4]/60 px-3.5 py-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conversão para o estoque:</span>
                    <strong className="font-mono text-emerald-700 tabular-nums">
                      +{formatQuantity(additionPreview.convertedQuantity, activeSummary.ingredient.unit)}
                    </strong>
                  </div>
                  {additionPreview.lotUnitCost !== null && additionPreview.newAverageCost !== null && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Custo unitário deste lote:</span>
                        <strong className="font-mono text-slate-900 tabular-nums">
                          {formatUnitCost(additionPreview.lotUnitCost)}/{activeSummary.ingredient.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Novo custo médio atualizado:</span>
                        <strong className="font-mono text-[#4A154B] tabular-nums">
                          {formatUnitCost(additionPreview.newAverageCost)}/{activeSummary.ingredient.unit}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveIngredientId(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-[#2E0B2F] shadow-xs hover:bg-amber-400"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: + Novo Insumo com Conversor Inteligente */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-ing-title"
        >
          <div className="aurora-card max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-purple-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="create-ing-title" className="font-display text-base font-bold text-slate-900">
                    Cadastrar Novo Insumo
                  </h2>
                  <p className="text-xs text-slate-500">
                    Informe o preço pago e a embalagem — o custo unitário e estoque inicial são convertidos automaticamente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Fechar janela de novo insumo"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleSubmitNewIngredient} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="ing-new-name" className="block text-xs font-medium text-slate-700">
                    Nome do Insumo
                  </label>
                  <input
                    id="ing-new-name"
                    type="text"
                    autoFocus
                    placeholder="Ex: Granola Artesanal"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setCreateError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ing-new-cat" className="block text-xs font-medium text-slate-700">
                    Categoria
                  </label>
                  <select
                    id="ing-new-cat"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as IngredientCategory)}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  >
                    {INGREDIENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ing-new-exp" className="block text-xs font-medium text-slate-700">
                    Data de Validade
                  </label>
                  <input
                    id="ing-new-exp"
                    type="date"
                    value={newExpirationDate}
                    onChange={(e) => {
                      setNewExpirationDate(e.target.value);
                      setCreateError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs text-slate-900 focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Conversor Inteligente de Compra */}
              <div className="rounded-xl border border-purple-200/70 bg-purple-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[#4A154B]" />
                    <span className="text-xs font-bold text-[#4A154B]">
                      Conversor Automático de Compra &amp; Custo
                    </span>
                  </div>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    Base no estoque: {newUnit === 'g' ? 'Gramas / ml (g)' : 'Unidades (un)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ing-new-total-paid" className="block text-xs font-medium text-slate-700">
                      Preço Total Pago (R$)
                    </label>
                    <input
                      id="ing-new-total-paid"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Ex: 30.00"
                      value={newTotalPaid}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewTotalPaid(val);
                        setCreateError(null);
                        syncNewIngredientConverter(val, newPurchaseQty, newPurchaseUnit);
                      }}
                      className="mt-1 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ing-new-pkg-qty" className="block text-xs font-medium text-slate-700">
                      Quantidade da Embalagem / Compra
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="ing-new-pkg-qty"
                        type="number"
                        min="0.001"
                        step="any"
                        placeholder={
                          newPurchaseUnit === 'kg' || newPurchaseUnit === 'L'
                            ? 'Ex: 1'
                            : newPurchaseUnit === 'unidade'
                              ? 'Ex: 100'
                              : 'Ex: 1000'
                        }
                        value={newPurchaseQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPurchaseQty(val);
                          setCreateError(null);
                          syncNewIngredientConverter(newTotalPaid, val, newPurchaseUnit);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                      />
                      <select
                        id="ing-new-pkg-unit"
                        aria-label="Unidade de compra"
                        value={newPurchaseUnit}
                        onChange={(e) => {
                          const unitVal = e.target.value as PurchaseUnit;
                          setNewPurchaseUnit(unitVal);
                          setCreateError(null);
                          syncNewIngredientConverter(newTotalPaid, newPurchaseQty, unitVal);
                        }}
                        className="w-28 shrink-0 rounded-lg border border-purple-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-[#4A154B] focus:outline-none"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="unidade">unidade</option>
                      </select>
                    </div>
                  </div>
                </div>

                {newIngredientConversionPreview && (
                  <div
                    data-testid="new-ingredient-conversion-preview"
                    className="rounded-lg border border-[#4A154B]/15 bg-white/85 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="text-slate-600">
                      Estoque inicial:{' '}
                      <strong className="font-mono text-[#4A154B] tabular-nums">
                        {formatQuantity(
                          newIngredientConversionPreview.convertedQuantity,
                          newIngredientConversionPreview.baseUnit
                        )}
                      </strong>
                    </span>
                    <span className="text-slate-600">
                      Custo calculado:{' '}
                      <strong className="font-mono text-emerald-700 tabular-nums">
                        {newIngredientConversionPreview.unitCost > 0
                          ? `${formatUnitCost(newIngredientConversionPreview.unitCost)} / ${newIngredientConversionPreview.baseUnit}`
                          : 'Informe o preço pago'}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Campos Calculados (editáveis para ajustes finos) + Estoque Mínimo */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label htmlFor="ing-new-qty" className="block text-xs font-medium text-slate-700">
                    Quantidade Inicial ({newUnit})
                  </label>
                  <input
                    id="ing-new-qty"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={newUnit === 'g' ? '1000' : '100'}
                    value={newInitialStock}
                    onChange={(e) => {
                      setNewInitialStock(e.target.value);
                      setCreateError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ing-new-cost" className="block text-xs font-medium text-slate-700">
                    Custo Unitário (R$ / {newUnit})
                  </label>
                  <input
                    id="ing-new-cost"
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder={newUnit === 'g' ? '0.0300' : '0.45'}
                    value={newUnitCost}
                    onChange={(e) => {
                      setNewUnitCost(e.target.value);
                      setCreateError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ing-new-min" className="block text-xs font-medium text-slate-700">
                    Estoque Mínimo ({newUnit})
                  </label>
                  <input
                    id="ing-new-min"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={newUnit === 'g' ? '300' : '30'}
                    value={newMinStock}
                    onChange={(e) => {
                      setNewMinStock(e.target.value);
                      setCreateError(null);
                    }}
                    className="aurora-input mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-purple-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-[#2E0B2F] shadow-xs hover:bg-amber-400"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Excluir Insumo */}
      <ConfirmModal
        open={ingredientToDelete !== null}
        title="Excluir Insumo do Estoque"
        description={
          ingredientToDelete
            ? `Deseja remover "${ingredientToDelete.name}" do estoque? Ele também será desvinculado das fichas técnicas que o utilizam.`
            : ''
        }
        confirmLabel="Sim, excluir insumo"
        onConfirm={() => {
          if (ingredientToDelete) {
            onDeleteIngredient(ingredientToDelete.id, ingredientToDelete.name);
            setIngredientToDelete(null);
          }
        }}
        onCancel={() => setIngredientToDelete(null)}
      />
    </div>
  );
}
