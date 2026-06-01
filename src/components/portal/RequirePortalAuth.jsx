import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import usePortalStore from '../../store/portalStore'
import useAppConfigStore from '../../store/appConfigStore'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../config/firebaseConfig'

/**
 * Guard para rutas del portal operativo.
 * Si no hay empleado autenticado, o si está deshabilitado, redirige a /portal/auth.
 */
export default function RequirePortalAuth({ children, allowedRole }) {
  const { portalEmployee, clearPortalEmployee } = usePortalStore()
  const { hasMultipleEmployees } = useAppConfigStore()
  const [isValid, setIsValid] = useState(true)
  const [checking, setChecking] = useState(true)

  // 1. Validar switch global
  if (!hasMultipleEmployees) {
    if (portalEmployee) {
      clearPortalEmployee()
    }
    return <Navigate to="/portal/auth" replace />
  }

  // 2. Validar sesión local
  if (!portalEmployee) {
    return <Navigate to="/portal/auth" replace />
  }

  if (allowedRole && portalEmployee.rol !== allowedRole) {
    return <Navigate to="/portal/auth" replace />
  }

  // 3. Suscribirse al documento del empleado en Firestore en tiempo real para validar estado activo y que no esté deshabilitado
  useEffect(() => {
    if (!portalEmployee?.id) {
      setChecking(false)
      return
    }

    const empRef = doc(db, 'employees', portalEmployee.id)
    const unsubscribe = onSnapshot(empRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Empleado fue eliminado de la BD
        clearPortalEmployee()
        setIsValid(false)
      } else {
        const empData = snapshot.data()
        // Validamos tanto 'activo !== false' como 'estado === activo' si existe el campo
        const isNotActivoBool = empData.activo === false
        const isNotActivoString = empData.estado && empData.estado !== 'activo'
        
        // Validamos si el rol en Firestore cambió respecto a la sesión activa local
        const isRoleChanged = empData.rol && empData.rol !== portalEmployee.rol
        
        if (isNotActivoBool || isNotActivoString || isRoleChanged) {
          // Empleado deshabilitado o con rol modificado
          clearPortalEmployee()
          setIsValid(false)
        }
      }
      setChecking(false)
    }, (error) => {
      console.error("Error validando empleado:", error)
      setChecking(false)
    })

    return () => unsubscribe()
  }, [portalEmployee?.id, clearPortalEmployee])

  if (checking) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
        <p className="text-sm font-bold text-muted animate-pulse">Verificando credenciales...</p>
      </div>
    )
  }

  if (!isValid) {
    return <Navigate to="/portal/auth" replace />
  }

  return children
}
