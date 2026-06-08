import { create } from 'zustand'

export const useConnectivityStore = create((set) => {
  // Inicializar con el estado de red del navegador si está disponible
  const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  return {
    isOnline: initialOnline,
    setOnline: (status) => set({ isOnline: status }),
  }
})

// Inicializar listeners globales
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useConnectivityStore.getState().setOnline(true)
  })

  window.addEventListener('offline', () => {
    useConnectivityStore.getState().setOnline(false)
  })
}
