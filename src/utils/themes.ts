export type AuroraThemeId =
  | 'acai-classico'
  | 'uva-profunda'
  | 'roxo-royal'
  | 'castanho-acai';

export interface AuroraTheme {
  id: AuroraThemeId;
  name: string;
  shortName: string;
  description: string;
  swatches: {
    page: string;
    card: string;
    sidebar: string;
  };
  vars: {
    '--aurora-page-bg': string;
    '--aurora-card-bg': string;
    '--aurora-card-border': string;
    '--aurora-card-hover': string;
    '--aurora-divider': string;
    '--aurora-pill-bg': string;
    '--aurora-pill-active-bg': string;
    '--aurora-table-head-bg': string;
    '--aurora-input-bg': string;
    '--aurora-input-border': string;
    '--aurora-sidebar-bg': string;
    '--aurora-sidebar-card': string;
    '--aurora-sidebar-active-bg': string;
    '--aurora-sidebar-active-text': string;
    '--aurora-header-bg': string;
    '--aurora-header-border': string;
    '--aurora-header-title': string;
    '--aurora-header-subtitle': string;
    '--aurora-header-btn-bg': string;
    '--aurora-header-btn-text': string;
    '--aurora-header-btn-border': string;
    '--aurora-header-btn-hover': string;
  };
}

export const THEME_STORAGE_KEY = 'aurora_acai_theme_v1';
export const DEFAULT_THEME_ID: AuroraThemeId = 'acai-classico';

export const AURORA_THEMES: AuroraTheme[] = [
  {
    id: 'acai-classico',
    name: 'Açaí Clássico',
    shortName: 'Açaí Clássico',
    description: 'Lilás suave harmônico com a barra lateral roxa',
    swatches: {
      page: '#D2BCD8',
      card: '#F6EDF8',
      sidebar: '#4A154B',
    },
    vars: {
      '--aurora-page-bg': '#D2BCD8',
      '--aurora-card-bg': '#F6EDF8',
      '--aurora-card-border': '#BA9DC4',
      '--aurora-card-hover': '#9E78AD',
      '--aurora-divider': '#D9C4E1',
      '--aurora-pill-bg': '#E9D9EE',
      '--aurora-pill-active-bg': '#FCF8FD',
      '--aurora-table-head-bg': '#EBDCF0',
      '--aurora-input-bg': '#FCF8FD',
      '--aurora-input-border': '#C8B0D2',
      '--aurora-sidebar-bg': '#4A154B',
      '--aurora-sidebar-card': '#360E37',
      '--aurora-sidebar-active-bg': '#F3E8F4',
      '--aurora-sidebar-active-text': '#4A154B',
      '--aurora-header-bg': 'rgba(237, 224, 242, 0.96)',
      '--aurora-header-border': '#BA9DC4',
      '--aurora-header-title': '#0f172a',
      '--aurora-header-subtitle': '#475569',
      '--aurora-header-btn-bg': '#FAF5FC',
      '--aurora-header-btn-text': '#334155',
      '--aurora-header-btn-border': '#C5ABD0',
      '--aurora-header-btn-hover': '#E7D4EE',
    },
  },
  {
    id: 'uva-profunda',
    name: 'Uva Profunda',
    shortName: 'Uva Profunda',
    description: 'Fundo uva fechado e imersivo com cards lilás suaves',
    swatches: {
      page: '#4E265C',
      card: '#F3EBF6',
      sidebar: '#2D0F38',
    },
    vars: {
      '--aurora-page-bg': '#4E265C',
      '--aurora-card-bg': '#F3EBF6',
      '--aurora-card-border': '#C8AED3',
      '--aurora-card-hover': '#A985BC',
      '--aurora-divider': '#DFCCE8',
      '--aurora-pill-bg': '#E6D6ED',
      '--aurora-pill-active-bg': '#FAF5FC',
      '--aurora-table-head-bg': '#EAE0EF',
      '--aurora-input-bg': '#FAF5FC',
      '--aurora-input-border': '#CAAFD6',
      '--aurora-sidebar-bg': '#2D0F38',
      '--aurora-sidebar-card': '#1F0827',
      '--aurora-sidebar-active-bg': '#F3EBF6',
      '--aurora-sidebar-active-text': '#3B144A',
      '--aurora-header-bg': 'rgba(54, 20, 68, 0.96)',
      '--aurora-header-border': '#6C3D7D',
      '--aurora-header-title': '#FAF5FC',
      '--aurora-header-subtitle': '#DECBE6',
      '--aurora-header-btn-bg': '#492059',
      '--aurora-header-btn-text': '#F6EDF9',
      '--aurora-header-btn-border': '#79488C',
      '--aurora-header-btn-hover': '#5D2C70',
    },
  },
  {
    id: 'roxo-royal',
    name: 'Roxo Royal',
    shortName: 'Roxo Royal',
    description: 'Roxo vibrante e corporativo com cards em lilás real suave',
    swatches: {
      page: '#7442B0',
      card: '#F4EFF7',
      sidebar: '#3E1670',
    },
    vars: {
      '--aurora-page-bg': '#7442B0',
      '--aurora-card-bg': '#F4EFF7',
      '--aurora-card-border': '#C3ACE6',
      '--aurora-card-hover': '#A687DB',
      '--aurora-divider': '#E2D6F2',
      '--aurora-pill-bg': '#E6DCF4',
      '--aurora-pill-active-bg': '#FAF7FC',
      '--aurora-table-head-bg': '#EAE2F5',
      '--aurora-input-bg': '#FAF7FC',
      '--aurora-input-border': '#C8B3EA',
      '--aurora-sidebar-bg': '#3E1670',
      '--aurora-sidebar-card': '#2B0D52',
      '--aurora-sidebar-active-bg': '#F4EFF7',
      '--aurora-sidebar-active-text': '#3E1670',
      '--aurora-header-bg': 'rgba(241, 234, 250, 0.96)',
      '--aurora-header-border': '#BFA7E6',
      '--aurora-header-title': '#240B47',
      '--aurora-header-subtitle': '#533580',
      '--aurora-header-btn-bg': '#FAF7FC',
      '--aurora-header-btn-text': '#3B1969',
      '--aurora-header-btn-border': '#CBB7EC',
      '--aurora-header-btn-hover': '#E7DAFB',
    },
  },
  {
    id: 'castanho-acai',
    name: 'Castanho & Açaí',
    shortName: 'Castanho & Açaí',
    description: 'Tons terrosos quentes com cards em off-white aconchegante',
    swatches: {
      page: '#C4A892',
      card: '#FBF8F5',
      sidebar: '#462319',
    },
    vars: {
      '--aurora-page-bg': '#C4A892',
      '--aurora-card-bg': '#FBF8F5',
      '--aurora-card-border': '#BEA088',
      '--aurora-card-hover': '#9E7B61',
      '--aurora-divider': '#E6D6C7',
      '--aurora-pill-bg': '#EFE2D6',
      '--aurora-pill-active-bg': '#FDFBF8',
      '--aurora-table-head-bg': '#F2E7DC',
      '--aurora-input-bg': '#FDFBF8',
      '--aurora-input-border': '#CEB49E',
      '--aurora-sidebar-bg': '#462319',
      '--aurora-sidebar-card': '#331710',
      '--aurora-sidebar-active-bg': '#FBF8F5',
      '--aurora-sidebar-active-text': '#462319',
      '--aurora-header-bg': 'rgba(242, 230, 219, 0.96)',
      '--aurora-header-border': '#BEA088',
      '--aurora-header-title': '#2D160F',
      '--aurora-header-subtitle': '#66483B',
      '--aurora-header-btn-bg': '#FBF8F5',
      '--aurora-header-btn-text': '#462319',
      '--aurora-header-btn-border': '#CEB49E',
      '--aurora-header-btn-hover': '#EBDACE',
    },
  },
];

export function isValidThemeId(value: unknown): value is AuroraThemeId {
  return AURORA_THEMES.some((t) => t.id === value);
}

export function getThemeById(id: AuroraThemeId): AuroraTheme {
  return AURORA_THEMES.find((t) => t.id === id) ?? AURORA_THEMES[0];
}

export function applyAuroraTheme(themeId: AuroraThemeId): AuroraTheme {
  const theme = getThemeById(themeId);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(theme.vars)) {
      root.style.setProperty(prop, val);
    }
    root.dataset.auroraTheme = theme.id;
  }
  return theme;
}

export function loadSavedThemeId(): AuroraThemeId {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isValidThemeId(stored)) return stored;
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_THEME_ID;
}

export function saveThemeId(themeId: AuroraThemeId): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  } catch {
    // Ignore storage write errors
  }
}
