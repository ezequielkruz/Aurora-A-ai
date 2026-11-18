import { Check, ChevronDown, Download, Menu, Palette, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TabId } from '../types/aurora';
import { AURORA_THEMES, type AuroraThemeId, getThemeById } from '../utils/themes';

interface HeaderProps {
  activeTab: TabId;
  themeId: AuroraThemeId;
  onSelectTheme: (themeId: AuroraThemeId) => void;
  onOpenMobileMenu: () => void;
  onExportBackup: () => void;
  onImportBackupFile: (file: File) => void;
  onRequestReset: () => void;
}

const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Geral',
    subtitle: 'Indicadores financeiros, vendas por produto e desempenho por canal',
  },
  cashflow: {
    title: 'Fluxo de Caixa & Vendas',
    subtitle: 'Lançamento rápido de vendas e despesas com cálculo automático de CMV e saldo',
  },
  inventory: {
    title: 'Controle de Estoque',
    subtitle: 'Baixa automática por ficha técnica e registro manual de compras',
  },
  customers: {
    title: 'Cadastro de Clientes',
    subtitle: 'Histórico de pedidos, faturamento por cliente e canais preferidos',
  },
  menu: {
    title: 'Cardápio & Fichas Técnicas',
    subtitle: 'Composição de insumos, CMV com 5% de perda e gestão de preços praticados',
  },
};

export function Header({
  activeTab,
  themeId,
  onSelectTheme,
  onOpenMobileMenu,
  onExportBackup,
  onImportBackupFile,
  onRequestReset,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const meta = TAB_TITLES[activeTab];
  const currentTheme = getThemeById(themeId);

  useEffect(() => {
    if (!themeMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [themeMenuOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackupFile(file);
    }
    e.target.value = '';
  };

  return (
    <header className="aurora-header border-b backdrop-blur-xs sm:sticky sm:top-0 sm:z-30">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menu lateral"
            className="aurora-header-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border lg:hidden focus-visible:outline-2 focus-visible:outline-[#4A154B]"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1
              className="font-display text-lg font-bold tracking-tight sm:text-xl truncate"
              style={{ color: 'var(--aurora-header-title)' }}
            >
              {meta.title}
            </h1>
            <p
              className="hidden text-xs sm:block truncate"
              style={{ color: 'var(--aurora-header-subtitle)' }}
            >
              {meta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {/* Theme Palette Selector */}
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setThemeMenuOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={themeMenuOpen}
              aria-label="Seletor de tema de cores"
              className="aurora-header-btn inline-flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:px-3 focus-visible:outline-2 focus-visible:outline-[#4A154B]"
            >
              <Palette className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                style={{ backgroundColor: currentTheme.swatches.page }}
                aria-hidden="true"
              />
              <span>Tema: {currentTheme.shortName}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  themeMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {themeMenuOpen && (
              <div
                role="listbox"
                aria-label="Paletas de cores Aurora Açaí"
                className="aurora-card absolute left-0 z-50 mt-2 w-72 rounded-xl border p-1.5 shadow-xl"
              >
                <div className="px-2.5 py-1.5 border-b border-slate-100">
                  <p className="font-display text-xs font-bold text-slate-900">
                    Paleta do Aurora Açaí
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Escolha o estilo visual salvo automaticamente
                  </p>
                </div>

                <div className="mt-1 space-y-1">
                  {AURORA_THEMES.map((theme) => {
                    const isSelected = theme.id === themeId;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onSelectTheme(theme.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-purple-50 text-[#4A154B]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex shrink-0 items-center -space-x-1">
                            <span
                              className="h-4 w-4 rounded-full border border-black/15 shadow-2xs"
                              style={{ backgroundColor: theme.swatches.sidebar }}
                              title="Barra lateral"
                            />
                            <span
                              className="h-4 w-4 rounded-full border border-black/15 shadow-2xs"
                              style={{ backgroundColor: theme.swatches.page }}
                              title="Fundo"
                            />
                            <span
                              className="h-4 w-4 rounded-full border border-black/15 shadow-2xs"
                              style={{ backgroundColor: theme.swatches.card }}
                              title="Cards"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{theme.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {theme.description}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-[#4A154B]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onExportBackup}
            className="aurora-header-btn inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:px-3 focus-visible:outline-2 focus-visible:outline-[#4A154B]"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Exportar Backup (JSON)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Selecionar arquivo JSON de backup"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aurora-header-btn inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:px-3 focus-visible:outline-2 focus-visible:outline-[#4A154B]"
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>Importar Backup (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onRequestReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 whitespace-nowrap shrink-0 sm:px-3 focus-visible:outline-2 focus-visible:outline-rose-600"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Resetar Dados Padrão</span>
          </button>
        </div>
      </div>
    </header>
  );
}
