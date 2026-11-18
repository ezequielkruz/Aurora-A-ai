import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CashflowTab } from './components/CashflowTab';
import { CustomersTab } from './components/CustomersTab';
import { DashboardTab } from './components/DashboardTab';
import { Header } from './components/Header';
import { InventoryTab } from './components/InventoryTab';
import { MenuTab } from './components/MenuTab';
import { Sidebar } from './components/Sidebar';
import { useAuroraStore } from './hooks/useAuroraStore';
import type { TabId } from './types/aurora';
import {
  computeCustomerStats,
  computeDashboardMetrics,
  computeInventorySummaries,
} from './utils/auroraLogic';
import {
  applyAuroraTheme,
  type AuroraThemeId,
  loadSavedThemeId,
  saveThemeId,
} from './utils/themes';

export default function App() {
  const {
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
  } = useAuroraStore();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [themeId, setThemeId] = useState<AuroraThemeId>(() => loadSavedThemeId());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    applyAuroraTheme(themeId);
    saveThemeId(themeId);
  }, [themeId]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const metrics = useMemo(() => computeDashboardMetrics(state), [state]);

  const inventorySummaries = useMemo(
    () =>
      computeInventorySummaries(
        state.ingredients,
        state.products,
        state.cashflow,
        state.stockAdditions
      ),
    [state.ingredients, state.products, state.cashflow, state.stockAdditions]
  );

  const customerStats = useMemo(
    () => computeCustomerStats(state.customers, state.cashflow),
    [state.customers, state.cashflow]
  );

  const alertStockCount = useMemo(
    () =>
      inventorySummaries.filter(
        (item) => item.status !== 'OK' || item.expirationStatus !== 'NO PRAZO'
      ).length,
    [inventorySummaries]
  );

  const handleExportBackup = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `aurora-acai-backup-${dateStamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      message: 'Backup JSON exportado com sucesso.',
    });
  };

  const handleImportBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const res = importBackup(content);
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: 'Backup JSON importado e restaurado com sucesso.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error ?? 'Erro ao importar arquivo JSON.',
        });
      }
    };
    reader.onerror = () => {
      setFeedback({
        type: 'error',
        message: 'Falha ao ler o arquivo selecionado.',
      });
    };
    reader.readAsText(file);
  };

  const handleRequestReset = () => {
    const confirmed = window.confirm(
      'Atenção! Isso apagará todos os seus dados de vendas, estoque e clientes, retornando ao padrão inicial. Deseja realmente continuar?'
    );
    if (!confirmed) return;
    resetToDefault();
    setFeedback({
      type: 'success',
      message: 'Dados padrão do Aurora Açaí restaurados com sucesso.',
    });
  };

  return (
    <div
      className="aurora-page-bg flex min-h-screen text-slate-900"
      style={{ backgroundColor: 'var(--aurora-page-bg)', minHeight: '100vh' }}
    >
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertStockCount={alertStockCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div
        className="aurora-page-bg flex min-w-0 flex-1 flex-col"
        style={{ backgroundColor: 'var(--aurora-page-bg)', minHeight: '100vh' }}
      >
        <Header
          activeTab={activeTab}
          themeId={themeId}
          onSelectTheme={setThemeId}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onExportBackup={handleExportBackup}
          onImportBackupFile={handleImportBackupFile}
          onRequestReset={handleRequestReset}
        />

        <main
          className="aurora-page-bg mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8"
          style={{ backgroundColor: 'var(--aurora-page-bg)' }}
        >
          {feedback && (
            <div
              role="status"
              className={`mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardTab
              metrics={metrics}
              inventorySummaries={inventorySummaries}
              initialCashBalance={state.initialCashBalance}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashflowTab
              cashflow={state.cashflow}
              initialCashBalance={state.initialCashBalance}
              wasteRate={state.wasteRate}
              ingredients={state.ingredients}
              inventorySummaries={inventorySummaries}
              products={state.products}
              customers={state.customers}
              onAddSale={addSale}
              onAddExpense={addExpense}
              onDeleteEntry={deleteCashflowEntry}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              summaries={inventorySummaries}
              stockAdditions={state.stockAdditions}
              onAddIngredient={(input) => {
                addIngredient(input);
                setFeedback({
                  type: 'success',
                  message: `Insumo "${input.name.trim()}" cadastrado no estoque.`,
                });
              }}
              onDeleteIngredient={(id, name) => {
                deleteIngredient(id);
                setFeedback({
                  type: 'success',
                  message: `Insumo "${name}" removido do estoque.`,
                });
              }}
              onAddStockAddition={(input) => {
                addStockAddition(input);
                setFeedback({
                  type: 'success',
                  message: 'Entrada registrada com custo médio e validade atualizados.',
                });
              }}
              onDeleteStockAddition={deleteStockAddition}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersTab
              customerStats={customerStats}
              onAddCustomer={addCustomer}
              onUpdateCustomer={updateCustomer}
              onDeleteCustomer={deleteCustomer}
            />
          )}

          {activeTab === 'menu' && (
            <MenuTab
              products={state.products}
              ingredients={state.ingredients}
              wasteRate={state.wasteRate}
              onAddProduct={(input) => {
                addProduct(input);
                setFeedback({
                  type: 'success',
                  message: `Copo "${input.name.trim()}" adicionado ao cardápio com sucesso.`,
                });
              }}
              onDeleteProduct={(productId, productName) => {
                deleteProduct(productId);
                setFeedback({
                  type: 'success',
                  message: `Copo "${productName}" removido do cardápio.`,
                });
              }}
              onUpdateProductPrice={updateProductPrice}
            />
          )}
        </main>
      </div>
    </div>
  );
}
