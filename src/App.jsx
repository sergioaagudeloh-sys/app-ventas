import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { MotionConfig } from 'framer-motion'
import AppRoutes from './routes/AppRoutes'
import CartDrawer from './components/client/cart/CartDrawer'
import GuidedToast from './components/ui/GuidedToast'
import PWAInstallBanner from './components/ui/PWAInstallBanner'
import useAppConfigStore from './store/appConfigStore'
import useAppConfigSync from './hooks/useAppConfigSync'
import useAuthInit from './hooks/useAuthInit'
import { getActiveColors } from './constants/palettes'
import { FONTS } from './constants/fonts'

// ─── Cliente de TanStack Query (caché global, reintentos automáticos) ─────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 minutos de caché
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// ─── Fallback de error global ────────────────────────────────────────────────
function AppErrorFallback({ error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-6">
      <div className="bg-surface rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-app">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-app mb-2">Algo salió mal</h2>
        <p className="text-muted text-sm mb-6">{error?.message || 'Error inesperado'}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 active:scale-95 hover:opacity-90"
          aria-label="Recargar página"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

// ─── FONTS se importa desde constants/fonts.js ────────────────────────────────

// ─── Componente que aplica el tema y modo oscuro desde el store ───────────────
function ThemeApplier() {
  const { theme, activeSeasonalEvent, isDarkMode, appFont, appRadius, actionColor, animationsEnabled } = useAppConfigStore()

  useEffect(() => {
    const root = document.documentElement
    
    // Aplicar atributo data-theme y clase dark para utilidades Tailwind
    if (typeof theme === 'string') {
      root.setAttribute('data-theme', theme)
    } else if (theme && theme.id) {
      root.setAttribute('data-theme', theme.id)
    }
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Calcular e inyectar colores dinámicos base incluyendo el evento estacional activo
    const activeColors = getActiveColors(theme, isDarkMode, activeSeasonalEvent)
    
    Object.entries(activeColors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // ─── 1. Aplicar Fuente ───────────────────────────────────────────────
    const fontConfig = FONTS[appFont] || FONTS.inter
    // Cargar la fuente dinámicamente inyectando link en el head
    let fontLink = document.getElementById('dynamic-font')
    if (!fontLink) {
      fontLink = document.createElement('link')
      fontLink.id = 'dynamic-font'
      fontLink.rel = 'stylesheet'
      document.head.appendChild(fontLink)
    }
    if (fontLink.href !== fontConfig.url) {
      fontLink.href = fontConfig.url
    }
    // Establecer variable CSS global
    root.style.setProperty('--font-body', `"${fontConfig.name}", system-ui, sans-serif`)

    // ─── 2. Aplicar Radio de Bordes ──────────────────────────────────────
    const radiusMap = {
      squared: '0.25rem', // 4px
      rounded: '0.75rem', // 12px
      pill: '2rem'        // 32px
    }
    root.style.setProperty('--radius-base', radiusMap[appRadius] || radiusMap.rounded)

    // ─── 3. Aplicar Color de Acción ──────────────────────────────────────
    if (actionColor) {
      root.style.setProperty('--color-action', actionColor)
    } else {
      root.style.setProperty('--color-action', activeColors['--color-primary'])
    }

    // ─── 4. Aplicar Animaciones ──────────────────────────────────────────
    if (animationsEnabled) {
      root.classList.remove('no-animations')
    } else {
      root.classList.add('no-animations')
    }

    // ─── 5. Sincronizar theme-color meta tag del Navegador Móvil y PWA ───
    const themeBgColor = activeColors['--color-bg'] || (isDarkMode ? '#0f0f0f' : '#ffffff')
    let themeMetaTag = document.querySelector('meta[name="theme-color"]')
    if (!themeMetaTag) {
      themeMetaTag = document.createElement('meta')
      themeMetaTag.name = 'theme-color'
      document.head.appendChild(themeMetaTag)
    }
    themeMetaTag.setAttribute('content', themeBgColor)
    
  }, [theme, activeSeasonalEvent, isDarkMode, appFont, appRadius, actionColor, animationsEnabled])

  return null
}

import { updateDynamicManifest } from './utils/dynamicManifest'

export default function App() {
  // Inicialización de la sesión global híbrida (LocalStorage + Firebase)
  useAuthInit()
  
  // Sincronización global Firestore <-> Zustand en tiempo real
  useAppConfigSync()

  const { 
    isLoaded, 
    appName, 
    appIcon, 
    pwaAppName, 
    pwaAppIcon, 
    pwaUseBrandIcon, 
    theme, 
    activeSeasonalEvent, 
    isDarkMode, 
    animationsEnabled,
    tablesEnabled,
    setActiveTable
  } = useAppConfigStore()

  // Capturar parámetro ?tableId= de la URL para Autoservicio QR
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableId = params.get('tableId')
    if (tableId && tablesEnabled) {
      const fetchTable = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('./config/firebaseConfig')
          const snap = await getDoc(doc(db, 'tables', tableId))
          if (snap.exists()) {
            const tableData = snap.data()
            const tbl = { id: snap.id, nombre: tableData.nombre }
            setActiveTable(tbl)
            sessionStorage.setItem('activeTable', JSON.stringify(tbl))
          }
        } catch (e) {
          console.error('Error al recuperar datos de la mesa:', e)
        }
      }
      fetchTable()
    }
  }, [tablesEnabled, setActiveTable])

  // Inicializar activeTable desde sessionStorage en el primer renderizado
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('activeTable')
      if (stored) {
        setActiveTable(JSON.parse(stored))
      }
    } catch (e) {}
  }, [setActiveTable])

  // Activar transiciones de fondo únicamente después de la hidratación y pintado inicial (evita FOUC cromático)
  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.classList.add('with-transitions')
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Determinar si es la primera carga absoluta (sin caché local) y aún no se ha descargado de Firestore
  const isFirstLoad = !isLoaded && !localStorage.getItem('app-config-storage')

  // Actualizar el manifest PWA y el favicon en tiempo real cuando cambie el nombre o logo
  useEffect(() => {
    const titleToUse = pwaAppName || appName
    if (titleToUse) {
      document.title = titleToUse
      const activeColors = getActiveColors(theme, isDarkMode, activeSeasonalEvent)
      const primaryColor = activeColors['--color-primary']
      const bgColor = activeColors['--color-bg']
      updateDynamicManifest(appName, appIcon, pwaAppName, pwaAppIcon, pwaUseBrandIcon, primaryColor, bgColor)
    }

    // Actualizar el favicon con la imagen de marca o el favicon por defecto
    const faviconToUse = appIcon || '/favicon.svg'
    const link = document.querySelector("link[rel~='icon']")
    if (link) {
      link.href = faviconToUse
      if (appIcon) {
        link.type = 'image/png'
      } else {
        link.type = 'image/svg+xml'
      }
    }
  }, [appName, appIcon, pwaAppName, pwaAppIcon, pwaUseBrandIcon, theme, activeSeasonalEvent, isDarkMode])

  if (isFirstLoad) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fdfbfb]"
        style={{
          background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div className="relative w-20 h-20 flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-gray-600 animate-spin" />
          <span className="text-3xl animate-pulse" role="img" aria-label="Cargando">🛍️</span>
        </div>
        <div className="space-y-1 text-center animate-pulse">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">
            Preparando Tienda
          </h2>
          <p className="text-xs text-gray-400 font-semibold">
            Sincronizando diseño y catálogo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion={animationsEnabled ? "user" : "always"}>
          <BrowserRouter>
            <ThemeApplier />
            <AppRoutes />
            <CartDrawer />
            <GuidedToast />
            <PWAInstallBanner />
          </BrowserRouter>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
