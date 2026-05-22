import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ROLES } from '../constants'

/**
 * Store de autenticación global.
 * Maneja el estado del usuario actual (admin o cliente).
 * Persiste en localStorage para mantener sesión activa.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      // ─── Estado ───────────────────────────────────────────────────────────
      user: null,         // Objeto usuario actual
      role: null,         // 'admin' | 'client'
      isLoading: true,    // Cargando estado inicial de auth

      // ─── Acciones ─────────────────────────────────────────────────────────
      /**
       * Establece el usuario administrador autenticado con Google.
       * @param {object} firebaseUser - Objeto de usuario de Firebase Auth
       */
      setAdmin: (firebaseUser) => set({
        user: firebaseUser,
        role: ROLES.ADMIN,
        isLoading: false,
      }),

      /**
       * Establece el usuario cliente autenticado con celular + nombre.
       * @param {object} clientData - { nombre, celular }
       */
      setClient: (clientData) => set({
        user: clientData,
        role: ROLES.CLIENT,
        isLoading: false,
      }),

      /**
       * Actualiza datos parciales del cliente autenticado.
       * @param {object} partialData - Campos a actualizar
       */
      updateClient: (partialData) => set((state) => ({
        user: state.role === ROLES.CLIENT && state.user ? { ...state.user, ...partialData } : state.user
      })),

      /**
       * Cierra la sesión del usuario actual.
       */
      logout: () => set({
        user: null,
        role: null,
        isLoading: false,
      }),

      setLoading: (value) => set({ isLoading: value }),
    }),
    {
      name: 'auth-storage',
      // Solo persistir datos del cliente (el admin usa Firebase Auth)
      partialize: (state) => ({
        user: state.role === ROLES.CLIENT ? state.user : null,
        role: state.role === ROLES.CLIENT ? state.role : null,
      }),
    }
  )
)

export default useAuthStore
