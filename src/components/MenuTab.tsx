import {
  ChevronDown,
  ChevronRight,
  CupSoda,
  Percent,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { AddProductInput } from '../hooks/useAuroraStore';
import type { Ingredient, Product, RecipeItem } from '../types/aurora';
import {
  calculateProductUnitCmv,
  calculateSuggestedPrice,
  formatBRL,
  formatQuantity,
  formatUnitCost,
} from '../utils/auroraLogic';
import { ConfirmModal } from './ConfirmModal';

interface MenuTabProps {
  products: Product[];
  ingredients: Ingredient[];
  wasteRate: number;
  onAddProduct: (input: AddProductInput) => void;
  onDeleteProduct: (productId: string, productName: string) => void;
  onUpdateProductPrice: (productId: string, newPrice: number) => void;
}

interface RecipeDraftRow {
  rowKey: string;
  ingredientId: string;
  quantity: string;
}

export function MenuTab({
  products,
  ingredients,
  wasteRate,
  onAddProduct,
  onDeleteProduct,
  onUpdateProductPrice,
}: MenuTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['prod-1']));

  // New Product Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [recipeRows, setRecipeRows] = useState<RecipeDraftRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const ingredientsMap = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreateModal = () => {
    const defaultIng = ingredients[0]?.id ?? '';
    setNewName('');
    setNewSize('');
    setNewPrice('');
    setRecipeRows([
      {
        rowKey: `row-${Date.now()}`,
        ingredientId: defaultIng,
        quantity: defaultIng === 'ing-1' ? '300' : '1',
      },
    ]);
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleAddRecipeRow = () => {
    const usedIds = new Set(recipeRows.map((r) => r.ingredientId));
    const nextAvailable = ingredients.find((i) => !usedIds.has(i.id)) ?? ingredients[0];
    if (!nextAvailable) return;
    setRecipeRows((prev) => [
      ...prev,
      {
        rowKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ingredientId: nextAvailable.id,
        quantity: nextAvailable.unit === 'un' ? '1' : '20',
      },
    ]);
  };

  const handleUpdateRecipeRow = (
    rowKey: string,
    patch: Partial<{ ingredientId: string; quantity: string }>
  ) => {
    setRecipeRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row))
    );
    setFormError(null);
  };

  const handleRemoveRecipeRow = (rowKey: string) => {
    setRecipeRows((prev) => prev.filter((row) => row.rowKey !== rowKey));
  };

  const draftCalculation = useMemo(() => {
    let baseCost = 0;
    for (const row of recipeRows) {
      const ing = ingredientsMap.get(row.ingredientId);
      const qty = Number(row.quantity.replace(',', '.'));
      if (ing && Number.isFinite(qty) && qty > 0) {
        baseCost += qty * ing.unitCost;
      }
    }
    const unitCmv = baseCost * (1 + wasteRate);
    const suggestedPrice = calculateSuggestedPrice(unitCmv, 0.5);
    return { baseCost, unitCmv, suggestedPrice };
  }, [recipeRows, ingredientsMap, wasteRate]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('Informe o nome do copo ou produto.');
      return;
    }
    if (!newSize.trim()) {
      setFormError('Informe o tamanho do copo (ex: 400ml).');
      return;
    }

    const parsedPrice = Number(newPrice.replace(',', '.'));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setFormError('Informe um preço praticado válido maior que zero.');
      return;
    }

    if (recipeRows.length === 0) {
      setFormError('Adicione pelo menos um insumo à ficha técnica.');
      return;
    }

    // Aggregate quantities cleanly if the user picked the same ingredient twice
    const aggregated = new Map<string, number>();
    for (const row of recipeRows) {
      const qty = Number(row.quantity.replace(',', '.'));
      if (!row.ingredientId || !ingredientsMap.has(row.ingredientId)) {
        setFormError('Selecione insumos válidos na receita.');
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        const ingName = ingredientsMap.get(row.ingredientId)?.name ?? 'insumo';
        setFormError(`Informe uma quantidade maior que zero para "${ingName}".`);
        return;
      }
      aggregated.set(row.ingredientId, (aggregated.get(row.ingredientId) ?? 0) + qty);
    }

    const recipe: RecipeItem[] = Array.from(aggregated.entries()).map(
      ([ingredientId, quantity]) => ({
        ingredientId,
        quantity,
      })
    );

    onAddProduct({
      name: newName,
      sizeLabel: newSize,
      practicedPrice: parsedPrice,
      recipe,
    });

    setCreateModalOpen(false);
  };

  return (
    <div
      className="aurora-page-bg space-y-6"
      style={{ backgroundColor: 'var(--aurora-page-bg)' }}
    >
      {/* Premises & Action Strip */}
      <section className="aurora-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 shadow-sm shadow-purple-950/5">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Fichas Técnicas &amp; Precificação ({products.length} copos)
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Altere o Preço Praticado na tabela ou crie novos copos com baixa automática no estoque
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="hidden items-center gap-3 text-xs text-slate-600 md:flex">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Percent className="h-3.5 w-3.5 text-amber-600" />
              Perda técnica:{' '}
              <strong className="font-mono text-slate-900">
                {(wasteRate * 100).toFixed(0)}%
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <span className="font-medium">
              Margem Alvo:{' '}
              <strong className="font-mono text-amber-600">50%</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-[#2E0B2F] shadow-xs transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-600"
          >
            <CupSoda className="h-4 w-4 shrink-0" />
            <span>+ Novo Copo / Receita</span>
          </button>
        </div>
      </section>

      {/* Interactive Menu & Recipe Table */}
      <section className="aurora-card rounded-xl border shadow-sm shadow-purple-950/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead>
              <tr className="aurora-table-head border-b text-slate-600">
                <th className="px-4 py-3 font-semibold">Copo / Produto</th>
                <th className="px-4 py-3 font-semibold">Insumos na Receita</th>
                <th className="px-4 py-3 text-right font-semibold">CMV Base</th>
                <th className="px-4 py-3 text-right font-semibold">CMV Unit. (+5%)</th>
                <th className="px-4 py-3 text-right font-semibold">Preço Sugerido (50%)</th>
                <th className="px-4 py-3 text-right font-semibold">Preço Praticado (R$)</th>
                <th className="px-4 py-3 text-right font-semibold">Lucro Unit.</th>
                <th className="px-4 py-3 text-right font-semibold">Margem Real</th>
                <th className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Nenhum copo cadastrado no cardápio.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Clique em &quot;+ Novo Copo / Receita&quot; para cadastrar o primeiro produto.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isExpanded = expandedIds.has(product.id);
                  const unitCmv = calculateProductUnitCmv(product, ingredients, wasteRate);
                  const baseCost = unitCmv / (1 + wasteRate);
                  const suggestedPrice = calculateSuggestedPrice(unitCmv, 0.5);
                  const unitProfit = product.practicedPrice - unitCmv;
                  const realMargin =
                    product.practicedPrice > 0
                      ? (unitProfit / product.practicedPrice) * 100
                      : 0;

                  return (
                    <Fragment key={product.id}>
                      <tr className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <button
                            type="button"
                            onClick={() => toggleExpand(product.id)}
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-2 text-left hover:text-[#4A154B] focus-visible:outline-2 focus-visible:outline-[#4A154B]"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-[#4A154B]" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                            <span>{product.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {product.recipe.length} itens ·{' '}
                          <button
                            type="button"
                            onClick={() => toggleExpand(product.id)}
                            className="font-medium text-[#4A154B] hover:underline"
                          >
                            {isExpanded ? 'Ocultar ficha' : 'Ver ficha'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums">
                          {formatBRL(baseCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-amber-700 tabular-nums">
                          {formatBRL(unitCmv)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                          {formatBRL(suggestedPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <label htmlFor={`price-${product.id}`} className="sr-only">
                            Preço praticado para {product.name}
                          </label>
                          <input
                            id={`price-${product.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.practicedPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!Number.isNaN(val) && val >= 0) {
                                onUpdateProductPrice(product.id, val);
                              }
                            }}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-xs font-semibold text-[#4A154B] tabular-nums focus:border-[#4A154B] focus:outline-none"
                          />
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                            unitProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatBRL(unitProfit)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800 tabular-nums">
                          {realMargin.toFixed(1).replace('.', ',')}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            aria-label={`Excluir ${product.name}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#F3E8F4]/35">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <p className="text-xs font-semibold text-[#4A154B]">
                                Ficha Técnica Detalhada — {product.name} ({product.sizeLabel})
                              </p>
                              <p className="text-xs text-slate-600 tabular-nums">
                                Subtotal insumos: <strong>{formatBRL(baseCost)}</strong> · +5% perda:{' '}
                                <strong>{formatBRL(unitCmv - baseCost)}</strong> · Total CMV:{' '}
                                <strong>{formatBRL(unitCmv)}</strong>
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
                              {product.recipe.map((item) => {
                                const ing = ingredientsMap.get(item.ingredientId);
                                if (!ing) return null;
                                const lineCost = item.quantity * ing.unitCost;
                                return (
                                  <div
                                    key={item.ingredientId}
                                    className="flex items-center justify-between gap-2 border-b border-[#4A154B]/10 py-1.5"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-slate-900 truncate">
                                        {ing.name}
                                      </p>
                                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                                        {formatQuantity(item.quantity, ing.unit)} ×{' '}
                                        {formatUnitCost(ing.unitCost)}
                                      </p>
                                    </div>
                                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-800 tabular-nums">
                                      {formatBRL(lineCost)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: + Novo Copo / Receita */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-title"
        >
          <div className="aurora-card flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-purple-100 px-6 py-4">
              <div>
                <h2
                  id="create-product-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Novo Copo / Receita
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cadastre o produto e monte a ficha técnica com os {ingredients.length} insumos cadastrados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Fechar janela de novo copo"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {formError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                  >
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="new-prod-name"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Nome do Copo / Produto
                    </label>
                    <input
                      id="new-prod-name"
                      type="text"
                      autoFocus
                      placeholder="Ex: Copo 400ml Especial"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label
                      htmlFor="new-prod-size"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Tamanho
                    </label>
                    <input
                      id="new-prod-size"
                      type="text"
                      placeholder="400ml"
                      value={newSize}
                      onChange={(e) => {
                        setNewSize(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="new-prod-price"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Preço Praticado (R$)
                      </label>
                      {draftCalculation.suggestedPrice > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewPrice(draftCalculation.suggestedPrice.toFixed(2))
                          }
                          className="text-[11px] font-semibold text-[#4A154B] hover:underline"
                        >
                          Usar sugerido
                        </button>
                      )}
                    </div>
                    <input
                      id="new-prod-price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="22.00"
                      value={newPrice}
                      onChange={(e) => {
                        setNewPrice(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dynamic Ingredients Builder */}
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <span className="text-xs font-semibold text-slate-800">
                      Insumos da Ficha Técnica ({recipeRows.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRecipeRow}
                      className="inline-flex items-center gap-1 rounded-md border border-[#4A154B]/20 bg-[#F3E8F4]/70 px-2.5 py-1 text-xs font-semibold text-[#4A154B] hover:bg-[#4A154B] hover:text-white transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar Insumo</span>
                    </button>
                  </div>

                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    {recipeRows.map((row, idx) => {
                      const ing = ingredientsMap.get(row.ingredientId);
                      const qtyNum = Number(row.quantity.replace(',', '.')) || 0;
                      const lineCost = ing ? qtyNum * ing.unitCost : 0;

                      return (
                        <div
                          key={row.rowKey}
                          className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                        >
                          <div className="min-w-0 flex-1">
                            <label htmlFor={`ing-select-${row.rowKey}`} className="sr-only">
                              Insumo {idx + 1}
                            </label>
                            <select
                              id={`ing-select-${row.rowKey}`}
                              value={row.ingredientId}
                              onChange={(e) =>
                                handleUpdateRecipeRow(row.rowKey, {
                                  ingredientId: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#4A154B] focus:outline-none"
                            >
                              {ingredients.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({item.unit} — {formatUnitCost(item.unitCost)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 w-32 shrink-0">
                            <label htmlFor={`ing-qty-${row.rowKey}`} className="sr-only">
                              Quantidade {idx + 1}
                            </label>
                            <input
                              id={`ing-qty-${row.rowKey}`}
                              type="number"
                              min="0.01"
                              step="any"
                              value={row.quantity}
                              onChange={(e) =>
                                handleUpdateRecipeRow(row.rowKey, {
                                  quantity: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                            />
                            <span className="w-5 text-xs font-mono text-slate-500">
                              {ing?.unit ?? 'g'}
                            </span>
                          </div>

                          <span className="w-20 shrink-0 text-right font-mono text-xs font-medium text-slate-700 tabular-nums">
                            {formatBRL(lineCost)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeRow(row.rowKey)}
                            disabled={recipeRows.length <= 1}
                            aria-label={`Remover insumo ${ing?.name ?? idx + 1}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Cost Preview */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#4A154B]/15 bg-[#F3E8F4]/60 px-4 py-3 text-xs">
                  <div>
                    <span className="text-slate-600">CMV Base: </span>
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {formatBRL(draftCalculation.baseCost)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600">CMV (+5% perda): </span>
                    <strong className="font-mono text-amber-700 tabular-nums">
                      {formatBRL(draftCalculation.unitCmv)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Preço Sugerido (50%): </span>
                    <strong className="font-mono text-[#4A154B] tabular-nums">
                      {formatBRL(draftCalculation.suggestedPrice)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
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
                  Salvar Copo no Cardápio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting a Product */}
      <ConfirmModal
        open={productToDelete !== null}
        title="Excluir Copo do Cardápio"
        description={
          productToDelete
            ? `Tem certeza que deseja excluir "${productToDelete.name}" do cardápio? Vendas já registradas no fluxo de caixa serão preservadas no histórico.`
            : ''
        }
        confirmLabel="Sim, excluir copo"
        onConfirm={() => {
          if (productToDelete) {
            onDeleteProduct(productToDelete.id, productToDelete.name);
            setProductToDelete(null);
          }
        }}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
