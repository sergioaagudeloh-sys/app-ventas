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
  'rosa-elegante': {
    id: 'rosa-elegante',
    name: 'Rosa Elegante',
    light: {
      primary: '#e91e8c',
      secondary: '#f48fb1',
      accent: '#ff4081',
      bg: '#fff5f9',
      surface: '#ffffff',
      surface2: '#fce4ec',
      text: '#1a0a12',
      textMuted: '#6d4c5e',
      border: '#f8bbd0'
    },
    dark: {
      primary: '#e91e8c',
      secondary: '#f48fb1',
      accent: '#ff4081',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      surface2: '#252525',
      text: '#f0f0f0',
      textMuted: '#a0a0a0',
      border: '#333333'
    }
  },
  'lila-suave': {
    id: 'lila-suave',
    name: 'Lila Suave',
    light: {
      primary: '#9c27b0',
      secondary: '#ce93d8',
      accent: '#e040fb',
      bg: '#fdf6ff',
      surface: '#ffffff',
      surface2: '#f3e5f5',
      text: '#12001a',
      textMuted: '#5e3570',
      border: '#e1bee7'
    },
    dark: {
      primary: '#9c27b0',
      secondary: '#ce93d8',
      accent: '#e040fb',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      surface2: '#252525',
      text: '#f0f0f0',
      textMuted: '#a0a0a0',
      border: '#333333'
    }
  },
  'azul-medianoche': {
    id: 'azul-medianoche',
    name: 'Azul Medianoche',
    light: {
      primary: '#1565c0',
      secondary: '#64b5f6',
      accent: '#2979ff',
      bg: '#f0f4ff',
      surface: '#ffffff',
      surface2: '#e3f2fd',
      text: '#00091a',
      textMuted: '#2c4a7c',
      border: '#bbdefb'
    },
    dark: {
      primary: '#1565c0',
      secondary: '#64b5f6',
      accent: '#2979ff',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      surface2: '#252525',
      text: '#f0f0f0',
      textMuted: '#a0a0a0',
      border: '#333333'
    }
  },
  'verde-oliva': {
    id: 'verde-oliva',
    name: 'Verde Oliva',
    light: {
      primary: '#558b2f',
      secondary: '#aed581',
      accent: '#76ff03',
      bg: '#f4f8f0',
      surface: '#ffffff',
      surface2: '#f1f8e9',
      text: '#0a1200',
      textMuted: '#3e5229',
      border: '#c5e1a5'
    },
    dark: {
      primary: '#558b2f',
      secondary: '#aed581',
      accent: '#76ff03',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      surface2: '#252525',
      text: '#f0f0f0',
      textMuted: '#a0a0a0',
      border: '#333333'
    }
  },
  'naranja-vibrante': {
    id: 'naranja-vibrante',
    name: 'Naranja Vibrante',
    light: {
      primary: '#e65100',
      secondary: '#ffcc80',
      accent: '#ff6d00',
      bg: '#fff8f0',
      surface: '#ffffff',
      surface2: '#fff3e0',
      text: '#1a0900',
      textMuted: '#7c3c00',
      border: '#ffcc80'
    },
    dark: {
      primary: '#e65100',
      secondary: '#ffcc80',
      accent: '#ff6d00',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      surface2: '#252525',
      text: '#f0f0f0',
      textMuted: '#a0a0a0',
      border: '#333333'
    }
  },
  'morado-premium': {
    id: 'morado-premium',
    name: 'Morado Premium',
    light: {
      primary: '#4527a0',
      secondary: '#b39ddb',
      accent: '#7c4dff',
      bg: '#f5f3ff',
      surface: '#ffffff',
      surface2: '#ede7f6',
      text: '#0a0019',
      textMuted: '#3a2060',
      border: '#b39ddb'
    },
    dark: {
      primary: '#4527a0',
      secondary: '#b39ddb',
      accent: '#7c4dff',
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      surface2: '#252525',
      text: '#f0f0f0',
      textMuted: '#a0a0a0',
      border: '#333333'
    }
  },
  'carbon-oscuro': {
    id: 'carbon-oscuro',
    name: 'Carbón Oscuro',
    light: {
      primary: '#90caf9',
      secondary: '#bbdefb',
      accent: '#40c4ff',
      bg: '#121212',
      surface: '#1e1e1e',
      surface2: '#2c2c2c',
      text: '#e0e0e0',
      textMuted: '#9e9e9e',
      border: '#37474f'
    },
    dark: {
      primary: '#90caf9',
      secondary: '#bbdefb',
      accent: '#40c4ff',
      bg: '#121212',
      surface: '#1e1e1e',
      surface2: '#2c2c2c',
      text: '#e0e0e0',
      textMuted: '#9e9e9e',
      border: '#37474f'
    }
  },
  'esmeralda-profundo': {
    id: 'esmeralda-profundo',
    name: 'Esmeralda Profundo',
    light: {
      primary: '#69f0ae',
      secondary: '#b9f6ca',
      accent: '#00e676',
      bg: '#0d1f18',
      surface: '#132819',
      surface2: '#1a3325',
      text: '#e0f2f1',
      textMuted: '#80cbc4',
      border: '#1b5e20'
    },
    dark: {
      primary: '#69f0ae',
      secondary: '#b9f6ca',
      accent: '#00e676',
      bg: '#0d1f18',
      surface: '#132819',
      surface2: '#1a3325',
      text: '#e0f2f1',
      textMuted: '#80cbc4',
      border: '#1b5e20'
    }
  }
}

// Convertir las paletas estáticas a formato de inyección
export function getActiveColors(themeConfig, isDarkMode) {
  // themeConfig puede ser un string (id de paleta predefinida) o un objeto (paleta personalizada)
  let baseColors = null;

  if (typeof themeConfig === 'string') {
    // Es una paleta predefinida o fallback
    const palette = ADVANCED_PALETTES[themeConfig] || ADVANCED_PALETTES['rosa-elegante'];
    baseColors = isDarkMode ? palette.dark : palette.light;
  } else if (themeConfig && typeof themeConfig === 'object') {
    // Es una paleta personalizada
    baseColors = isDarkMode 
      ? (themeConfig.dark || themeConfig.light || themeConfig) 
      : (themeConfig.light || themeConfig);
  }

  // Fallback de seguridad
  if (!baseColors) {
    baseColors = ADVANCED_PALETTES['rosa-elegante'].light;
  }

  return {
    '--color-primary': baseColors.primary || '#e91e8c',
    '--color-primary-light': baseColors.secondary || '#f48fb1',
    '--color-primary-dark': baseColors.accent || '#ff4081',
    '--color-secondary': baseColors.secondary || '#f8bbd9',
    '--color-accent': baseColors.accent || '#ff4081',
    '--color-bg': baseColors.bg || (isDarkMode ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG),
    '--color-surface': baseColors.surface || (isDarkMode ? DEFAULT_DARK_SURFACE : DEFAULT_LIGHT_SURFACE),
    '--color-surface-2': baseColors.surface2 || (isDarkMode ? DEFAULT_DARK_SURFACE_2 : DEFAULT_LIGHT_SURFACE_2),
    '--color-text': baseColors.text || (isDarkMode ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT),
    '--color-text-muted': baseColors.textMuted || (isDarkMode ? DEFAULT_DARK_TEXT_MUTED : DEFAULT_LIGHT_TEXT_MUTED),
    '--color-border': baseColors.border || (isDarkMode ? DEFAULT_DARK_BORDER : DEFAULT_LIGHT_BORDER)
  }
}
