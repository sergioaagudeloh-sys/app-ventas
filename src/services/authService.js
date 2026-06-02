import { signOut, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../config/firebaseConfig'

/**
 * Cierra la sesión del administrador en Firebase Auth.
 */
export async function signOutAdmin() {
  await signOut(auth)
}

/**
 * Actualiza el email y/o contraseña del administrador autenticado.
 * Requiere re-autenticación con la contraseña actual antes de operar.
 * @param {object} params
 * @param {string} params.currentPassword - Contraseña actual (obligatorio)
 * @param {string} [params.newEmail] - Nuevo email (opcional)
 * @param {string} [params.newPassword] - Nueva contraseña (opcional, mínimo 6 chars)
 */
export async function updateAdminCredentials({ currentPassword, newEmail, newPassword }) {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión activa.')

  // Re-autenticar (requerimiento estricto de Firebase para operaciones sensibles)
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)

  // Actualizar Email (solo si es distinto al actual)
  if (newEmail && newEmail !== user.email) {
    await updateEmail(user, newEmail)
  }

  // Actualizar Contraseña
  if (newPassword) {
    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.')
    }
    await updatePassword(user, newPassword)
  }
}
