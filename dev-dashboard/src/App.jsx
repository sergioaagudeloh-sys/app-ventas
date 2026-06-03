import React, { useEffect, useState } from 'react'
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  RefreshCw, 
  Search,
  Layers,
  Database,
  Lock,
  Unlock,
  LogOut,
  Mail,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'

// Variables de entorno para conectar al Firebase Central de Control
const CENTRAL_CONFIG = {
  apiKey: import.meta.env.VITE_DEVELOPER_CENTRAL_API_KEY || "",
  authDomain: import.meta.env.VITE_DEVELOPER_CENTRAL_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_DEVELOPER_CENTRAL_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_DEVELOPER_CENTRAL_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_DEVELOPER_CENTRAL_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_DEVELOPER_CENTRAL_APP_ID || ""
}

const CLIENT_ID = import.meta.env.VITE_DEVELOPER_CLIENT_ID || "ventas-smartfix"
const DEV_TOKEN = import.meta.env.VITE_DEVELOPER_TELEMETRY_TOKEN || "test-token"

export default function App() {
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSimulated, setIsSimulated] = useState(false)
  const [dbStatus, setDbStatus] = useState('conectando')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Campos de formulario login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Obtener Firebase Central
  const getCentralApp = () => {
    if (!CENTRAL_CONFIG.apiKey || !CENTRAL_CONFIG.projectId) {
      return null
    }
    const appName = "centralDevApp"
    try {
      if (getApps().some(app => app.name === appName)) {
        return getApp(appName)
      } else {
        return initializeApp(CENTRAL_CONFIG, appName)
      }
    } catch (err) {
      console.error("Error inicializando Firebase Central:", err)
      return null
    }
  }

  // Auth y Firebase Listeners
  useEffect(() => {
    const centralApp = getCentralApp()
    if (!centralApp) {
      loadSimulatedData()
      setIsSimulated(true)
      setDbStatus('simulado')
      setIsLoading(false)
      return
    }

    const authInstance = getAuth(centralApp)
    const dbInstance = getFirestore(centralApp)
    setDbStatus('conectado')

    // Escuchar cambios de sesión
    const unsubAuth = onAuthStateChanged(authInstance, (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // Escuchar reportes en tiempo real
        const q = query(collection(dbInstance, 'reportesBilling'), orderBy('periodo', 'desc'))
        const unsubDocs = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          setReports(data)
          setIsLoading(false)
        }, (error) => {
          console.warn("Fallo al leer datos reales. Cargando sandbox local:", error)
          loadSimulatedData()
          setIsSimulated(true)
          setDbStatus('error-sandbox')
          setIsLoading(false)
        })
        
        return () => unsubDocs()
      } else {
        setReports([])
        setIsLoading(false)
      }
    })

    return () => unsubAuth()
  }, [])

  const loadSimulatedData = () => {
    setReports([
      {
        id: 'ventas-smartfix_2026-06',
        clientId: 'ventas-smartfix',
        periodo: '2026-06',
        totalVentas: 6850000,
        comisionPorcentaje: 1.5,
        comisionValor: 102750,
        estadoPago: 'pendiente',
        updatedAt: { toDate: () => new Date() }
      },
      {
        id: 'tienda-calzado-x_2026-06',
        clientId: 'tienda-calzado-x',
        periodo: '2026-06',
        totalVentas: 9400000,
        comisionPorcentaje: 2.0,
        comisionValor: 188000,
        estadoPago: 'pagado',
        updatedAt: { toDate: () => new Date(Date.now() - 3600000) }
      },
      {
        id: 'restaurante-gourmet_2026-05',
        clientId: 'restaurante-gourmet',
        periodo: '2026-05',
        totalVentas: 14200000,
        comisionPorcentaje: 1.0,
        comisionValor: 142000,
        estadoPago: 'pagado',
        updatedAt: { toDate: () => new Date(Date.now() - 172800000) }
      }
    ])
  }

  // Login
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    const centralApp = getCentralApp()
    if (!centralApp) {
      // Si estamos en simulado, permitir entrada con cualquier dato
      setUser({ email, uid: 'simulated-uid' })
      setAuthLoading(false)
      return
    }

    try {
      const authInstance = getAuth(centralApp)
      await signInWithEmailAndPassword(authInstance, email, password)
    } catch (err) {
      console.error(err)
      setAuthError('Credenciales incorrectas o error de conexión.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    const centralApp = getCentralApp()
    if (!centralApp) {
      setUser(null)
      return
    }
    const authInstance = getAuth(centralApp)
    await signOut(authInstance)
  }

  // Toggle estado de pago
  const handleTogglePayment = async (report) => {
    if (isSimulated) {
      setReports(prev => prev.map(r => r.id === report.id ? { 
        ...r, 
        estadoPago: r.estadoPago === 'pagado' ? 'pendiente' : 'pagado' 
      } : r))
      return
    }

    const centralApp = getCentralApp()
    if (!centralApp) return
    const dbInstance = getFirestore(centralApp)

    try {
      const docRef = doc(dbInstance, 'reportesBilling', report.id)
      await updateDoc(docRef, {
        estadoPago: report.estadoPago === 'pagado' ? 'pendiente' : 'pagado',
        updatedAt: serverTimestamp()
      })
    } catch (err) {
      console.error("Error actualizando pago:", err)
    }
  }

  // Crear reporte prueba
  const handleCreateTestReport = async () => {
    const centralApp = getCentralApp()
    if (!centralApp) return
    const dbInstance = getFirestore(centralApp)

    try {
      const testPeriod = new Date().toISOString().substring(0, 7)
      const reportId = `${CLIENT_ID}_${testPeriod}`
      const docRef = doc(dbInstance, 'reportesBilling', reportId)
      
      const sales = Math.floor(Math.random() * 5000000) + 1000000
      const pct = 1.5
      
      await setDoc(docRef, {
        clientId: CLIENT_ID,
        token: DEV_TOKEN,
        periodo: testPeriod,
        totalVentas: sales,
        comisionPorcentaje: pct,
        comisionValor: (sales * pct) / 100,
        estadoPago: 'pendiente',
        updatedAt: serverTimestamp()
      })
      alert("Reporte de prueba creado exitosamente.")
    } catch (err) {
      console.error(err)
      alert("Error: " + err.message)
    }
  }

  // Filtro
  const filteredReports = reports.filter(r => 
    r.clientId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.periodo.includes(searchQuery)
  )

  // Métricas
  const totalComision = reports.reduce((sum, r) => sum + (r.comisionValor || 0), 0)
  const totalCobrado = reports.reduce((sum, r) => r.estadoPago === 'pagado' ? sum + (r.comisionValor || 0) : sum, 0)
  const totalPendiente = totalComision - totalCobrado
  const clientesActivos = new Set(reports.map(r => r.clientId)).size

  // RENDER PANTALLA LOGIN
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] px-4 font-sans">
        <form 
          onSubmit={handleLogin}
          className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6"
        >
          <div className="text-center">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Consola Central SaaS</h2>
            <p className="text-xs text-slate-400 mt-1">Acceso restringido para el desarrollador de la plataforma.</p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <p>{authError}</p>
            </div>
          )}

          {isSimulated && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <p>Modo Sandbox local: Ingresa cualquier correo/clave para entrar.</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Correo Electrónico</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  placeholder="dev@plataforma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 transition-colors"
                />
                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {authLoading ? "Autenticando..." : "Ingresar a la Consola"}
          </button>
        </form>
      </div>
    )
  }

  // RENDER PANEL PRINCIPAL
  return (
    <div className="min-h-screen bg-[#090d16] font-sans pb-12">
      {/* Barra de Navegación */}
      <nav className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Layers size={16} />
          </div>
          <span className="font-bold text-sm tracking-wide">Consola SaaS Central</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">{user.email}</span>
          <button 
            onClick={handleLogout}
            className="h-9 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <LogOut size={13} />
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8 space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2.5">
              Panel de Comisiones
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                dbStatus === 'conectado' && !isSimulated
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {dbStatus === 'conectado' && !isSimulated ? 'Firestore Real' : 'Modo Sandbox Local'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Monitoreo consolidado de ingresos, rentabilidad y estado contable.</p>
          </div>
          
          {dbStatus === 'conectado' && !isSimulated && (
            <button 
              onClick={handleCreateTestReport}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Database size={13} />
              Enviar Telemetría de Prueba
            </button>
          )}
        </div>

        {/* Alerta de Simulación */}
        {isSimulated && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs text-amber-400">
            <AlertTriangle size={18} className="shrink-0 animate-bounce text-amber-500" />
            <p>
              <strong>Entorno Sandbox Activo:</strong> Mostrando datos de demostración locales. Registra las variables `VITE_DEVELOPER_CENTRAL_*` en el archivo `.env.local` del dashboard para conectar con tu base de datos central de producción.
            </p>
          </div>
        )}

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Comisión Acumulada', val: totalComision, icon: TrendingUp, col: 'text-indigo-400' },
            { label: 'Recaudado', val: totalCobrado, icon: CheckCircle, col: 'text-emerald-400' },
            { label: 'Por Cobrar', val: totalPendiente, icon: Clock, col: 'text-amber-400' },
            { label: 'Clientes Registrados', val: clientesActivos, icon: Users, col: 'text-indigo-400', isNumber: true }
          ].map((card, idx) => (
            <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2 shadow-lg relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.02] group-hover:scale-110 transition-transform text-white">
                <card.icon size={80} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 leading-tight uppercase tracking-wider">{card.label}</span>
                <card.icon size={16} className={card.col} />
              </div>
              <p className="text-2xl font-bold mt-2 text-slate-100">
                {card.isNumber ? card.val : `$${card.val.toLocaleString('es-CO')}`}
              </p>
            </div>
          ))}
        </div>

        {/* Filtro y Barra de Búsqueda */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl max-w-md shadow-lg">
          <Search size={16} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar cliente o periodo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-xs w-full text-slate-200 placeholder-slate-500"
          />
        </div>

        {/* Listado de Facturación de Clientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <h3 className="font-bold text-xs flex items-center gap-2">
              <Layers size={14} className="text-indigo-400" />
              Consolidado Mensual de Comisiones
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">{filteredReports.length} registros</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <RefreshCw size={20} className="mx-auto animate-spin" />
              <p>Cargando registros centralizados...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Ningún reporte coincide con los criterios de búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950 font-bold">
                    <th className="p-4">Identificador de App</th>
                    <th className="p-4">Periodo</th>
                    <th className="p-4 text-right">Ventas Totales</th>
                    <th className="p-4 text-center">Porcentaje</th>
                    <th className="p-4 text-right">Comisión</th>
                    <th className="p-4 text-center">Estatus Pago</th>
                    <th className="p-4 text-right">Última Transmisión</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(report => (
                    <tr key={report.id} className="border-b border-slate-850 hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-indigo-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        {report.clientId}
                      </td>
                      <td className="p-4 font-mono font-semibold">{report.periodo}</td>
                      <td className="p-4 text-right font-mono text-slate-200">${report.totalVentas.toLocaleString('es-CO')}</td>
                      <td className="p-4 text-center font-bold text-slate-400">{report.comisionPorcentaje}%</td>
                      <td className="p-4 text-right font-mono font-bold text-indigo-300">${report.comisionValor.toLocaleString('es-CO')}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleTogglePayment(report)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            report.estadoPago === 'pagado'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          {report.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </button>
                      </td>
                      <td className="p-4 text-right font-mono text-[10px] text-slate-500">
                        {report.updatedAt?.toDate ? report.updatedAt.toDate().toLocaleString('es-CO') : 'Reciente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
