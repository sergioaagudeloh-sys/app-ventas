import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Settings, Database, Trash2, CheckCircle, AlertTriangle, Save, Paintbrush, Smartphone, Building2, Sun, Moon, Link, X, LogOut, Filter, Plus, Lock, Mail, KeyRound, Eye, EyeOff, ChevronRight, ArrowLeft } from 'lucide-react'
import { collection, writeBatch, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { signOut, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { db, auth } from '../../config/firebaseConfig'
import { COLLECTIONS, ORDER_STATES, PAYMENT_METHODS } from '../../constants'
import { updateAppConfig } from '../../services/appConfigService'
import useAppConfigStore from '../../store/appConfigStore'
import useAuthStore from '../../store/authStore'
import { ADVANCED_PALETTES, getActiveColors } from '../../constants/palettes'

// ─── DATOS FICTICIOS (SEEDS) ──────────────────────────────────────────────
const SEED_CATEGORIES = [
  { id: 'cat-camisetas', nombre: 'Camisetas', descripcion: 'Camisetas de algodón' },
  { id: 'cat-pantalones', nombre: 'Pantalones', descripcion: 'Pantalones y jeans' },
  { id: 'cat-accesorios', nombre: 'Accesorios', descripcion: 'Gorras, relojes, etc' }
]

const SEED_PRODUCTS = [
  {
    id: 'prod-1',
    nombre: 'Camiseta Básica Negra',
    descripcion: 'Camiseta de algodón peinado 100%. Ajuste perfecto.',
    categoria: 'Camisetas',
    precioBase: 45000,
    costoBase: 20000,
    genero: 'unisex',
    activo: true,
    destacado: true,
    imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop',
    variantes: [
      { id: 'v1', talla: 'M', color: 'Negro', stock: 15, sku: 'TS-BLK-M' },
      { id: 'v2', talla: 'L', color: 'Negro', stock: 5, sku: 'TS-BLK-L' }
    ]
  },
  {
    id: 'prod-2',
    nombre: 'Pantalón Cargo Urbano',
    descripcion: 'Pantalón con múltiples bolsillos, ideal para el día a día.',
    categoria: 'Pantalones',
    precioBase: 120000,
    costoBase: 60000,
    genero: 'hombre',
    activo: true,
    destacado: false,
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
    variantes: [
      { id: 'v3', talla: '32', color: 'Verde Oliva', stock: 8, sku: 'PN-GRN-32' },
      { id: 'v4', talla: '34', color: 'Verde Oliva', stock: 12, sku: 'PN-GRN-34' }
    ]
  },
  {
    id: 'prod-3',
    nombre: 'Gorra Clásica Vintage',
    descripcion: 'Gorra con diseño retro y correa ajustable.',
    categoria: 'Accesorios',
    precioBase: 35000,
    costoBase: 15000,
    genero: 'unisex',
    activo: true,
    destacado: true,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop',
    variantes: [
      { id: 'v5', talla: 'Única', color: 'Azul Marino', stock: 20, sku: 'CP-BLU-U' }
    ]
  }
]

const SEED_USERS = [
  { id: '3001234567', celular: '3001234567', nombre: 'Juan Pérez' },
  { id: '3109876543', celular: '3109876543', nombre: 'María Gómez' }
]

const SEED_ORDERS = [
  {
    id: 'ord-1',
    orderNumber: 'PED-1001',
    cliente: { celular: '3001234567', nombre: 'Juan Pérez' },
    items: [
      { productId: 'prod-1', variantId: 'v1', nombre: 'Camiseta Básica Negra', talla: 'M', color: 'Negro', cantidad: 2, precio: 45000 }
    ],
    total: 90000,
    estado: ORDER_STATES.PENDING,
    metodoPago: PAYMENT_METHODS.CASH
  },
  {
    id: 'ord-2',
    orderNumber: 'PED-1002',
    cliente: { celular: '3109876543', nombre: 'María Gómez' },
    items: [
      { productId: 'prod-2', variantId: 'v4', nombre: 'Pantalón Cargo Urbano', talla: '34', color: 'Verde Oliva', cantidad: 1, precio: 120000 },
      { productId: 'prod-3', variantId: 'v5', nombre: 'Gorra Clásica Vintage', talla: 'Única', color: 'Azul Marino', cantidad: 1, precio: 35000 }
    ],
    total: 155000,
    estado: ORDER_STATES.COMPLETED,
    metodoPago: PAYMENT_METHODS.TRANSFER
  }
]

// ─── COMPONENTE ────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const config = useAppConfigStore()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  
  // States para Developer Zone
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Navegación de secciones (null = menú principal)
  const [activeSection, setActiveSection] = useState(null)

  // States para Configuración del Negocio
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // States para Seguridad (Cambio de credenciales)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState(null)
  
  // Estado del Modal de Tema
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    appName: '',
    sellerName: '',
    appIcon: '',
    theme: 'modern-purple',
    whatsappAdmin: '',
    bankInfo: {
      banco: '',
      tipoCuenta: 'ahorros',
      numeroCuenta: '',
      titular: '',
      cedulaNit: ''
    },
    catalogFilters: {
      categories: true,
      sizes: true,
      colors: true,
      customAttributes: []
    },
    appFont: 'inter',
    appRadius: 'rounded',
    catalogBanner: { type: 'none', value: '' },
    catalogLayout: 'grid2',
    animationsEnabled: true,
    guidedModeEnabled: true,
    actionColor: '',
  })

  // Sincronizar store local con formulario al cargar
  useEffect(() => {
    if (config.isLoaded) {
      setFormData({
        appName: config.appName || '',
        sellerName: config.sellerName || '',
        appIcon: config.appIcon || '',
        theme: config.theme || 'modern-purple',
        whatsappAdmin: config.whatsappAdmin || '',
        bankInfo: {
          banco: config.bankInfo?.banco || '',
          tipoCuenta: config.bankInfo?.tipoCuenta || 'ahorros',
          numeroCuenta: config.bankInfo?.numeroCuenta || '',
          titular: config.bankInfo?.titular || '',
          cedulaNit: config.bankInfo?.cedulaNit || ''
        },
        catalogFilters: config.catalogFilters || {
          categories: true,
          sizes: true,
          colors: true,
          customAttributes: []
        },
        appFont: config.appFont || 'inter',
        appRadius: config.appRadius || 'rounded',
        catalogBanner: config.catalogBanner || { type: 'none', value: '' },
        catalogLayout: config.catalogLayout || 'grid2',
        animationsEnabled: config.animationsEnabled ?? true,
        guidedModeEnabled: config.guidedModeEnabled ?? true,
        actionColor: config.actionColor || '',
      })
    }
  }, [
    config.isLoaded, 
    config.appName,
    config.sellerName,
    config.appIcon, 
    config.theme, 
    config.whatsappAdmin, 
    config.bankInfo, 
    config.catalogFilters,
    config.appFont,
    config.appRadius,
    config.catalogBanner,
    config.catalogLayout,
    config.animationsEnabled,
    config.guidedModeEnabled,
    config.actionColor
  ])

  // Efecto para preview en tiempo real de la paleta
  useEffect(() => {
    // Si formData.theme aún no está listo, no hacer nada
    if (!formData.theme) return

    const root = document.documentElement
    const activeColors = getActiveColors(formData.theme, config.isDarkMode)
    
    Object.entries(activeColors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    return () => {
      // Al desmontar, restaurar el tema oficial guardado
      const originalColors = getActiveColors(config.theme, config.isDarkMode)
      Object.entries(originalColors).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
    }
  }, [formData.theme, config.isDarkMode, config.theme])

  // Guardar configuración en Firebase
  const handleSaveConfig = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      await updateAppConfig(formData)
      setSaveMessage({ type: 'success', text: 'Configuraciones guardadas y aplicadas a toda la aplicación.' })
      setTimeout(() => setSaveMessage(null), 4000)
    } catch (error) {
      console.error(error)
      setSaveMessage({ type: 'error', text: 'Ocurrió un error al guardar las configuraciones.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Cerrar Sesión
  const handleLogout = async () => {
    try {
      await signOut(auth)
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Actualizar Credenciales de Administrador
  const handleUpdateCredentials = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      setAuthMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual por seguridad.' })
      return
    }
    if (!newEmail && !newPassword) {
      setAuthMessage({ type: 'error', text: 'Ingresa un nuevo correo o contraseña para actualizar.' })
      return
    }

    setAuthLoading(true)
    setAuthMessage(null)

    try {
      const user = auth.currentUser
      if (!user) throw new Error('No hay sesión activa.')

      // 1. Re-autenticar (requerimiento estricto de Firebase para operaciones sensibles)
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // 2. Actualizar Email
      if (newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail)
      }

      // 3. Actualizar Contraseña
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('La nueva contraseña debe tener al menos 6 caracteres.')
        }
        await updatePassword(user, newPassword)
      }

      setAuthMessage({ type: 'success', text: 'Credenciales actualizadas exitosamente.' })
      setCurrentPassword('')
      setNewPassword('')
      // setNewEmail(''); // Opcional, mantenemos el email para que vea el cambio
      
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthMessage({ type: 'error', text: 'La contraseña actual es incorrecta.' })
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthMessage({ type: 'error', text: 'El nuevo correo ya está registrado.' })
      } else if (err.code === 'auth/invalid-email') {
        setAuthMessage({ type: 'error', text: 'El formato del nuevo correo es inválido.' })
      } else {
        setAuthMessage({ type: 'error', text: err.message || 'Error al actualizar credenciales.' })
      }
    } finally {
      setAuthLoading(false)
    }
  }

  // Activar modo personalizado
  const toggleCustomMode = () => {
    if (typeof formData.theme === 'object') {
      // Volver a predefinida
      setFormData({ ...formData, theme: 'modern-purple' })
    } else {
      // Convertir a objeto personalizado basado en el actual
      const basePalette = ADVANCED_PALETTES[formData.theme] || ADVANCED_PALETTES['modern-purple']
      setFormData({
        ...formData,
        theme: {
          light: { ...basePalette.light },
          dark: { ...basePalette.dark }
        }
      })
    }
  }

  // Manejar cambio en color personalizado
  const handleCustomColorChange = (key, value) => {
    const mode = config.isDarkMode ? 'dark' : 'light'
    setFormData({
      ...formData,
      theme: {
        ...formData.theme,
        [mode]: { ...formData.theme[mode], [key]: value }
      }
    })
  }

  // Custom Attributes Handlers
  const handleAddCustomAttribute = () => {
    const current = formData.catalogFilters.customAttributes || []
    setFormData({
      ...formData,
      catalogFilters: {
        ...formData.catalogFilters,
        customAttributes: [...current, { id: 'attr-' + Date.now(), name: '', type: 'text' }]
      }
    })
  }

  const handleCustomAttributeChange = (index, field, value) => {
    const updated = [...(formData.catalogFilters.customAttributes || [])]
    if (field === 'options') {
      // Allow spaces while typing by keeping the raw string in UI state if needed, but for simplicity:
      // In a real app we might want a controlled state, but splitting by comma works for basic usage.
      // Wait, if they type "a, ", they won't see the space. Let's just store the array.
      updated[index].options = value.split(',').map(s => s.trimStart())
    } else {
      updated[index][field] = value
      if (field === 'type' && value === 'select') {
        updated[index].options = []
      }
    }
    setFormData({
      ...formData,
      catalogFilters: { ...formData.catalogFilters, customAttributes: updated }
    })
  }

  const handleRemoveCustomAttribute = (index) => {
    const updated = [...(formData.catalogFilters.customAttributes || [])]
    updated.splice(index, 1)
    setFormData({
      ...formData,
      catalogFilters: { ...formData.catalogFilters, customAttributes: updated }
    })
  }

  // Developer Zone handlers
  const handleInjectData = async () => {
    if (!window.confirm('¿Seguro que quieres inyectar datos de prueba? Esto llenará tu base de datos con productos, pedidos y clientes ficticios.')) return
    
    setLoading(true)
    setMessage('Inyectando datos...')
    
    try {
      const batch = writeBatch(db)

      SEED_CATEGORIES.forEach(cat => {
        const ref = doc(db, COLLECTIONS.CATEGORIES, cat.id)
        batch.set(ref, { ...cat, isSeedData: true, createdAt: serverTimestamp() })
      })

      SEED_PRODUCTS.forEach(prod => {
        const ref = doc(db, COLLECTIONS.PRODUCTS, prod.id)
        batch.set(ref, { ...prod, isSeedData: true, createdAt: serverTimestamp() })
      })

      SEED_USERS.forEach(user => {
        const ref = doc(db, COLLECTIONS.USERS, user.id)
        batch.set(ref, { ...user, isSeedData: true, createdAt: serverTimestamp() })
      })

      SEED_ORDERS.forEach(order => {
        const ref = doc(db, COLLECTIONS.ORDERS, order.id)
        batch.set(ref, { ...order, isSeedData: true, createdAt: serverTimestamp() })
      })

      await batch.commit()
      setMessage({ type: 'success', text: '¡Datos de prueba inyectados correctamente! Ve al Catálogo o a Pedidos para verlos.' })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Error al inyectar datos: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveData = async () => {
    if (!window.confirm('¿Estás SEGURO de eliminar TODOS los datos de prueba? No tocará tus datos reales.')) return
    
    setLoading(true)
    setMessage('Eliminando datos de prueba...')

    try {
      const collectionsToClean = [
        COLLECTIONS.CATEGORIES, 
        COLLECTIONS.PRODUCTS, 
        COLLECTIONS.USERS, 
        COLLECTIONS.ORDERS,
        COLLECTIONS.CREDITS
      ]

      let deletedCount = 0

      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where('isSeedData', '==', true))
        const snapshot = await getDocs(q)
        
        const batches = []
        let currentBatch = writeBatch(db)
        let operationCount = 0

        snapshot.docs.forEach((document) => {
          currentBatch.delete(document.ref)
          deletedCount++
          operationCount++
          
          if (operationCount === 500) {
            batches.push(currentBatch.commit())
            currentBatch = writeBatch(db)
            operationCount = 0
          }
        })

        if (operationCount > 0) {
          batches.push(currentBatch.commit())
        }

        await Promise.all(batches)
      }

      setMessage({ type: 'success', text: `¡Limpieza completada! Se eliminaron ${deletedCount} registros ficticios.` })
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Error al limpiar datos: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  // ─── Definición de secciones del menú ──────────────────────────────────────
  const MENU_SECTIONS = [
    {
      id: 'marca',
      label: 'Identidad de Marca',
      description: 'Nombre de la tienda y logo',
      icon: Building2,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      id: 'apariencia',
      label: 'Apariencia y Colores',
      description: 'Tema, paleta y modo oscuro',
      icon: Paintbrush,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      id: 'ventas',
      label: 'Ventas y Transferencias',
      description: 'WhatsApp y datos bancarios',
      icon: Smartphone,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      id: 'filtros',
      label: 'Filtros del Catálogo',
      description: 'Filtros y atributos de productos',
      icon: Filter,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
    {
      id: 'developer',
      label: 'Herramientas de Pruebas',
      description: 'Datos ficticios y limpieza de BD',
      icon: Database,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      id: 'seguridad',
      label: 'Seguridad y Accesos',
      description: 'Cambiar correo o contraseña',
      icon: Lock,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
  ]

  // ─── Header compartido (Menú o Sección) ────────────────────────────────────
  const activeInfo = MENU_SECTIONS.find(s => s.id === activeSection)

  return (
    <motion.div
      key={activeSection ?? 'menu'}
      initial={{ opacity: 0, x: activeSection ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="p-4 md:p-8 max-w-2xl mx-auto pb-24 overflow-x-hidden relative"
    >
      {/* Toast de guardado */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-6 left-1/2 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 w-[90%] max-w-md border ${
              saveMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-surface text-primary border-primary/30'
            }`}
          >
            {saveMessage.type === 'error' ? <AlertTriangle size={20} className="shrink-0" /> : <CheckCircle size={20} className="shrink-0" />}
            <p className="text-sm font-bold mt-0.5">{saveMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        {activeSection ? (
          <button
            onClick={() => setActiveSection(null)}
            className="w-10 h-10 rounded-2xl bg-surface-2 border border-app flex items-center justify-center text-app hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95 shrink-0"
            aria-label="Volver al menú"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <Settings size={20} className="text-white" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-app">
            {activeSection ? activeInfo?.label : 'Configuración'}
          </h1>
          <p className="text-sm text-muted">
            {activeSection ? activeInfo?.description : 'Ajustes de tu tienda'}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: MENÚ PRINCIPAL ─────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!activeSection && (
        <div className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden">
          {MENU_SECTIONS.map((section, idx) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 active:bg-primary/5 transition-colors text-left ${idx !== MENU_SECTIONS.length - 1 ? 'border-b border-app' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.iconBg}`}>
                  <Icon size={20} className={section.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-app">{section.label}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">{section.description}</p>
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Botón Cerrar Sesión (solo en menú principal) */}
      {!activeSection && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/10 transition-all active:scale-95"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: IDENTIDAD DE MARCA ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'marca' && (
        <div className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-app mb-2">Nombre del Negocio</label>
              <input
                type="text"
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                placeholder="Ej. Mi Tienda Smart"
                className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-app mb-2">Nombre del Vendedor</label>
              <input
                type="text"
                value={formData.sellerName}
                onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                placeholder="Ej. Sergio"
                className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-app mb-2">URL del Logo</label>
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={formData.appIcon}
                    onChange={(e) => setFormData({ ...formData, appIcon: e.target.value })}
                    placeholder="https://ejemplo.com/logo.png"
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                {formData.appIcon && (
                  <div className="w-12 h-12 rounded-xl border border-app bg-surface overflow-hidden shrink-0">
                    <img src={formData.appIcon} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-5 border-t border-app bg-surface-2/30">
            <button
              onClick={async () => {
                try {
                  await updateAppConfig({ appIcon: formData.appIcon, appName: formData.appName, sellerName: formData.sellerName })
                  setSaveMessage({ type: 'success', text: 'Identidad de marca guardada correctamente.' })
                  setTimeout(() => setSaveMessage(null), 3000)
                } catch (e) {
                  setSaveMessage({ type: 'error', text: 'Error al actualizar.' })
                }
              }}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <Save size={18} /> Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: APARIENCIA Y COLORES ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'apariencia' && (
        <div className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col gap-5">
            {/* ── Modo Oscuro ── */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
              <div>
                <p className="text-sm font-bold text-app">Modo Oscuro</p>
                <p className="text-xs text-muted mt-0.5">Cambia entre tema claro y oscuro</p>
              </div>
              <button
                onClick={() => config.toggleDarkMode()}
                className="flex items-center justify-center gap-2 w-14 h-10 rounded-xl border border-app hover:bg-surface transition-colors text-app"
                title={config.isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {config.isDarkMode ? <Sun size={20} className="text-warning"/> : <Moon size={20} className="text-primary"/>}
              </button>
            </div>

            {/* ── Animaciones ── */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
              <div>
                <p className="text-sm font-bold text-app">Animaciones de la App</p>
                <p className="text-xs text-muted mt-0.5">Activar transiciones suaves</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input type="checkbox" className="sr-only peer"
                  checked={formData.animationsEnabled}
                  onChange={(e) => setFormData({ ...formData, animationsEnabled: e.target.checked })} />
                <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>

            {/* ── Sistema de Compra Guiada ── */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
              <div>
                <p className="text-sm font-bold text-app">Sistema de Compra Guiada</p>
                <p className="text-xs text-muted mt-0.5">Asistencia flotante para clientes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input type="checkbox" className="sr-only peer"
                  checked={formData.guidedModeEnabled}
                  onChange={(e) => setFormData({ ...formData, guidedModeEnabled: e.target.checked })} />
                <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>

            {/* ── Tema de Colores ── */}
            <div className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl border border-app">
              <div>
                <p className="text-sm font-bold text-app">Tema Principal</p>
                <p className="text-xs text-muted mt-0.5">
                  Paleta: <span className="font-bold text-primary">{typeof formData.theme === 'object' ? 'Personalizado' : (ADVANCED_PALETTES[formData.theme]?.name || 'Modern Purple')}</span>
                </p>
              </div>
              <button
                onClick={() => setIsThemeModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-app text-surface text-sm font-bold shadow-md active:scale-95 transition-all"
              >
                <Paintbrush size={16} /> Cambiar
              </button>
            </div>

            {/* ── Color de Acción ── */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-app">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-bold text-app">Color de Botones de Compra</p>
                  <p className="text-xs text-muted mt-0.5">Sobrescribe el color primario en el carrito y pago</p>
                </div>
                {formData.actionColor && (
                  <button onClick={() => setFormData({ ...formData, actionColor: '' })} className="text-xs text-primary hover:underline font-medium">Restablecer</button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={formData.actionColor || getActiveColors(formData.theme, config.isDarkMode)['--color-primary']} 
                  onChange={(e) => setFormData({ ...formData, actionColor: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <div className="flex-1 px-4 py-3 text-white font-bold text-center rounded-xl text-sm transition-colors shadow-sm" style={{ backgroundColor: formData.actionColor || getActiveColors(formData.theme, config.isDarkMode)['--color-primary'] }}>
                  Agregar al Carrito
                </div>
              </div>
            </div>

            {/* ── Tipografía ── */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-app">
              <p className="text-sm font-bold text-app mb-1">Tipografía</p>
              <p className="text-xs text-muted mb-3">Fuente principal de toda la aplicación</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['inter', 'poppins', 'outfit', 'nunito', 'playfair', 'roboto'].map((font) => (
                  <button
                    key={font}
                    onClick={() => setFormData({ ...formData, appFont: font })}
                    className={`p-2 rounded-xl border text-sm font-medium transition-all capitalize ${
                      formData.appFont === font ? 'border-primary bg-primary/5 text-primary' : 'border-app bg-surface text-app hover:border-primary/30'
                    }`}
                    style={{ fontFamily: font === 'inter' ? 'Inter' : font === 'poppins' ? 'Poppins' : font === 'outfit' ? 'Outfit' : font === 'nunito' ? 'Nunito' : font === 'playfair' ? 'Playfair Display' : 'Roboto' }}
                  >
                    {font === 'playfair' ? 'Playfair' : font}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Radio de Bordes ── */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-app">
              <p className="text-sm font-bold text-app mb-1">Estilo de Bordes</p>
              <p className="text-xs text-muted mb-3">Redondez de tarjetas de productos</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'squared', label: 'Cuadrado', radius: '4px' },
                  { id: 'rounded', label: 'Suave', radius: '12px' },
                  { id: 'pill', label: 'Redondo', radius: '32px' }
                ].map((border) => (
                  <button
                    key={border.id}
                    onClick={() => setFormData({ ...formData, appRadius: border.id })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      formData.appRadius === border.id ? 'border-primary bg-primary/5' : 'border-app bg-surface hover:border-primary/30'
                    }`}
                  >
                    <div className="w-full h-8 border-2 border-primary/40 bg-surface-2" style={{ borderRadius: border.radius }} />
                    <span className={`text-xs font-semibold ${formData.appRadius === border.id ? 'text-primary' : 'text-muted'}`}>{border.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Modo de Vista del Catálogo ── */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-app">
              <p className="text-sm font-bold text-app mb-1">Diseño del Catálogo</p>
              <p className="text-xs text-muted mb-3">Columnas en la vista del cliente</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'list', label: 'Lista' },
                  { id: 'grid2', label: '2 Columnas' },
                  { id: 'grid3', label: '3 Columnas' }
                ].map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setFormData({ ...formData, catalogLayout: layout.id })}
                    className={`py-2 px-1 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${
                      formData.catalogLayout === layout.id ? 'border-primary bg-primary/5 text-primary' : 'border-app bg-surface text-muted hover:border-primary/30'
                    }`}
                  >
                    <div className="flex gap-1 h-5">
                      {layout.id === 'list' && <div className="w-10 h-full bg-current rounded-sm opacity-50" />}
                      {layout.id === 'grid2' && <><div className="w-4 h-full bg-current rounded-sm opacity-50"/><div className="w-4 h-full bg-current rounded-sm opacity-50"/></>}
                      {layout.id === 'grid3' && <><div className="w-3 h-full bg-current rounded-sm opacity-50"/><div className="w-3 h-full bg-current rounded-sm opacity-50"/><div className="w-3 h-full bg-current rounded-sm opacity-50"/></>}
                    </div>
                    <span className="text-xs font-semibold">{layout.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Banner del Catálogo ── */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-app">
              <p className="text-sm font-bold text-app mb-1">Banner Principal</p>
              <p className="text-xs text-muted mb-3">Cabecera en la tienda del cliente</p>
              
              <div className="flex bg-surface border border-app rounded-lg overflow-hidden h-9 mb-4">
                <button 
                  onClick={() => setFormData({ ...formData, catalogBanner: { ...formData.catalogBanner, type: 'none' } })}
                  className={`flex-1 text-xs font-bold transition-colors ${formData.catalogBanner.type === 'none' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}
                >Oculto</button>
                <div className="w-px bg-app opacity-20"></div>
                <button 
                  onClick={() => setFormData({ ...formData, catalogBanner: { ...formData.catalogBanner, type: 'gradient' } })}
                  className={`flex-1 text-xs font-bold transition-colors ${formData.catalogBanner.type === 'gradient' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}
                >Degradado</button>
                <div className="w-px bg-app opacity-20"></div>
                <button 
                  onClick={() => setFormData({ ...formData, catalogBanner: { ...formData.catalogBanner, type: 'image' } })}
                  className={`flex-1 text-xs font-bold transition-colors ${formData.catalogBanner.type === 'image' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}
                >Imagen</button>
              </div>

              {formData.catalogBanner.type === 'image' && (
                <div className="mt-3">
                  <input 
                    type="url" 
                    placeholder="URL de la imagen (https://...)" 
                    value={formData.catalogBanner.value}
                    onChange={(e) => setFormData({ ...formData, catalogBanner: { ...formData.catalogBanner, value: e.target.value } })}
                    className="w-full h-11 px-3 rounded-xl bg-surface border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" 
                  />
                  {formData.catalogBanner.value && (
                    <div className="mt-3 w-full h-24 rounded-xl border border-app overflow-hidden bg-surface flex items-center justify-center">
                      <img src={formData.catalogBanner.value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
          
          {/* Botón Guardar */}
          <div className="p-5 sm:p-6 border-t border-app bg-surface-2/30">
            <button onClick={handleSaveConfig} disabled={isSaving}
              className="w-full min-h-[52px] py-3 px-6 bg-primary text-white rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-3 shadow-lg shadow-primary/30 disabled:opacity-50">
              {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={20} className="shrink-0" /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: VENTAS Y TRANSFERENCIAS ────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'ventas' && (
        <div className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                WhatsApp para Pedidos
                <span className="text-xs font-normal text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-app">Sin el "+"</span>
              </label>
              <input
                type="tel"
                value={formData.whatsappAdmin}
                onChange={(e) => setFormData({ ...formData, whatsappAdmin: e.target.value })}
                placeholder="Ej. 573001234567"
                className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="pt-4 border-t border-app">
              <h3 className="font-bold text-app mb-4 text-sm uppercase tracking-wider">Datos de Cuenta Bancaria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">Entidad Bancaria</label>
                  <input type="text" value={formData.bankInfo.banco}
                    onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, banco: e.target.value } })}
                    placeholder="Ej. Bancolombia, Nequi..."
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">Tipo de Cuenta</label>
                  <select value={formData.bankInfo.tipoCuenta}
                    onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, tipoCuenta: e.target.value } })}
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors">
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                    <option value="digital">Billetera Digital</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-muted mb-1.5">Número de Cuenta</label>
                  <input type="text" value={formData.bankInfo.numeroCuenta}
                    onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, numeroCuenta: e.target.value } })}
                    placeholder="Ej. 123-456789-00"
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">Titular</label>
                  <input type="text" value={formData.bankInfo.titular}
                    onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, titular: e.target.value } })}
                    placeholder="Nombre de quien recibe"
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">Cédula / NIT (Opcional)</label>
                  <input type="text" value={formData.bankInfo.cedulaNit}
                    onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, cedulaNit: e.target.value } })}
                    placeholder="Ej. 1234567890"
                    className="w-full h-11 px-4 rounded-xl bg-surface-2 border border-app text-sm text-app focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6 border-t border-app bg-surface-2/30">
            <button onClick={handleSaveConfig} disabled={isSaving}
              className="w-full min-h-[52px] py-3 px-6 bg-primary text-white rounded-xl font-bold text-sm transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-3 shadow-lg shadow-primary/30 disabled:opacity-50">
              {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={20} className="shrink-0" /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: FILTROS DEL CATÁLOGO ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'filtros' && (
        <div className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6">
            {formData.catalogFilters && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'categories', label: 'Categorías', desc: 'Permite filtrar por categorías en el inicio.' },
                    { key: 'sizes', label: 'Tallas', desc: 'Se asignan por cada variante de producto.' },
                    { key: 'colors', label: 'Colores', desc: 'Selector de color por variante.' }
                  ].map(filterObj => (
                    <div key={filterObj.key} className="flex items-start gap-3 p-4 rounded-xl border border-app bg-surface-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-app">{filterObj.label}</h3>
                        <p className="text-xs text-muted mt-1">{filterObj.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input type="checkbox" className="sr-only peer"
                          checked={formData.catalogFilters[filterObj.key]}
                          onChange={(e) => setFormData({ ...formData, catalogFilters: { ...formData.catalogFilters, [filterObj.key]: e.target.checked } })} />
                        <div className="w-11 h-6 bg-app/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-app pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-app">Atributos Personalizados</h3>
                      <p className="text-xs text-muted">Crea campos extra para tus productos (Ej: Sabor, Marca).</p>
                    </div>
                    <button type="button" onClick={handleAddCustomAttribute}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors">
                      <Plus size={16} /> Añadir
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.catalogFilters.customAttributes?.map((attr, index) => (
                      <div key={attr.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 bg-surface-2 border border-app rounded-xl">
                        <div className="flex-1 w-full">
                          <input type="text" placeholder="Nombre (Ej. Marca)" value={attr.name}
                            onChange={(e) => handleCustomAttributeChange(index, 'name', e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-sm focus:border-primary outline-none" />
                        </div>
                        <div className="w-full sm:w-auto flex bg-surface border border-app rounded-lg overflow-hidden h-10 shrink-0">
                          <button type="button" onClick={() => handleCustomAttributeChange(index, 'type', 'text')}
                            className={`flex-1 px-3 text-xs font-bold transition-colors ${attr.type === 'text' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}>Texto</button>
                          <div className="w-px bg-app opacity-20"></div>
                          <button type="button" onClick={() => handleCustomAttributeChange(index, 'type', 'select')}
                            className={`flex-1 px-3 text-xs font-bold transition-colors ${attr.type === 'select' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-2'}`}>Opciones</button>
                        </div>
                        {attr.type === 'select' && (
                          <div className="flex-[1.5] w-full">
                            <input type="text" placeholder="Opciones (Ej: Nike, Adidas)"
                              value={attr.options ? attr.options.join(', ') : ''}
                              onChange={(e) => handleCustomAttributeChange(index, 'options', e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-app bg-surface text-sm focus:border-primary outline-none" />
                            <p className="text-[10px] text-muted mt-1 px-1">Separa las opciones con comas.</p>
                          </div>
                        )}
                        <button onClick={() => handleRemoveCustomAttribute(index)}
                          className="w-full sm:w-10 h-10 flex items-center justify-center shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-colors">
                          <Trash2 size={16} /> <span className="sm:hidden text-sm ml-2">Eliminar</span>
                        </button>
                      </div>
                    ))}
                    {(!formData.catalogFilters.customAttributes || formData.catalogFilters.customAttributes.length === 0) && (
                      <div className="text-center py-6 text-muted text-sm border border-dashed border-app rounded-xl">
                        No has creado ningún atributo personalizado aún.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-5 border-t border-app bg-surface">
            <button onClick={handleSaveConfig} disabled={isSaving}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
              <Save size={18} /> Guardar Filtros
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: HERRAMIENTAS DE PRUEBAS ────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'developer' && (
        <div className="bg-surface rounded-3xl border border-red-500/20 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-red-500/10 bg-red-500/5">
            <p className="text-sm text-app/70">Usa estas herramientas para probar la aplicación con datos falsos de forma segura.</p>
          </div>
          <div className="p-5 sm:p-6">
            {message && (
              <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-success/10 text-success'}`}>
                {message.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                <p className="text-sm font-bold mt-0.5">{message.text}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-2 rounded-2xl p-5 border border-app">
                <h3 className="font-bold text-app mb-2">1. Llenar con datos ficticios</h3>
                <button onClick={handleInjectData} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 h-11 bg-app text-surface rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                  <Database size={16} /> Inyectar Datos Semilla
                </button>
              </div>
              <div className="bg-surface-2 rounded-2xl p-5 border border-red-500/10">
                <h3 className="font-bold text-red-500 mb-2">2. Limpiar base de datos</h3>
                <button onClick={handleRemoveData} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 h-11 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all disabled:opacity-50">
                  <Trash2 size={16} /> Remover Datos Ficticios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── VISTA: SEGURIDAD Y ACCESOS ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'seguridad' && (
        <div className="bg-surface rounded-3xl border border-app shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 bg-surface-2">
            <div className="bg-surface border border-orange-500/20 rounded-2xl p-5 md:p-6">
              <form onSubmit={handleUpdateCredentials} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                    <KeyRound size={16} className="text-orange-500" />
                    Contraseña Actual (Requerida por seguridad)
                  </label>
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Tu contraseña actual"
                      className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-orange-500 transition-colors" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="border-t border-app"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                      <Mail size={16} className="text-primary" /> Nuevo Correo (Opcional)
                    </label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={auth.currentUser?.email || "correo@ejemplo.com"}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-app mb-2 flex items-center gap-2">
                      <Lock size={16} className="text-primary" /> Nueva Contraseña (Opcional)
                    </label>
                    <div className="relative">
                      <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                        className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                {authMessage && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 border ${authMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                    {authMessage.type === 'error' ? <AlertTriangle size={20} className="shrink-0" /> : <CheckCircle size={20} className="shrink-0" />}
                    <p className="text-sm font-bold mt-0.5">{authMessage.text}</p>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={authLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
                    {authLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={18} /> Actualizar Credenciales</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* ─── MODAL DEL SELECTOR DE TEMAS ──────────────────────────────────────── */}
      <AnimatePresence>
        {isThemeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-3xl border border-app shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-app bg-surface flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-app flex items-center gap-2">
                  <Paintbrush size={20} className="text-primary" />
                  Selector de Tema Inteligente
                </h3>
                <button
                  onClick={() => setIsThemeModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted">Selecciona una paleta predefinida o crea tu propia combinación exacta.</p>
                  <button 
                    onClick={toggleCustomMode}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors shrink-0 ${typeof formData.theme === 'object' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-2 border-app text-app hover:bg-app hover:text-surface'}`}
                  >
                    {typeof formData.theme === 'object' ? 'Volver a Predefinidas' : 'Crear Personalizado'}
                  </button>
                </div>

                {typeof formData.theme === 'object' ? (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-surface-2 rounded-2xl border border-app shadow-inner">
                     <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-surface border border-app">
                       {config.isDarkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-warning" />}
                       <p className="text-sm font-medium text-app">
                         Estás editando la paleta para el modo <strong className="text-primary">{config.isDarkMode ? 'Oscuro' : 'Claro'}</strong>.
                       </p>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                     {Object.entries(config.isDarkMode ? formData.theme.dark : formData.theme.light).map(([key, val]) => (
                        <div key={key} className="flex flex-col">
                          <label className="block text-xs font-bold text-app mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                          <div className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-app shadow-sm">
                            <input 
                              type="color" 
                              value={val} 
                              onChange={(e) => handleCustomColorChange(key, e.target.value)}
                              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 shadow-inner"
                            />
                            <span className="text-sm font-mono font-medium text-muted uppercase">{val}</span>
                          </div>
                        </div>
                     ))}
                     </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(ADVANCED_PALETTES).map((palette) => {
                      const isSelected = formData.theme === palette.id;
                      const colors = config.isDarkMode ? palette.dark : palette.light;
                      
                      return (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={palette.id}
                          onClick={() => setFormData({ ...formData, theme: palette.id })}
                          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-32 ${
                            isSelected 
                              ? 'border-primary shadow-[0_0_20px_rgba(var(--color-primary),0.15)] ring-2 ring-primary/20' 
                              : 'border-app hover:border-primary/50'
                          }`}
                          style={{ backgroundColor: colors.surface }}
                        >
                          {isSelected && (
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
                          )}
                          <span className="block text-base font-bold" style={{ color: colors.text }}>{palette.name}</span>
                          <div className="flex gap-2.5 mt-auto">
                            <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: colors.primary }} />
                            <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: colors.secondary }} />
                            <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: colors.accent }} />
                            <div className="w-8 h-8 rounded-full shadow-sm border-2" style={{ backgroundColor: colors.bg, borderColor: colors.border }} />
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-5 border-t border-app bg-surface flex justify-end shrink-0">
                <button
                  onClick={() => setIsThemeModalOpen(false)}
                  className="px-8 py-3 bg-app text-surface rounded-xl font-bold transition-all hover:opacity-90 active:scale-95 shadow-md flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Confirmar y Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
