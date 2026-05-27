/**
 * ─── TIPOGRAFÍAS DE LA APLICACIÓN ───────────────────────────────────────────
 * 20 fuentes organizadas por categoría estética.
 * Cada fuente se carga dinámicamente desde Google Fonts.
 */

export const FONTS = {
  // ── Modernas & Sans-Serif ──────────────────────────────────────────────────
  inter: {
    name: 'Inter',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
    category: 'Modernas',
    description: 'Limpia y profesional',
  },
  poppins: {
    name: 'Poppins',
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap',
    category: 'Modernas',
    description: 'Geométrica y amigable',
  },
  outfit: {
    name: 'Outfit',
    url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap',
    category: 'Modernas',
    description: 'Estilo y modernidad',
  },
  nunito: {
    name: 'Nunito',
    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap',
    category: 'Modernas',
    description: 'Suave y redondeada',
  },
  montserrat: {
    name: 'Montserrat',
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
    category: 'Modernas',
    description: 'Urbana y fuerte',
  },
  raleway: {
    name: 'Raleway',
    url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap',
    category: 'Modernas',
    description: 'Delicada y refinada',
  },

  // ── Elegantes & Serif ──────────────────────────────────────────────────────
  playfair: {
    name: 'Playfair Display',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap',
    category: 'Elegantes',
    description: 'Lujo y distinción',
  },
  cormorant: {
    name: 'Cormorant Garamond',
    url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap',
    category: 'Elegantes',
    description: 'Alta costura editorial',
  },
  lora: {
    name: 'Lora',
    url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    category: 'Elegantes',
    description: 'Clásica y sofisticada',
  },
  merriweather: {
    name: 'Merriweather',
    url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap',
    category: 'Elegantes',
    description: 'Seria y distinguida',
  },

  // ── Cursivas & Script ──────────────────────────────────────────────────────
  dancing: {
    name: 'Dancing Script',
    url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap',
    category: 'Cursivas',
    description: 'Romántica y fluida',
  },
  parisienne: {
    name: 'Parisienne',
    url: 'https://fonts.googleapis.com/css2?family=Parisienne&display=swap',
    category: 'Cursivas',
    description: 'Parisina y chic',
  },
  greatvibes: {
    name: 'Great Vibes',
    url: 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap',
    category: 'Cursivas',
    description: 'Glamour y estilo',
  },
  sacramento: {
    name: 'Sacramento',
    url: 'https://fonts.googleapis.com/css2?family=Sacramento&display=swap',
    category: 'Cursivas',
    description: 'Delicada caligrafía',
  },

  // ── Geométricas ────────────────────────────────────────────────────────────
  josefin: {
    name: 'Josefin Sans',
    url: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;500;600;700&display=swap',
    category: 'Geométricas',
    description: 'Minimalista y actual',
  },
  quicksand: {
    name: 'Quicksand',
    url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap',
    category: 'Geométricas',
    description: 'Fresca y juvenil',
  },

  // ── Clásicas ───────────────────────────────────────────────────────────────
  roboto: {
    name: 'Roboto',
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap',
    category: 'Clásicas',
    description: 'Material y versátil',
  },
  opensans: {
    name: 'Open Sans',
    url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap',
    category: 'Clásicas',
    description: 'Universal y legible',
  },
  lato: {
    name: 'Lato',
    url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap',
    category: 'Clásicas',
    description: 'Simple y efectiva',
  },
  sourcesans: {
    name: 'Source Sans 3',
    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700;900&display=swap',
    category: 'Clásicas',
    description: 'Adobe. Clara y limpia',
  },
}

/** Orden de las categorías para renderizado */
export const FONT_CATEGORIES = ['Modernas', 'Elegantes', 'Cursivas', 'Geométricas', 'Clásicas']

/** Agrupación de fuentes por categoría */
export const FONTS_BY_CATEGORY = FONT_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = Object.entries(FONTS)
    .filter(([, f]) => f.category === cat)
    .map(([key, f]) => ({ key, ...f }))
  return acc
}, {})
