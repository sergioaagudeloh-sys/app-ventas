import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store de la sesión operativa de un empleado.
 * Completamente independiente del authStore de Firebase.
 * Se llena cuando un empleado se autentica por PIN en /portal/auth.
 */
const usePortalStore = create(
  persist(
    (set) => ({
      // Empleado activo en el portal
      portalEmployee: null,
      // ID del documento de accessLogs para cerrar la sesión al hacer logout
      currentLogId: null,

      setPortalEmployee: (employee, logId = null) =>
        set({ portalEmployee: employee, currentLogId: logId }),

      clearPortalEmployee: () =>
        set({ portalEmployee: null, currentLogId: null }),
    }),
    {
      name: 'portal-session',
      partialize: (state) => ({
        portalEmployee: state.portalEmployee,
        currentLogId: state.currentLogId,
      }),
    }
  )
)

export default usePortalStore

