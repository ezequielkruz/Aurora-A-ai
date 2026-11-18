import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  CupSoda,
  DollarSign,
  LineChart as LineChartIcon,
  Package,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DailyFinancialPoint,
  DashboardMetrics,
  IngredientStockSummary,
  SalesChannel,
  TabId,
} from '../types/aurora';
import { formatBRL, formatDateBR, formatQuantity } from '../utils/auroraLogic';

interface DashboardTabProps {
  metrics: DashboardMetrics;
  inventorySummaries: IngredientStockSummary[];
  initialCashBalance: number;
  onNavigateTab: (tab: TabId) => void;
}

const CHANNEL_COLORS: Record<SalesChannel, string> = {
  WhatsApp: '#16A34A',
  iFood: '#EA580C',
  Balcão: '#4A154B',
  Instagram: '#D97706',
};

export function DashboardTab({
  metrics,
  inventorySummaries,
  initialCashBalance,
  onNavigateTab,
}: DashboardTabProps) {
  const [showOnlyActiveProducts, setShowOnlyActiveProducts] = useState(false);
  const [evolutionChartMode, setEvolutionChartMode] = useState<'bar' | 'line'>('bar');
  const [evolutionWindow, setEvolutionWindow] = useState<7 | 14 | 30>(14);

  const alertIngredients = inventorySummaries.filter(
    (item) => item.status !== 'OK' || item.expirationStatus !== 'NO PRAZO'
  );

  const productList = showOnlyActiveProducts
    ? metrics.salesByProduct.filter((p) => p.cupsSold > 0)
    : metrics.salesByProduct;

  const maxProductValue = Math.max(
    1,
    ...productList.map((p) => Math.max(p.grossRevenue, p.profit))
  );

  const totalChannelRevenue = Math.max(
    1,
    metrics.salesByChannel.reduce((sum, c) => sum + c.grossRevenue, 0)
  );

  const visibleEvolution = useMemo(
    () => metrics.dailyEvolution.slice(-evolutionWindow),
    [metrics.dailyEvolution, evolutionWindow]
  );

  const evolutionSummary = useMemo(() => {
    const totalRevenue = visibleEvolution.reduce((s, d) => s + d.grossRevenue, 0);
    const totalProfit = visibleEvolution.reduce((s, d) => s + d.dailyNetProfit, 0);
    const totalCups = visibleEvolution.reduce((s, d) => s + d.cupsSold, 0);
    const bestRevenueDay = visibleEvolution.reduce<DailyFinancialPoint | null>(
      (best, d) => (!best || d.grossRevenue > best.grossRevenue ? d : best),
      null
    );
    return { totalRevenue, totalProfit, totalCups, bestRevenueDay };
  }, [visibleEvolution]);

  const kpis = [
    {
      label: 'Faturamento Bruto',
      value: formatBRL(metrics.grossRevenue),
      detail: `Líquido: ${formatBRL(metrics.netRevenue)} · Taxas: ${formatBRL(metrics.totalFees)}`,
      icon: ArrowUpRight,
      tone: 'text-[#4A154B] bg-[#F3E8F4]',
    },
    {
      label: 'CMV Total',
      value: formatBRL(metrics.totalCmv),
      detail: 'Custo dos copos vendidos (incl. 5% perda)',
      icon: Package,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Despesas',
      value: formatBRL(metrics.totalExpenses),
      detail: 'Saídas operacionais e compras registradas',
      icon: ArrowDownRight,
      tone: 'text-rose-700 bg-rose-50',
    },
    {
      label: 'Lucro Líquido Operacional',
      value: formatBRL(metrics.operationalNetProfit),
      detail: `Margem operacional: ${metrics.profitMarginPercent.toFixed(1).replace('.', ',')}%`,
      icon: TrendingUp,
      tone:
        metrics.operationalNetProfit >= 0
          ? 'text-emerald-700 bg-emerald-50'
          : 'text-rose-700 bg-rose-50',
      valueColor: metrics.operationalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
    {
      label: 'Saldo em Caixa',
      value: formatBRL(metrics.cashBalance),
      detail: `Saldo inicial de ${formatBRL(initialCashBalance)}`,
      icon: Wallet,
      tone: 'text-[#4A154B] bg-[#F3E8F4]',
    },
    {
      label: 'Total de Copos Vendidos',
      value: `${metrics.totalCupsSold} un`,
      detail: 'Soma de unidades vendidas no caixa',
      icon: CupSoda,
      tone: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div
      className="aurora-page-bg space-y-6"
      style={{ backgroundColor: 'var(--aurora-page-bg)' }}
    >
      {/* KPI Grid */}
      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="aurora-card aurora-card-hover rounded-xl border p-5 shadow-sm shadow-purple-950/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                    <p
                      className={`mt-1.5 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
                        kpi.valueColor ?? 'text-slate-900'
                      }`}
                    >
                      {kpi.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kpi.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 tabular-nums">{kpi.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financial Growth / Daily Evolution Chart */}
      <section
        aria-label="Evolução financeira diária"
        data-testid="financial-evolution-section"
        className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5"
      >
        <div className="aurora-divider flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Crescimento &amp; Evolução Financeira Diária
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Evolução diária de Faturamento Bruto vs. Lucro Líquido com base nas movimentações reais do caixa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="aurora-pill-group flex items-center gap-1 rounded-lg p-1">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setEvolutionWindow(days)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    evolutionWindow === days
                      ? 'aurora-pill-active font-semibold shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            <div className="aurora-pill-group flex items-center gap-1 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setEvolutionChartMode('bar')}
                aria-label="Exibir gráfico em barras agrupadas"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  evolutionChartMode === 'bar'
                    ? 'aurora-pill-active font-semibold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Barras</span>
              </button>
              <button
                type="button"
                onClick={() => setEvolutionChartMode('line')}
                aria-label="Exibir gráfico em linhas"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  evolutionChartMode === 'line'
                    ? 'aurora-pill-active font-semibold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                <span>Linhas</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="aurora-input rounded-lg border px-3.5 py-2.5">
            <span className="text-slate-500">Faturamento no Período</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-[#4A154B] tabular-nums">
              {formatBRL(evolutionSummary.totalRevenue)}
            </p>
          </div>
          <div className="aurora-input rounded-lg border px-3.5 py-2.5">
            <span className="text-slate-500">Lucro Líquido Acumulado</span>
            <p
              className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${
                evolutionSummary.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatBRL(evolutionSummary.totalProfit)}
            </p>
          </div>
          <div className="aurora-input rounded-lg border px-3.5 py-2.5">
            <span className="text-slate-500">Melhor Dia em Vendas</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-amber-700 tabular-nums">
              {evolutionSummary.bestRevenueDay
                ? `${evolutionSummary.bestRevenueDay.fullDateLabel} (${formatBRL(
                    evolutionSummary.bestRevenueDay.grossRevenue
                  )})`
                : 'Sem vendas no período'}
            </p>
          </div>
        </div>

        {visibleEvolution.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Nenhuma movimentação registrada ainda para gerar o gráfico de evolução diária.
          </div>
        ) : (
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {evolutionChartMode === 'bar' ? (
                <BarChart
                  data={visibleEvolution}
                  margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9D8EC" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={{ stroke: '#D8C4DF' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `R$ ${v}`}
                  />
                  <ReferenceLine y={0} stroke="#CBD5E1" />
                  <Tooltip
                    formatter={(value, name) => [
                      formatBRL(Number(value ?? 0)),
                      name === 'grossRevenue' ? 'Faturamento Bruto' : 'Lucro Líquido',
                    ]}
                    labelFormatter={(_label, payload) => {
                      const pt = payload?.[0]?.payload as DailyFinancialPoint | undefined;
                      return pt
                        ? `${pt.fullDateLabel} · ${pt.cupsSold} copo(s)`
                        : String(_label ?? '');
                    }}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(74, 21, 75, 0.2)',
                      backgroundColor: '#FFFDF9',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === 'grossRevenue' ? 'Faturamento Bruto' : 'Lucro Líquido'
                    }
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="grossRevenue"
                    name="grossRevenue"
                    fill="#4A154B"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="dailyNetProfit"
                    name="dailyNetProfit"
                    fill="#F59E0B"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={visibleEvolution}
                  margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9D8EC" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={{ stroke: '#D8C4DF' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `R$ ${v}`}
                  />
                  <ReferenceLine y={0} stroke="#CBD5E1" />
                  <Tooltip
                    formatter={(value, name) => [
                      formatBRL(Number(value ?? 0)),
                      name === 'grossRevenue' ? 'Faturamento Bruto' : 'Lucro Líquido',
                    ]}
                    labelFormatter={(_label, payload) => {
                      const pt = payload?.[0]?.payload as DailyFinancialPoint | undefined;
                      return pt
                        ? `${pt.fullDateLabel} · ${pt.cupsSold} copo(s)`
                        : String(_label ?? '');
                    }}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(74, 21, 75, 0.2)',
                      backgroundColor: '#FFFDF9',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === 'grossRevenue' ? 'Faturamento Bruto' : 'Lucro Líquido'
                    }
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="grossRevenue"
                    name="grossRevenue"
                    stroke="#4A154B"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#4A154B' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="dailyNetProfit"
                    name="dailyNetProfit"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#F59E0B' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label="Gráficos comparativos">
        {/* Chart 1: Faturamento x Lucro por Tipo de Açaí */}
        <div className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5 lg:col-span-7">
          <div className="aurora-divider flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Faturamento x Lucro por Tipo de Açaí
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Comparação entre faturamento bruto e lucro após taxas e CMV
              </p>
            </div>

            <div className="aurora-pill-group flex items-center gap-1 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setShowOnlyActiveProducts(false)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  !showOnlyActiveProducts
                    ? 'aurora-pill-active font-semibold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Todos ({metrics.salesByProduct.length})
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyActiveProducts(true)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  showOnlyActiveProducts
                    ? 'aurora-pill-active font-semibold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Com Vendas
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-gradient-to-r from-[#4A154B] to-purple-900" />
              Faturamento Bruto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
              Lucro da Venda
            </span>
          </div>

          {productList.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Nenhuma venda registrada ainda para os produtos filtrados.
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {productList.map((item) => {
                const revenueWidth =
                  item.grossRevenue > 0
                    ? Math.max(4, Math.round((item.grossRevenue / maxProductValue) * 100))
                    : 0;
                const profitWidth =
                  item.profit > 0
                    ? Math.max(4, Math.round((item.profit / maxProductValue) * 100))
                    : 0;

                return (
                  <div key={item.productId} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 truncate">
                        {item.productName}{' '}
                        <span className="text-slate-400 font-normal">
                          · {item.cupsSold} un
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-slate-700 tabular-nums">
                        {formatBRL(item.grossRevenue)}{' '}
                        <span className="text-slate-400">/</span>{' '}
                        <span className="font-semibold text-amber-600">
                          {formatBRL(item.profit)}
                        </span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-purple-50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#4A154B] to-purple-900 transition-all duration-300"
                          style={{ width: `${revenueWidth}%` }}
                          title={`Faturamento: ${formatBRL(item.grossRevenue)}`}
                        />
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                          style={{ width: `${profitWidth}%` }}
                          title={`Lucro: ${formatBRL(item.profit)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Vendas por Canal */}
        <div className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5 lg:col-span-5 flex flex-col">
          <div className="aurora-divider border-b pb-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Vendas por Canal
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Distribuição de pedidos e faturamento bruto entre canais
            </p>
          </div>

          {/* Segmented Horizontal Distribution Bar */}
          <div className="mt-5">
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-purple-50">
              {metrics.salesByChannel.map((ch) => {
                const pct =
                  metrics.grossRevenue > 0 ? (ch.grossRevenue / totalChannelRevenue) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={ch.channel}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: CHANNEL_COLORS[ch.channel],
                    }}
                    title={`${ch.channel}: ${formatBRL(ch.grossRevenue)} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
          </div>

          {/* Channel Breakdown Rows */}
          <div className="mt-5 flex-1 divide-y divide-purple-50">
            {metrics.salesByChannel.map((ch) => {
              const pct =
                metrics.grossRevenue > 0
                  ? (ch.grossRevenue / totalChannelRevenue) * 100
                  : 0;
              return (
                <div
                  key={ch.channel}
                  className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-xs"
                      style={{ backgroundColor: CHANNEL_COLORS[ch.channel] }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{ch.channel}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {ch.orders} pedido(s) · {ch.cupsSold} copo(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatBRL(ch.grossRevenue)}
                    </p>
                    <p className="font-mono text-xs text-slate-500 tabular-nums">
                      {pct.toFixed(1).replace('.', ',')}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-purple-100/80 pt-3.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-600" />
              Ticket Médio por Copo
            </span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {metrics.totalCupsSold > 0
                ? formatBRL(metrics.grossRevenue / metrics.totalCupsSold)
                : formatBRL(0)}
            </span>
          </div>
        </div>
      </section>

      {/* Stock & Expiration Alert Strip */}
      <section className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`h-4 w-4 ${
                alertIngredients.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
            <h2 className="font-display text-sm font-bold text-slate-900">
              Monitoramento de Estoque &amp; Validades
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('inventory')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline whitespace-nowrap"
          >
            Abrir Controle de Estoque
          </button>
        </div>

        {alertIngredients.length === 0 ? (
          <p className="mt-2.5 text-sm text-slate-600">
            Todos os {inventorySummaries.length} insumos e embalagens estão com saldo acima do mínimo e validade em dia.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {alertIngredients.map((item) => {
              const isExpiredOrToday =
                item.expirationStatus === 'VENCIDO' || item.expirationStatus === 'VENCE HOJE';
              const isExpiringSoon = item.expirationStatus === 'VENCE EM BREVE';
              return (
                <div
                  key={item.ingredient.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-purple-200/60 bg-purple-50/40 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.ingredient.name}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Saldo: {formatQuantity(item.currentBalance, item.ingredient.unit)} · Val:{' '}
                      {formatDateBR(item.activeExpirationDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {item.status !== 'OK' && (
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          item.status === 'CRÍTICO'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                    {item.expirationStatus !== 'NO PRAZO' && (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                          isExpiredOrToday
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isExpiringSoon
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        {item.expirationLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
