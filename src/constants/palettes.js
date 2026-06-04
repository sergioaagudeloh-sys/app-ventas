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

// Paletas temáticas de eventos estacionales
export const SEASONAL_EVENTS = {
  none: {
    id: 'none',
    name: 'Sin Evento Activo'
  },
  navidad: {
    id: 'navidad',
    name: 'Navidad 🎄',
    light: {
      primary: '#d32f2f',      // Rojo navideño
      secondary: '#388e3c',    // Verde pino
      accent: '#fbc02d',       // Dorado
      bg: '#fff9f9',
      surface: '#ffffff',
      surface2: '#ffebee',
      text: '#1b0000',
      textMuted: '#5d4037',
      border: '#ffcdd2'
    },
    dark: {
      primary: '#ef5350',
      secondary: '#4caf50',
      accent: '#ffd54f',
      bg: '#0a0505',
      surface: '#180d0d',
      surface2: '#2b1616',
      text: '#ffebee',
      textMuted: '#d7ccc8',
      border: '#5c2525'
    }
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween 🎃',
    light: {
      primary: '#f57c00',      // Naranja calabaza
      secondary: '#7b1fa2',    // Morado bruja
      accent: '#212121',       // Negro
      bg: '#fffdfb',
      surface: '#ffffff',
      surface2: '#ffe0b2',
      text: '#1b0d00',
      textMuted: '#4a148c',
      border: '#ffcc80'
    },
    dark: {
      primary: '#ff9800',
      secondary: '#9c27b0',
      accent: '#eeeeee',
      bg: '#0f0a05',
      surface: '#1c130b',
      surface2: '#2d1e11',
      text: '#ffe0b2',
      textMuted: '#e1bee7',
      border: '#6d3c0c'
    }
  },
  madre: {
    id: 'madre',
    name: 'Día de la Madre 🌸',
    light: {
      primary: '#ec407a',      // Rosado maternal
      secondary: '#f48fb1',    // Rosa pastel
      accent: '#ab47bc',       // Violeta suave
      bg: '#fff8f9',
      surface: '#ffffff',
      surface2: '#fce4ec',
      text: '#2c0012',
      textMuted: '#7b1fa2',
      border: '#f8bbd0'
    },
    dark: {
      primary: '#f48fb1',
      secondary: '#fce4ec',
      accent: '#ce93d8',
      bg: '#0f0a0c',
      surface: '#1c1115',
      surface2: '#2d1a21',
      text: '#fce4ec',
      textMuted: '#e1bee7',
      border: '#5c1e34'
    }
  },
  padre: {
    id: 'padre',
    name: 'Día del Padre 👔',
    light: {
      primary: '#0288d1',      // Azul varonil
      secondary: '#455a64',    // Gris cuero
      accent: '#00796b',       // Teal profundo
      bg: '#f4faff',
      surface: '#ffffff',
      surface2: '#e1f5fe',
      text: '#001a2c',
      textMuted: '#37474f',
      border: '#b3e5fc'
    },
    dark: {
      primary: '#29b6f6',
      secondary: '#90a4ae',
      accent: '#26a69a',
      bg: '#050a0f',
      surface: '#0b131c',
      surface2: '#13212f',
      text: '#e1f5fe',
      textMuted: '#cfd8dc',
      border: '#10304a'
    }
  },
  nino: {
    id: 'nino',
    name: 'Día del Niño 🧸',
    light: {
      primary: '#fbc02d',      // Amarillo alegre
      secondary: '#29b6f6',    // Celeste infantil
      accent: '#ec407a',       // Rosa chicle
      bg: '#fffdf4',
      surface: '#ffffff',
      surface2: '#fffde7',
      text: '#2e2300',
      textMuted: '#0277bd',
      border: '#fff59d'
    },
    dark: {
      primary: '#fdd835',
      secondary: '#4fc3f7',
      accent: '#f06292',
      bg: '#0a0a04',
      surface: '#17170a',
      surface2: '#282710',
      text: '#fffde7',
      textMuted: '#81d4fa',
      border: '#57541a'
    }
  },
  amistad: {
    id: 'amistad',
    name: 'Amor y Amistad ❤️',
    light: {
      primary: '#e91e63',      // Rojo pasión / fucsia
      secondary: '#f48fb1',    // Rosa suave
      accent: '#9c27b0',       // Morado amor
      bg: '#fff5f7',
      surface: '#ffffff',
      surface2: '#ffe4e8',
      text: '#2c000b',
      textMuted: '#880e4f',
      border: '#ffccd5'
    },
    dark: {
      primary: '#f48fb1',
      secondary: '#ffccd5',
      accent: '#e040fb',
      bg: '#0f0507',
      surface: '#1c0c10',
      surface2: '#2d1419',
      text: '#ffe4e8',
      textMuted: '#f48fb1',
      border: '#5c1b27'
    }
  },
  verano: {
    id: 'verano',
    name: 'Verano ☀️',
    light: {
      primary: '#ffeb3b',      // Amarillo sol
      secondary: '#00bcd4',    // Turquesa playa
      accent: '#ff9800',       // Naranja cálido
      bg: '#fffff0',
      surface: '#ffffff',
      surface2: '#e0f7fa',
      text: '#2c2c00',
      textMuted: '#006064',
      border: '#fff9c4'
    },
    dark: {
      primary: '#fdd835',
      secondary: '#4dd0e1',
      accent: '#fb8c00',
      bg: '#0a0a00',
      surface: '#17170b',
      surface2: '#12252a',
      text: '#fffff0',
      textMuted: '#80deea',
      border: '#4a4a15'
    }
  },
  semanasanta: {
    id: 'semanasanta',
    name: 'Semana Santa 🌾',
    light: {
      primary: '#673ab7',      // Morado eclesiástico
      secondary: '#eae6df',    // Blanco lino
      accent: '#ffb300',       // Oro
      bg: '#fafafa',
      surface: '#ffffff',
      surface2: '#ede7f6',
      text: '#1a0033',
      textMuted: '#5e35b1',
      border: '#d1c4e9'
    },
    dark: {
      primary: '#9575cd',
      secondary: '#424242',
      accent: '#ffca28',
      bg: '#0c0a0f',
      surface: '#120f18',
      surface2: '#1c1725',
      text: '#ede7f6',
      textMuted: '#b39ddb',
      border: '#3c3252'
    }
  },
  mascota: {
    id: 'mascota',
    name: 'Día de la Mascota 🐾',
    light: {
      primary: '#8d6e63',      // Café cálido / Huella
      secondary: '#d7ccc8',    // Hueso / Beige suave
      accent: '#ffb74d',       // Naranja juguetón
      bg: '#faf8f6',
      surface: '#ffffff',
      surface2: '#efebe9',
      text: '#3e2723',
      textMuted: '#5d4037',
      border: '#d7ccc8'
    },
    dark: {
      primary: '#a1887f',
      secondary: '#4e342e',
      accent: '#ffa726',
      bg: '#0f0c0b',
      surface: '#1c1715',
      surface2: '#2d221e',
      text: '#efebe9',
      textMuted: '#d7ccc8',
      border: '#5c4033'
    }
  },
  'custom-brand': {
    id: 'custom-brand',
    name: 'Tema Personalizado',
    light: {
      primary: 'var(--color-primary-custom, #0ea5e9)',
      secondary: 'var(--color-secondary-custom, #3b82f6)',
      accent: 'var(--color-primary-custom, #0ea5e9)',
      bg: 'var(--color-bg-custom, #ffffff)',
      surface: 'var(--color-surface-custom, #f8fafc)',
      surface2: 'var(--color-surface-2-custom, #f1f5f9)',
      text: 'var(--color-text-custom, #0f172a)',
      textMuted: '#64748b',
      border: 'var(--color-border-custom, #e2e8f0)'
    },
    dark: {
      primary: 'var(--color-primary-custom, #0ea5e9)',
      secondary: 'var(--color-secondary-custom, #3b82f6)',
      accent: 'var(--color-primary-custom, #0ea5e9)',
      bg: 'var(--color-bg-custom-dark, #080f1e)',
      surface: 'var(--color-surface-custom-dark, #0d1a2e)',
      surface2: 'var(--color-surface-2-custom-dark, #112238)',
      text: 'var(--color-text-custom-dark, #f0f7ff)',
      textMuted: '#cbd5e1',
      border: 'var(--color-border-custom-dark, #1e3a5f)'
    }
  }
}

// Convertir las paletas estáticas a formato de inyección
export function getActiveColors(themeConfig, isDarkMode, activeSeasonalEvent = 'none') {
  let baseColors = null;

  // Priorizar el evento de temporada si está activo y existe
  if (activeSeasonalEvent && activeSeasonalEvent !== 'none' && SEASONAL_EVENTS[activeSeasonalEvent]) {
    const eventPalette = SEASONAL_EVENTS[activeSeasonalEvent];
    baseColors = isDarkMode ? eventPalette.dark : eventPalette.light;
  }

  // Fallback a la paleta normal de la tienda si no hay evento activo
  if (!baseColors) {
    if (typeof themeConfig === 'string') {
      const palette = ADVANCED_PALETTES[themeConfig] || ADVANCED_PALETTES['rosa-elegante'];
      baseColors = isDarkMode ? palette.dark : palette.light;
    } else if (themeConfig && typeof themeConfig === 'object') {
      baseColors = isDarkMode 
        ? (themeConfig.dark || themeConfig.light || themeConfig) 
        : (themeConfig.light || themeConfig);
    }
  }

  // Fallback de seguridad final
  if (!baseColors) {
    baseColors = ADVANCED_PALETTES['carbon-oscuro'].light;
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

