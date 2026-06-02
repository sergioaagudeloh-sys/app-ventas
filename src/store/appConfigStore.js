import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de configuración de la aplicación.
 * Refleja en tiempo real los datos cargados desde Firestore /config/settings.
 * Controla: nombre de la app, tema, modo oscuro, paleta de colores.
 */
// Obtener estado inicial persistido síncronamente para evitar FOUC de color (destello rosa inicial) en hidratación asíncrona de Zustand
const getPersistedValue = (key, defaultValue) => {
  try {
    const raw = localStorage.getItem('app-config-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.state && parsed.state[key] !== undefined) {
        return parsed.state[key]
      }
    }
  } catch (e) {}
  return defaultValue
}

const useAppConfigStore = create(
  persist(
    (set) => ({
      // ─── Estado ───────────────────────────────────────────────────────────
      appName: getPersistedValue('appName', 'Mi Tienda'),
      sellerName: getPersistedValue('sellerName', 'Vendedor'),
      appIcon: null,
      welcomeWavesEnabled: getPersistedValue('welcomeWavesEnabled', true),
      theme: getPersistedValue('theme', 'rosa-elegante'),    // Paleta activa por defecto (neutral clara y elegante antes de sincronizar)
      isDarkMode: getPersistedValue('isDarkMode', false),         // Por defecto claro para evitar forzar el modo oscuro al limpiar caché
      adminRegistered: false,    // Bandera para Auth Admin
      pwaAppName: '',            // Nombre al instalarse como app móvil
      pwaAppIcon: null,          // Icono personalizado de instalación PWA
      pwaUseBrandIcon: false,    // Usar logo de la tienda como ícono PWA (con fondo)
      activeSeasonalEvent: getPersistedValue('activeSeasonalEvent', 'none'), // Evento estacional activo ('none', 'navidad', 'halloween', 'madre', 'padre')
      whatsappAdmin: '',
      claimsEnabled: false,
      orderTrackingEnabled: false,
      tablesEnabled: getPersistedValue('tablesEnabled', false), // Módulo de mesas y autoservicio QR habilitado
      activeTable: null,          // Mesa actual vinculada en la sesión del cliente (no persistida)
      trackingWaTemplate: '',
      appPromo: {
        enabled: false,
        title: '',
        message: '',
        androidUrl: '',
        iosUrl: '',
        promoImageUrl: ''
      },
      developerPhone: '',
      bankInfo: {
        numeroCuenta: '',
        banco: '',
        tipoCuenta: 'ahorros',   // 'ahorros' | 'corriente'
        titular: '',
        cedulaNit: '',
        qrUrl: '',
      },
      bankInfo2: {
        activa: false,           // segunda cuenta habilitada
        numeroCuenta: '',
        banco: '',
        tipoCuenta: 'ahorros',
        focus: false,
        titular: '',
        cedulaNit: '',
        qrUrl: '',
      },
      // ─── Apariencia avanzada ───────────────────────────────────────────
      appFont: getPersistedValue('appFont', 'inter'),
      appRadius: getPersistedValue('appRadius', 'rounded'),
      catalogBanner: { type: 'none', value: '' },
      catalogLayout: 'grid2',
      animationsEnabled: getPersistedValue('animationsEnabled', true),
      actionColor: getPersistedValue('actionColor', ''),
      catalogFilters: {
        categories: true,
        sizes: true,
        colors: true,
        customAttributes: [
          { id: 'attr-marca', name: 'Marca', type: 'text' },
          { id: 'attr-genero', name: 'Género', type: 'select', options: ['Hombre', 'Mujer', 'Unisex'] }
        ]
      },
      guidedModeEnabled: true, // Toggle global de asistencia
      loginTrustMessage: '',  // Mensaje de confianza personalizable
      slogan: '',             // Eslogan de la tienda (aparece debajo del logo en login)
      creditsEnabled: true,
      couponsEnabled: true,
      rolesOperativosEnabled: false, // Sistema de Roles Operativos y Portales (módulo avanzado)
      deliverySettings: {
        pickup: {
          enabled: true,
          address: '',
          instructions: 'Recoge tu pedido directamente en nuestro local.'
        },
        shipping: {
          enabled: true,
          cost: 0,
          estimatedTime: '30 a 60 min',
          instructions: 'Recibe tu pedido en la comodidad de tu casa.'
        },
        digital: {
          enabled: false,
          instructions: 'Entrega digital o prestación de servicio presencial.'
        },
        customDelivery: {
          enabled: false,                   // Módulo de mensajero propio activo
          serviceLabel: 'Domicilio Propio', // Nombre visible del servicio
          costType: 'fijo',                 // 'fijo' | 'personalizado'
          fixedCost: 0,                     // Costo fijo cuando costType === 'fijo'
          allowCustomCost: false,           // Permite editar el costo desde cada pedido
          estimatedTime: '20 a 40 min',
          messengerTemplate: '',            // Plantilla de mensaje; si vacía usa DEFAULT_MESSENGER_TEMPLATE
          // Los mensajeros externos se guardan en Firestore (deliveryService)
          // Esta configuración no los duplica, solo tiene parámetros globales del servicio
        }
      },
      hasMultipleEmployees: false,
      employeeCount: 0,
      employees: [],
      wholesaleSettings: {
        enabled: true,
        minQuantity: 12,
        discountType: 'percentage', // 'percentage' | 'fixed'
        discountValue: 15
      },
      commercialOptimization: {
        enabled: false,
        tools: {
          smartTags: {
            enabled: true,
            bestSeller: { enabled: true, text: 'Más Vendido', bg: '#ef4444', textCol: '#ffffff', style: 'pill', minSales: 5 },
            unmissableOffer: { enabled: true, text: 'Oferta Imperdible', bg: '#f59e0b', textCol: '#ffffff', style: 'pill' },
            lastUnit: { enabled: true, text: 'Última Unidad', bg: '#3b82f6', textCol: '#ffffff', style: 'pill', threshold: 3 },
            newProduct: { enabled: true, text: 'Nuevo', bg: '#10b981', textCol: '#ffffff', style: 'pill', daysLimit: 7 }
          },
          advancedGallery: {
            enabled: true
          },
          visualVariations: {
            enabled: true
          },
          variationIndicators: {
            enabled: true
          },
          cartRecommendations: {
            enabled: true,
            title: 'Recomendado para ti'
          },
          historyRecommendations: {
            enabled: true
          }
        }
      },
      isLoaded: false,

      // ─── Acciones ─────────────────────────────────────────────────────────
      /**
       * Actualiza toda la configuración desde Firestore.
       * @param {object} config - Configuración completa de Firestore
       */
      setConfig: (config) => set({ ...config, isLoaded: true }),
      setCatalogFilters: (catalogFilters) => set({ catalogFilters }),

      /**
       * Alterna entre modo oscuro y claro.
       * Se aplica a TODA la app mediante la clase 'dark' en el elemento raíz.
       */
      toggleDarkMode: () => set((state) => {
        const newDark = !state.isDarkMode
        if (newDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { isDarkMode: newDark }
      }),

      setTheme: (theme) => set({ theme }),
      setAppName: (name) => set({ appName: name }),
      setTablesEnabled: (tablesEnabled) => set({ tablesEnabled }),
      setActiveTable: (activeTable) => set({ activeTable }),
    }),
    {
      name: 'app-config-storage',
      partialize: (state) => ({
        appName: state.appName,
        appIcon: state.appIcon,
        pwaAppName: state.pwaAppName,
        pwaAppIcon: state.pwaAppIcon,
        pwaUseBrandIcon: state.pwaUseBrandIcon,
        welcomeWavesEnabled: state.welcomeWavesEnabled,
        sellerName: state.sellerName,
        isDarkMode: state.isDarkMode,
        theme: state.theme,
        activeSeasonalEvent: state.activeSeasonalEvent,
        appFont: state.appFont,
        appRadius: state.appRadius,
        actionColor: state.actionColor,
        animationsEnabled: state.animationsEnabled,
        loginTrustMessage: state.loginTrustMessage,
        hasMultipleEmployees: state.hasMultipleEmployees,
        employeeCount: state.employeeCount,
        employees: state.employees,
        deliverySettings: state.deliverySettings,
        wholesaleSettings: state.wholesaleSettings,
        whatsappAdmin: state.whatsappAdmin,
        claimsEnabled: state.claimsEnabled,
        orderTrackingEnabled: state.orderTrackingEnabled,
        trackingWaTemplate: state.trackingWaTemplate,
        appPromo: state.appPromo,
        developerPhone: state.developerPhone,
        creditsEnabled: state.creditsEnabled,
        couponsEnabled: state.couponsEnabled,
        rolesOperativosEnabled: state.rolesOperativosEnabled,
        tablesEnabled: state.tablesEnabled,
        commercialOptimization: state.commercialOptimization,
      }),
    }
  )
)

export default useAppConfigStore
