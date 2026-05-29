import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de configuración de la aplicación.
 * Refleja en tiempo real los datos cargados desde Firestore /config/settings.
 * Controla: nombre de la app, tema, modo oscuro, paleta de colores.
 */
const useAppConfigStore = create(
  persist(
    (set) => ({
      // ─── Estado ───────────────────────────────────────────────────────────
      appName: 'Mi Tienda',
      sellerName: 'Vendedor',
      appIcon: null,
      welcomeWavesEnabled: true,
      theme: 'carbon-oscuro',    // Paleta activa por defecto (neutral oscura y elegante antes de sincronizar)
      isDarkMode: false,         // Por defecto claro para evitar forzar el modo oscuro al limpiar caché
      adminRegistered: false,    // Bandera para Auth Admin
      pwaAppName: '',            // Nombre al instalarse como app móvil
      pwaAppIcon: null,          // Icono personalizado de instalación PWA
      pwaUseBrandIcon: false,    // Usar logo de la tienda como ícono PWA (con fondo)
      activeSeasonalEvent: 'none', // Evento estacional activo ('none', 'navidad', 'halloween', 'madre', 'padre')
      whatsappAdmin: '',
      claimsEnabled: false,
      orderTrackingEnabled: false,
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
        titular: '',
        cedulaNit: '',
        qrUrl: '',
      },
      // ─── Apariencia avanzada ───────────────────────────────────────────
      appFont: 'inter',
      appRadius: 'rounded',
      catalogBanner: { type: 'none', value: '' },
      catalogLayout: 'grid2',
      animationsEnabled: true,
      actionColor: '',
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
      isLoaded: false,

      // ─── Acciones ─────────────────────────────────────────────────────────
      /**
       * Actualiza toda la configuración desde Firestore.
       * @param {object} config - Configuración completa de Firestore
       */
      setConfig: (config) => set({ ...config, isLoaded: true }),

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
        developerPhone: state.developerPhone,
        creditsEnabled: state.creditsEnabled,
        couponsEnabled: state.couponsEnabled,
      }),
    }
  )
)

export default useAppConfigStore
