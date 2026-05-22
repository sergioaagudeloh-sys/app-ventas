import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebaseConfig'
import useAuthStore from '../store/authStore'
import { ROLES } from '../constants'

/**
 * Hook para inicializar la autenticación de la aplicación.
 * Maneja la lógica híbrida:
 * 1. Clientes: Viven en LocalStorage (hidratación de Zustand).
 * 2. Administradores: Viven en Firebase Auth.
 */
export default function useAuthInit() {
  const { role, setAdmin, setLoading, logout } = useAuthStore()

  useEffect(() => {
    // 1. Si el LocalStorage ya hidrató un Cliente, apagamos el spinner de inmediato.
    if (role === ROLES.CLIENT) {
      setLoading(false)
    }

    // 2. Escuchamos cambios en Firebase Auth (para el Administrador)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Hay un administrador autenticado en Firebase
        setAdmin(firebaseUser) // setAdmin pone isLoading en false automáticamente
      } else {
        // Firebase dice que no hay nadie autenticado.
        // Si nuestro rol era ADMIN, cerramos su sesión local.
        const currentRole = useAuthStore.getState().role
        if (currentRole === ROLES.ADMIN) {
          logout()
        }
        // En cualquier caso, si no hay firebaseUser, apagamos el spinner
        // para que la app fluya (redirija al login o deje pasar al cliente).
        useAuthStore.getState().setLoading(false)
      }
    })

    return () => unsubscribe()
  }, []) // Solo se ejecuta una vez al montar la App
}
