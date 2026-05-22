export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
}

// Colores base para fondos y superficies si no se especifican en la paleta
const DEFAULT_LIGHT_BG = '#ffffff'
const DEFAULT_LIGHT_SURFACE = '#f8fafc'
const DEFAULT_LIGHT_SURFACE_2 = '#f1f5f9'
const DEFAULT_LIGHT_TEXT = '#0f172a'
const DEFAULT_LIGHT_TEXT_MUTED = '#64748b'
const DEFAULT_LIGHT_BORDER = '#e2e8f0'

const DEFAULT_DARK_BG = '#0f172a'
const DEFAULT_DARK_SURFACE = '#1e293b'
const DEFAULT_DARK_SURFACE_2 = '#334155'
const DEFAULT_DARK_TEXT = '#f8fafc'
const DEFAULT_DARK_TEXT_MUTED = '#cbd5e1'
const DEFAULT_DARK_BORDER = '#334155'

// Estructura de paletas avanzadas
export const ADVANCED_PALETTES = {
  'minimal-dark': {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    light: {
      primary: '#334155',
      secondary: '#475569',
      accent: '#0f172a',
      bg: '#f8fafc',
      surface: '#ffffff',
      surface2: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0'
    },
    dark: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      accent: '#f8fafc',
      bg: '#0f172a',
      surface: '#1e293b',
      surface2: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      border: '#334155'
    }
  },
  'ocean-blue': {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    light: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      accent: '#0284c7',
      bg: '#f0f9ff',
      surface: '#ffffff',
      surface2: '#e0f2fe',
      text: '#0c4a6e',
      textMuted: '#0369a1',
      border: '#bae6fd'
    },
    dark: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      accent: '#7dd3fc',
      bg: '#082f49',
      surface: '#0c4a6e',
      surface2: '#075985',
      text: '#f0f9ff',
      textMuted: '#bae6fd',
      border: '#075985'
    }
  },
  'luxury-gold': {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    light: {
      primary: '#d4af37',
      secondary: '#f3e5ab',
      accent: '#aa8c2c',
      bg: '#fdfbf7',
      surface: '#ffffff',
      surface2: '#f9f6ed',
      text: '#4a3f15',
      textMuted: '#8a7a40',
      border: '#f3e5ab'
    },
    dark: {
      primary: '#d4af37',
      secondary: '#e5c158',
      accent: '#f3e5ab',
      bg: '#1a1814',
      surface: '#2a261f',
      surface2: '#3d382b',
      text: '#fdfbf7',
      textMuted: '#c5b894',
      border: '#3d382b'
    }
  },
  'modern-purple': {
    id: 'modern-purple',
    name: 'Modern Purple',
    light: {
      primary: '#7c3aed',
      secondary: '#8b5cf6',
      accent: '#6d28d9',
      bg: '#f5f3ff',
      surface: '#ffffff',
      surface2: '#ede9fe',
      text: '#2e1065',
      textMuted: '#5b21b6',
      border: '#ddd6fe'
    },
    dark: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      accent: '#c4b5fd',
      bg: '#1e1b4b',
      surface: '#2e1065',
      surface2: '#4c1d95',
      text: '#f5f3ff',
      textMuted: '#c4b5fd',
      border: '#4c1d95'
    }
  },
  'soft-green': {
    id: 'soft-green',
    name: 'Soft Green',
    light: {
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#059669',
      bg: '#ecfdf5',
      surface: '#ffffff',
      surface2: '#d1fae5',
      text: '#064e3b',
      textMuted: '#047857',
      border: '#a7f3d0'
    },
    dark: {
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#6ee7b7',
      bg: '#064e3b',
      surface: '#065f46',
      surface2: '#047857',
      text: '#ecfdf5',
      textMuted: '#a7f3d0',
      border: '#047857'
    }
  },
  'sunset-orange': {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    light: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#ea580c',
      bg: '#fff7ed',
      surface: '#ffffff',
      surface2: '#ffedd5',
      text: '#7c2d12',
      textMuted: '#9a3412',
      border: '#fed7aa'
    },
    dark: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#fdba74',
      bg: '#431407',
      surface: '#7c2d12',
      surface2: '#9a3412',
      text: '#fff7ed',
      textMuted: '#fed7aa',
      border: '#9a3412'
    }
  },
  'elegant-black': {
    id: 'elegant-black',
    name: 'Elegant Black',
    light: {
      primary: '#000000',
      secondary: '#1a1a1a',
      accent: '#333333',
      bg: '#fafafa',
      surface: '#ffffff',
      surface2: '#f5f5f5',
      text: '#000000',
      textMuted: '#666666',
      border: '#e5e5e5'
    },
    dark: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      accent: '#e5e5e5',
      bg: '#000000',
      surface: '#121212',
      surface2: '#1a1a1a',
      text: '#ffffff',
      textMuted: '#a3a3a3',
      border: '#333333'
    }
  }
}

// Convertir las paletas estáticas a formato de inyección
export function getActiveColors(themeConfig, isDarkMode) {
  // themeConfig puede ser un string (id de paleta predefinida) o un objeto (paleta personalizada)
  let baseColors = null;

  if (typeof themeConfig === 'string') {
    // Es una paleta predefinida o fallback
    const palette = ADVANCED_PALETTES[themeConfig] || ADVANCED_PALETTES['modern-purple'];
    baseColors = isDarkMode ? palette.dark : palette.light;
  } else if (themeConfig && typeof themeConfig === 'object') {
    // Es una paleta personalizada
    baseColors = isDarkMode 
      ? (themeConfig.dark || themeConfig.light || themeConfig) 
      : (themeConfig.light || themeConfig);
  }

  // Fallback de seguridad
  if (!baseColors) {
    baseColors = ADVANCED_PALETTES['modern-purple'].light;
  }

  return {
    '--color-primary': baseColors.primary || '#7c3aed',
    '--color-primary-light': baseColors.secondary || '#a78bfa',
    '--color-primary-dark': baseColors.accent || '#6d28d9',
    '--color-secondary': baseColors.secondary || '#8b5cf6',
    '--color-accent': baseColors.accent || '#c084fc',
    '--color-bg': baseColors.bg || (isDarkMode ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG),
    '--color-surface': baseColors.surface || (isDarkMode ? DEFAULT_DARK_SURFACE : DEFAULT_LIGHT_SURFACE),
    '--color-surface-2': baseColors.surface2 || (isDarkMode ? DEFAULT_DARK_SURFACE_2 : DEFAULT_LIGHT_SURFACE_2),
    '--color-text': baseColors.text || (isDarkMode ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT),
    '--color-text-muted': baseColors.textMuted || (isDarkMode ? DEFAULT_DARK_TEXT_MUTED : DEFAULT_LIGHT_TEXT_MUTED),
    '--color-border': baseColors.border || (isDarkMode ? DEFAULT_DARK_BORDER : DEFAULT_LIGHT_BORDER)
  }
}
