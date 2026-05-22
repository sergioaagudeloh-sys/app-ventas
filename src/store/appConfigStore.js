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
      appIcon: null,
      theme: 'rosa-elegante',    // Paleta activa
      isDarkMode: false,         // Toggle light/dark
      adminRegistered: false,    // Bandera para Auth Admin
      whatsappAdmin: '',
      bankInfo: {
        numeroCuenta: '',
        banco: '',
        tipoCuenta: 'ahorros',   // 'ahorros' | 'corriente'
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
        isDarkMode: state.isDarkMode,
        theme: state.theme,
        appFont: state.appFont,
        appRadius: state.appRadius,
        actionColor: state.actionColor,
        animationsEnabled: state.animationsEnabled,
      }),
    }
  )
)

export default useAppConfigStore
