import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store del Sistema de Compra Guiada Inteligente.
 * Registra qué pasos ya aprendió el usuario para no repetir ayudas innecesariamente.
 * Controla el Modo Asistencia (activado/desactivado).
 */
const useGuidedStore = create(
  persist(
    (set, get) => ({
      // ─── Estado ───────────────────────────────────────────────────────────
      isAssistanceMode: false,   // Toggle del Modo Asistencia
      completedSteps: {},        // { 'catalog': true, 'cart': true, ... }
      orderCount: 0,             // Número de pedidos realizados por el usuario

      // ─── Acciones Básicas ──────────────────────────────────────────────────
      toggleAssistance: () => set((state) => ({
        isAssistanceMode: !state.isAssistanceMode,
      })),

      enableAssistance: () => set({ isAssistanceMode: true }),
      disableAssistance: () => set({ isAssistanceMode: false }),

      resetProgress: () => set({ completedSteps: {}, orderCount: 0 }),

      // ─── Acciones de Seguimiento ──────────────────────────────────────────
      /**
       * Marca un paso como aprendido para no repetir la ayuda.
       * @param {string} step - Nombre del paso (ej: 'welcome', 'catalog', 'cart', 'payment')
       */
      markStepCompleted: (step) => set((state) => ({
        completedSteps: { ...state.completedSteps, [step]: true },
      })),

      incrementOrderCount: () => set((state) => ({
        orderCount: state.orderCount + 1,
      })),

      // ─── Lógica Inteligente ────────────────────────────────────────────────
      /**
       * Si el usuario ya realizó varios pedidos, se considera experto y 
       * se reducen automáticamente las ayudas de primer nivel.
       * @returns {boolean}
       */
      isExperiencedUser: () => get().orderCount >= 2,

      /**
       * Verifica de forma inteligente si un hint debe mostrarse.
       * Se muestra SI el Modo Asistencia está encendido Y el paso NO ha sido completado.
       * @param {string} stepId
       * @returns {boolean}
       */
      shouldShowHint: (stepId) => {
        const state = get()
        if (!state.isAssistanceMode) return false
        
        // Excepción: Hay pasos que se completan siempre si es experimentado
        if (state.isExperiencedUser() && !['payment_inactivity', 'checkout_confirm'].includes(stepId)) {
          return false
        }
        
        return !state.completedSteps[stepId]
      }
    }),
    { name: 'guided-storage' }
  )
)

export default useGuidedStore
