import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Check,
  Copy,
  Download,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AddExpenseInput, AddSaleInput } from '../hooks/useAuroraStore';
import type {
  CashflowEntry,
  Customer,
  ExpenseCategory,
  Ingredient,
  IngredientStockSummary,
  PaymentMethod,
  Product,
  SalesChannel,
} from '../types/aurora';
import {
  buildDailyClosingExportPayload,
  calculateProductUnitCmv,
  computeCashflowWithBalance,
  computeDailyClosingSummary,
  computeSaleFinancials,
  formatBRL,
  formatDailyClosingWhatsAppText,
  formatDateBR,
  formatQuantity,
  SALES_CHANNELS,
  validateSaleStockAvailability,
} from '../utils/auroraLogic';

interface CashflowTabProps {
  cashflow: CashflowEntry[];
  initialCashBalance: number;
  wasteRate: number;
  ingredients: Ingredient[];
  inventorySummaries: IngredientStockSummary[];
  products: Product[];
  customers: Customer[];
  onAddSale: (input: AddSaleInput) => void;
  onAddExpense: (input: AddExpenseInput) => void;
  onDeleteEntry: (entryId: string) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Pix',
  'Cartão Crédito',
  'Cartão Débito',
  'Dinheiro',
  'iFood Online',
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Compra de Insumos',
  'Embalagens',
  'Entrega / Motoboy',
  'Marketing',
  'Fixo / Energia / Aluguel',
  'Outros',
];

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CashflowTab({
  cashflow,
  initialCashBalance,
  wasteRate,
  ingredients,
  inventorySummaries,
  products,
  customers,
  onAddSale,
  onAddExpense,
  onDeleteEntry,
}: CashflowTabProps) {
  const [entryMode, setEntryMode] = useState<'entrada' | 'saida'>('entrada');
  const [formError, setFormError] = useState<string | null>(null);

  // Sale state
  const [saleDate, setSaleDate] = useState<string>(getTodayISO);
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id ?? '');
  const [productId, setProductId] = useState<string>(products[0]?.id ?? '');
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>(
    products[0] ? products[0].practicedPrice.toFixed(2) : '0.00'
  );
  const [feeDiscount, setFeeDiscount] = useState<string>('0.00');
  const [channel, setChannel] = useState<SalesChannel>(
    customers[0]?.preferredChannel ?? 'WhatsApp'
  );
  const [salePayment, setSalePayment] = useState<PaymentMethod>('Pix');

  // Expense state
  const [expenseDate, setExpenseDate] = useState<string>(getTodayISO);
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>('Compra de Insumos');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expensePayment, setExpensePayment] = useState<PaymentMethod>('Pix');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');

  // Daily Closing Modal state
  const [closingModalOpen, setClosingModalOpen] = useState<boolean>(false);
  const [closingDate, setClosingDate] = useState<string>(getTodayISO);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);
  const [exportedNotice, setExportedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (products.length === 0) {
      setProductId('');
      setUnitPrice('0.00');
      return;
    }
    const found = products.find((p) => p.id === productId);
    if (!found) {
      setProductId(products[0].id);
      setUnitPrice(products[0].practicedPrice.toFixed(2));
    }
  }, [products, productId]);

  useEffect(() => {
    if (customers.length === 0) {
      setCustomerId('');
      return;
    }
    if (!customers.some((c) => c.id === customerId)) {
      setCustomerId(customers[0].id);
      setChannel(customers[0].preferredChannel);
    }
  }, [customers, customerId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? products[0],
    [products, productId]
  );

  const selectedUnitCmv = useMemo(() => {
    if (!selectedProduct) return 0;
    return calculateProductUnitCmv(selectedProduct, ingredients, wasteRate);
  }, [selectedProduct, ingredients, wasteRate]);

  const salePreview = useMemo(() => {
    const qtyNum = Number(quantity.replace(',', '.')) || 0;
    const priceNum = Number(unitPrice.replace(',', '.')) || 0;
    const feeNum = Number(feeDiscount.replace(',', '.')) || 0;
    return computeSaleFinancials({
      quantity: qtyNum,
      unitPrice: priceNum,
      feeDiscount: feeNum,
      unitCmv: selectedUnitCmv,
    });
  }, [quantity, unitPrice, feeDiscount, selectedUnitCmv]);

  const stockValidation = useMemo(() => {
    const qtyNum = Number(quantity.replace(',', '.'));
    return validateSaleStockAvailability({
      product: selectedProduct,
      quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0,
      inventorySummaries,
    });
  }, [selectedProduct, quantity, inventorySummaries]);

  const handleProductChange = (newProductId: string) => {
    setProductId(newProductId);
    const prod = products.find((p) => p.id === newProductId);
    if (prod) {
      setUnitPrice(prod.practicedPrice.toFixed(2));
    }
    setFormError(null);
  };

  const handleCustomerChange = (newCustomerId: string) => {
    setCustomerId(newCustomerId);
    const cust = customers.find((c) => c.id === newCustomerId);
    if (cust) {
      setChannel(cust.preferredChannel);
    }
    setFormError(null);
  };

  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(quantity.replace(',', '.'));
    const priceNum = Number(unitPrice.replace(',', '.'));
    const feeNum = Number(feeDiscount.replace(',', '.') || '0');

    if (!customerId || !customers.some((c) => c.id === customerId)) {
      setFormError('Selecione um cliente válido.');
      return;
    }
    if (!productId || !products.some((p) => p.id === productId)) {
      setFormError('Selecione um tipo de açaí.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0 || !Number.isInteger(qtyNum)) {
      setFormError('Informe uma quantidade inteira maior que zero.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setFormError('Informe um preço unitário válido.');
      return;
    }
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setFormError('A taxa ou desconto não pode ser negativa.');
      return;
    }

    const latestValidation = validateSaleStockAvailability({
      product: selectedProduct,
      quantity: qtyNum,
      inventorySummaries,
    });
    if (!latestValidation.isValid) {
      const first = latestValidation.shortages[0];
      setFormError(
        `Atenção: Estoque insuficiente de ${first.ingredientName}! Necessário: ${formatQuantity(first.requiredQuantity, first.unit)}, Disponível: ${formatQuantity(first.availableQuantity, first.unit)}.`
      );
      return;
    }

    onAddSale({
      date: saleDate,
      customerId,
      productId,
      quantity: qtyNum,
      unitPrice: priceNum,
      feeDiscount: feeNum,
      channel,
      paymentMethod: salePayment,
    });

    setQuantity('1');
    setFeeDiscount('0.00');
    setFormError(null);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expenseAmount.replace(',', '.'));
    if (!expenseDesc.trim()) {
      setFormError('Informe a descrição da despesa ou compra.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    onAddExpense({
      date: expenseDate,
      description: expenseDesc,
      expenseCategory,
      amount: amountNum,
      paymentMethod: expensePayment,
    });

    setExpenseDesc('');
    setExpenseAmount('');
    setFormError(null);
  };

  const ledgerWithBalance = useMemo(
    () => computeCashflowWithBalance(cashflow, initialCashBalance),
    [cashflow, initialCashBalance]
  );

  const filteredLedger = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ledgerWithBalance
      .filter((entry) => {
        if (typeFilter !== 'todos' && entry.type !== typeFilter) return false;
        if (!q) return true;
        return (
          entry.description.toLowerCase().includes(q) ||
          (entry.customerName ?? '').toLowerCase().includes(q) ||
          (entry.productName ?? '').toLowerCase().includes(q) ||
          (entry.channel ?? '').toLowerCase().includes(q) ||
          (entry.expenseCategory ?? '').toLowerCase().includes(q)
        );
      })
      .reverse(); // Most recent at top, while keeping exact chronological runningBalance
  }, [ledgerWithBalance, searchQuery, typeFilter]);

  const dailyClosing = useMemo(
    () => computeDailyClosingSummary(cashflow, closingDate),
    [cashflow, closingDate]
  );

  const openClosingModal = () => {
    setClosingDate(getTodayISO());
    setCopiedNotice(false);
    setExportedNotice(false);
    setClosingModalOpen(true);
  };

  const handleExportClosingJson = () => {
    const payload = buildDailyClosingExportPayload(dailyClosing);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `aurora-acai-fechamento-${closingDate}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setExportedNotice(true);
    window.setTimeout(() => setExportedNotice(false), 3500);
  };

  const handleCopyWhatsApp = async () => {
    const text = formatDailyClosingWhatsAppText(dailyClosing);
    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        copied = document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }

    if (copied) {
      setCopiedNotice(true);
      window.setTimeout(() => setCopiedNotice(false), 3500);
    }
  };

  return (
    <div
      className="aurora-page-bg space-y-6"
      style={{ backgroundColor: 'var(--aurora-page-bg)' }}
    >
      {/* Top Action Strip: Daily Cash Closing */}
      <section className="aurora-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 shadow-sm shadow-purple-950/5">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Controle de Caixa &amp; Fechamento Diário
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Lance vendas e despesas abaixo ou gere o resumo consolidado do dia para o WhatsApp
          </p>
        </div>

        <button
          type="button"
          onClick={openClosingModal}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-[#2E0B2F] shadow-xs transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-600"
        >
          <Calculator className="h-4 w-4 shrink-0" />
          <span>📊 Fechar Caixa do Dia</span>
        </button>
      </section>

      {/* Quick Entry Panel */}
      <section className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5">
        <div className="aurora-divider flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Lançamento Rápido no Caixa
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Vendas preenchem preço automático, calculam CMV/lucro e baixam o estoque na hora
            </p>
          </div>

          <div className="aurora-pill-group flex items-center gap-1 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setEntryMode('entrada');
                setFormError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                entryMode === 'entrada'
                  ? 'bg-[#4A154B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              <span>Entrada (Venda)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('saida');
                setFormError(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                entryMode === 'saida'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownCircle className="h-3.5 w-3.5" />
              <span>Saída (Despesa)</span>
            </button>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
          >
            {formError}
          </div>
        )}

        {entryMode === 'entrada' ? (
          <form onSubmit={handleSaleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="sale-customer"
                  className="block text-xs font-medium text-slate-700"
                >
                  Cliente
                </label>
                <select
                  id="sale-customer"
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="sale-product"
                  className="block text-xs font-medium text-slate-700"
                >
                  Tipo de Açaí
                </label>
                <select
                  id="sale-product"
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatBRL(p.practicedPrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sale-qty"
                  className="block text-xs font-medium text-slate-700"
                >
                  Quantidade (un)
                </label>
                <input
                  id="sale-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sale-unit-price"
                  className="block text-xs font-medium text-slate-700"
                >
                  Preço Unitário (R$)
                </label>
                <input
                  id="sale-unit-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sale-fee"
                  className="block text-xs font-medium text-slate-700"
                >
                  Taxas / Desconto (R$)
                </label>
                <input
                  id="sale-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={feeDiscount}
                  onChange={(e) => setFeeDiscount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sale-channel"
                  className="block text-xs font-medium text-slate-700"
                >
                  Canal de Venda
                </label>
                <select
                  id="sale-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as SalesChannel)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                >
                  {SALES_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sale-payment"
                  className="block text-xs font-medium text-slate-700"
                >
                  Forma de Pagamento
                </label>
                <select
                  id="sale-payment"
                  value={salePayment}
                  onChange={(e) => setSalePayment(e.target.value as PaymentMethod)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!stockValidation.isValid && (
              <div
                role="alert"
                data-testid="stock-shortage-alert"
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900 shadow-xs"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <div className="space-y-1.5">
                    <p className="font-bold text-rose-800">
                      Venda bloqueada: Estoque insuficiente para produzir{' '}
                      {quantity}x {selectedProduct?.name}
                    </p>
                    <ul className="space-y-1">
                      {stockValidation.shortages.map((item) => (
                        <li key={item.ingredientId} className="leading-relaxed">
                          Atenção: Estoque insuficiente de{' '}
                          <strong>{item.ingredientName}</strong>! Necessário:{' '}
                          <strong className="font-mono tabular-nums">
                            {formatQuantity(item.requiredQuantity, item.unit)}
                          </strong>
                          , Disponível:{' '}
                          <strong className="font-mono tabular-nums">
                            {formatQuantity(item.availableQuantity, item.unit)}
                          </strong>{' '}
                          <span className="text-rose-700">
                            (Faltam {formatQuantity(item.missingQuantity, item.unit)})
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] font-medium text-rose-700">
                      Reponha o(s) insumo(s) na aba Controle de Estoque ou reduza a quantidade para concluir a venda.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#4A154B]/15 bg-[#F3E8F4]/60 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-600">Valor Bruto: </span>
                  <strong className="font-mono text-slate-900 tabular-nums">
                    {formatBRL(salePreview.grossAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600">Valor Líquido: </span>
                  <strong className="font-mono text-[#4A154B] tabular-nums">
                    {formatBRL(salePreview.netAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600">CMV Total: </span>
                  <strong className="font-mono text-amber-700 tabular-nums">
                    {formatBRL(salePreview.totalCmv)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600">Lucro da Venda: </span>
                  <strong
                    className={`font-mono tabular-nums ${
                      salePreview.saleProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatBRL(salePreview.saleProfit)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="sale-date" className="sr-only">
                  Data da venda
                </label>
                <input
                  id="sale-date"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-800 focus:border-[#4A154B] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!stockValidation.isValid}
                  aria-disabled={!stockValidation.isValid}
                  title={
                    !stockValidation.isValid
                      ? 'Reposição de estoque necessária antes de registrar esta venda'
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold shadow-xs transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-600 ${
                    stockValidation.isValid
                      ? 'bg-amber-500 text-[#2E0B2F] hover:bg-amber-400'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Registrar Venda</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2">
                <label
                  htmlFor="exp-desc"
                  className="block text-xs font-medium text-slate-700"
                >
                  Descrição da Saída
                </label>
                <input
                  id="exp-desc"
                  type="text"
                  placeholder="Ex: Compra de Morango e Leite Condensado"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="exp-cat"
                  className="block text-xs font-medium text-slate-700"
                >
                  Categoria
                </label>
                <select
                  id="exp-cat"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="exp-amount"
                  className="block text-xs font-medium text-slate-700"
                >
                  Valor (R$)
                </label>
                <input
                  id="exp-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-[#4A154B] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="exp-payment"
                  className="block text-xs font-medium text-slate-700"
                >
                  Forma de Pagamento
                </label>
                <select
                  id="exp-payment"
                  value={expensePayment}
                  onChange={(e) => setExpensePayment(e.target.value as PaymentMethod)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <label htmlFor="exp-date" className="sr-only">
                Data da despesa
              </label>
              <input
                id="exp-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-800 focus:border-[#4A154B] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-rose-600"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar Despesa</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Historical Ledger Table */}
      <section className="aurora-card rounded-xl border shadow-sm shadow-purple-950/5">
        <div className="aurora-divider flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Histórico de Movimentações
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Saldo Inicial de Caixa: <span className="font-mono font-semibold">{formatBRL(initialCashBalance)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Buscar movimentações no fluxo de caixa"
                placeholder="Buscar cliente, produto ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="aurora-input w-64 rounded-lg border py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#4A154B] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="aurora-pill-group flex items-center gap-1 rounded-lg p-1">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'entrada', label: 'Vendas' },
                  { id: 'saida', label: 'Despesas' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    typeFilter === tab.id
                      ? 'aurora-pill-active font-semibold shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="aurora-table-head border-b text-slate-600">
                <th className="px-3 py-3 font-semibold">Data</th>
                <th className="px-2.5 py-3 font-semibold">Tipo</th>
                <th className="px-2.5 py-3 font-semibold">Descrição / Pedido</th>
                <th className="px-2.5 py-3 font-semibold">Canal / Cat.</th>
                <th className="px-2.5 py-3 font-semibold">Pgto</th>
                <th className="px-2.5 py-3 text-right font-semibold">Bruto / Taxa</th>
                <th className="px-2.5 py-3 text-right font-semibold">Valor Líquido</th>
                <th className="px-2.5 py-3 text-right font-semibold">CMV</th>
                <th className="px-2.5 py-3 text-right font-semibold">Lucro</th>
                <th className="px-2.5 py-3 text-right font-semibold">Saldo Acum.</th>
                <th className="px-3 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma movimentação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => {
                  const isSale = entry.type === 'entrada';
                  return (
                    <tr key={entry.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDateBR(entry.date)}
                      </td>
                      <td className="px-2.5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                            isSale
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSale ? 'Venda' : 'Despesa'}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-slate-900 font-medium max-w-[220px]">
                        <span className="block truncate" title={entry.description}>
                          {entry.description}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-slate-600 whitespace-nowrap">
                        {isSale ? entry.channel : entry.expenseCategory}
                      </td>
                      <td className="px-2.5 py-3 text-slate-600 whitespace-nowrap">
                        {entry.paymentMethod}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {isSale ? (
                          <div>
                            <span className="text-slate-700">
                              {formatBRL(entry.grossAmount ?? entry.amount)}
                            </span>
                            {(entry.feeDiscount ?? 0) > 0 && (
                              <span className="block text-[10px] text-rose-600">
                                Taxa -{formatBRL(entry.feeDiscount ?? 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td
                        className={`px-2.5 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                          isSale ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isSale ? `+${formatBRL(entry.amount)}` : `-${formatBRL(entry.amount)}`}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono text-amber-700 tabular-nums whitespace-nowrap">
                        {isSale ? formatBRL(entry.totalCmv ?? 0) : '-'}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {isSale ? formatBRL(entry.saleProfit ?? 0) : '-'}
                      </td>
                      <td className="px-2.5 py-3 text-right font-mono font-semibold text-[#4A154B] tabular-nums whitespace-nowrap">
                        {formatBRL(entry.runningBalance)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          aria-label={`Excluir lançamento ${entry.description}`}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Fechamento de Caixa Diário */}
      {closingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-closing-title"
        >
          <div className="aurora-card flex max-h-[92vh] w-full max-w-xl flex-col rounded-xl border shadow-xl">
            <div className="aurora-divider flex items-start justify-between gap-3 border-b px-6 py-4">
              <div>
                <h2
                  id="daily-closing-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  📊 Fechamento de Caixa Diário
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Resumo financeiro exclusivo das movimentações da data selecionada
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClosingModalOpen(false)}
                aria-label="Fechar fechamento de caixa"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {/* Date selector & count */}
              <div className="aurora-pill-group flex flex-wrap items-center justify-between gap-3 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <span>📅 Data do Fechamento:</span>
                  <strong className="font-mono text-[#4A154B]">
                    {formatDateBR(closingDate)}
                  </strong>
                  <span className="text-slate-500">
                    ({dailyClosing.ordersCount} venda(s) · {dailyClosing.expensesCount} saída(s))
                  </span>
                </div>
                <input
                  type="date"
                  aria-label="Selecionar data do fechamento"
                  value={closingDate}
                  onChange={(e) => {
                    setClosingDate(e.target.value);
                    setCopiedNotice(false);
                  }}
                  className="aurora-input rounded-lg border px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-[#4A154B] focus:outline-none"
                />
              </div>

              {/* Financial Summary Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="aurora-input rounded-lg border p-3.5">
                  <p className="text-xs font-medium text-slate-600">
                    💰 Faturamento Bruto &amp; Líquido
                  </p>
                  <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                    {formatBRL(dailyClosing.grossRevenue)}{' '}
                    <span className="text-xs font-normal text-slate-500">bruto</span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    Líquido: {formatBRL(dailyClosing.netRevenue)}
                    {dailyClosing.totalFees > 0
                      ? ` (Taxas -${formatBRL(dailyClosing.totalFees)})`
                      : ''}
                  </p>
                </div>

                <div className="aurora-input rounded-lg border p-3.5">
                  <p className="text-xs font-medium text-slate-600">
                    📦 Total de Copos / Produtos Vendidos
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#4A154B] tabular-nums">
                    {dailyClosing.totalCupsSold} un
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Em {dailyClosing.ordersCount} pedido(s) registrado(s)
                  </p>
                </div>

                <div className="aurora-input rounded-lg border p-3.5">
                  <p className="text-xs font-medium text-slate-600">
                    🛒 CMV Total dos Produtos Vendidos
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-amber-700 tabular-nums">
                    {formatBRL(dailyClosing.totalCmv)}
                  </p>
                </div>

                <div className="aurora-input rounded-lg border p-3.5">
                  <p className="text-xs font-medium text-slate-600">
                    📉 Total de Saídas / Despesas do Dia
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-rose-700 tabular-nums">
                    {formatBRL(dailyClosing.totalExpenses)}
                  </p>
                </div>
              </div>

              {/* Net Profit Highlight */}
              <div
                className={`rounded-xl border p-4 ${
                  dailyClosing.dailyNetProfit >= 0
                    ? 'border-emerald-300 bg-emerald-50/80'
                    : 'border-rose-300 bg-rose-50/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      💵 Lucro Líquido do Dia
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Faturamento Líquido − CMV − Despesas
                    </p>
                  </div>
                  <p
                    className={`font-mono text-2xl font-extrabold tabular-nums ${
                      dailyClosing.dailyNetProfit >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {formatBRL(dailyClosing.dailyNetProfit)}
                  </p>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="aurora-input rounded-lg border p-4">
                <p className="text-xs font-bold text-slate-800">
                  💳 Resumo por Forma de Pagamento (Entradas Líquidas)
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                  <div className="rounded-md bg-purple-50/70 px-3 py-2">
                    <span className="text-slate-600">Pix</span>
                    <p className="mt-0.5 font-mono font-bold text-[#4A154B] tabular-nums">
                      {formatBRL(dailyClosing.paymentBreakdown.pix)}
                    </p>
                  </div>
                  <div className="rounded-md bg-purple-50/70 px-3 py-2">
                    <span className="text-slate-600">Cartão (Créd./Déb.)</span>
                    <p className="mt-0.5 font-mono font-bold text-[#4A154B] tabular-nums">
                      {formatBRL(dailyClosing.paymentBreakdown.cartao)}
                    </p>
                  </div>
                  <div className="rounded-md bg-purple-50/70 px-3 py-2">
                    <span className="text-slate-600">Dinheiro</span>
                    <p className="mt-0.5 font-mono font-bold text-[#4A154B] tabular-nums">
                      {formatBRL(dailyClosing.paymentBreakdown.dinheiro)}
                    </p>
                  </div>
                </div>
                {dailyClosing.paymentBreakdown.ifoodOnline > 0 && (
                  <p className="mt-2 text-[11px] text-slate-600 font-mono tabular-nums">
                    iFood Online: <strong>{formatBRL(dailyClosing.paymentBreakdown.ifoodOnline)}</strong>
                  </p>
                )}
              </div>

              {copiedNotice && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800"
                >
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Copiado com sucesso!</span>
                </div>
              )}

              {exportedNotice && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3.5 py-2.5 text-xs font-semibold text-[#4A154B]"
                >
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Fechamento de {formatDateBR(closingDate)} exportado em JSON!</span>
                </div>
              )}
            </div>

            <div className="aurora-divider flex flex-wrap items-center justify-end gap-2.5 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => setClosingModalOpen(false)}
                className="aurora-input rounded-lg border px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-black/5"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleExportClosingJson}
                className="inline-flex items-center gap-2 rounded-lg border border-[#4A154B]/25 bg-purple-50 px-4 py-2 text-xs font-bold text-[#4A154B] shadow-xs transition-colors hover:bg-[#4A154B] hover:text-white focus-visible:outline-2 focus-visible:outline-[#4A154B]"
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>📥 Exportar Fechamento (JSON)</span>
              </button>
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                {copiedNotice ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0" />
                )}
                <span>📱 Copiar Relatório para o WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
