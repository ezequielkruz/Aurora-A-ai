import {
  BookOpen,
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { TabId } from '../types/aurora';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  alertStockCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
  { id: 'cashflow', label: 'Fluxo de Caixa & Vendas', icon: Receipt },
  { id: 'inventory', label: 'Controle de Estoque', icon: Package },
  { id: 'customers', label: 'Cadastro de Clientes', icon: Users },
  { id: 'menu', label: 'Cardápio & Fichas Técnicas', icon: BookOpen },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  alertStockCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [imgError, setImgError] = useState(false);

  const handleNav = (id: TabId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`aurora-sidebar fixed inset-y-0 left-0 z-50 w-[268px] shrink-0 text-white transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu principal"
      >
        <div className="flex h-full flex-col lg:sticky lg:top-0 lg:h-screen">
        {/* Top Brand & Logo Block */}
        <div className="flex flex-col border-b border-white/10 p-4">
          <div className="flex items-center justify-between lg:hidden mb-2">
            <span className="text-xs font-medium text-[#F3E8F4]/80">Navegação</span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar menu lateral"
              className="rounded-lg p-1.5 text-[#F3E8F4] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="aurora-sidebar-card overflow-hidden rounded-xl border border-amber-400/25">
            {!imgError ? (
              <div className="aurora-sidebar-card">
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src="/assets/aistudio/Gemini_Generated_Image_kaltqukaltqukalt_591c32ae.jpg"
                    alt="Logotipo Aurora Açaí — Sabor e Energia"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover object-[66%_64%]"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
                  <div>
                    <p className="font-display text-sm font-bold leading-tight text-white">
                      Aurora Açaí
                    </p>
                    <p className="text-[11px] font-medium text-amber-300">
                      Gestão de Delivery
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[#4A154B] font-display text-lg font-extrabold">
                  AA
                </div>
                <div>
                  <p className="font-display text-base font-bold text-white">Aurora Açaí</p>
                  <p className="text-xs text-amber-300">Gestão de Delivery</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isActive
                    ? 'aurora-sidebar-nav-active font-semibold shadow-xs'
                    : 'text-[#F3E8F4]/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-amber-600' : 'text-amber-300/85 group-hover:text-amber-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'inventory' && alertStockCount > 0 && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-bold tabular-nums ${
                      isActive
                        ? 'bg-amber-500 text-[#2E0B2F]'
                        : 'bg-amber-500 text-[#2E0B2F]'
                    }`}
                    title={`${alertStockCount} alerta(s) de estoque ou validade`}
                  >
                    {alertStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Subtle Operational Summary Footer */}
        <div className="border-t border-white/10 px-4 py-3.5 text-xs text-[#F3E8F4]/75">
          <p className="font-medium text-[#F3E8F4]">Delivery Aurora Açaí</p>
          <p className="mt-0.5 text-[#F3E8F4]/70">Dados salvos localmente no navegador</p>
        </div>
        </div>
      </aside>
    </>
  );
}
