import React, { useEffect, useState } from 'react'
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  RefreshCw, 
  Search,
  Sparkles,
  Layers,
  Database
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import BackButton from '../../components/ui/BackButton'

// Variables de entorno para modo Spark (Direct Firestore)
const CENTRAL_API_KEY = import.meta.env.VITE_DEVELOPER_CENTRAL_API_KEY
const CENTRAL_AUTH_DOMAIN = import.meta.env.VITE_DEVELOPER_CENTRAL_AUTH_DOMAIN
const CENTRAL_PROJECT_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_PROJECT_ID
const CENTRAL_STORAGE_BUCKET = import.meta.env.VITE_DEVELOPER_CENTRAL_STORAGE_BUCKET
const CENTRAL_MESSAGING_SENDER_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_MESSAGING_SENDER_ID
const CENTRAL_APP_ID = import.meta.env.VITE_DEVELOPER_CENTRAL_APP_ID
const CLIENT_ID = import.meta.env.VITE_DEVELOPER_CLIENT_ID
const DEV_TOKEN = import.meta.env.VITE_DEVELOPER_TELEMETRY_TOKEN

export default function DashboardDev() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSimulated, setIsSimulated] = useState(false)
  const [dbStatus, setDbStatus] = useState('conectando')

  // Obtener Firestore Central
  const getCentralDb = () => {
    if (!CENTRAL_API_KEY || !CENTRAL_PROJECT_ID) {
      return null
    }
    const appName = "centralDevApp"
    let centralApp
    try {
      if (getApps().some(app => app.name === appName)) {
        centralApp = getApp(appName)
      } else {
        centralApp = initializeApp({
          apiKey: CENTRAL_API_KEY,
          authDomain: CENTRAL_AUTH_DOMAIN,
          projectId: CENTRAL_PROJECT_ID,
          storageBucket: CENTRAL_STORAGE_BUCKET,
          messagingSenderId: CENTRAL_MESSAGING_SENDER_ID,
          appId: CENTRAL_APP_ID,
        }, appName)
      }
      return getFirestore(centralApp)
    } catch (err) {
      console.error("[DashboardDev] Error inicializando base de datos central:", err)
      return null
    }
  }

  useEffect(() => {
    const centralDb = getCentralDb()
    if (!centralDb) {
      // Activar datos simulados si no hay configuración
      loadSimulatedData()
      setIsSimulated(true)
      setDbStatus('simulado')
      setIsLoading(false)
      return
    }

    setDbStatus('conectado')
    
    // Escuchar en tiempo real reportes comisionales
    const q = query(collection(centralDb, 'reportesBilling'), orderBy('periodo', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setReports(data)
      setIsLoading(false)
    }, (error) => {
      console.warn("[DashboardDev] Error conectando a Firestore, cargando sandbox local:", error)
      loadSimulatedData()
      setIsSimulated(true)
      setDbStatus('error-sandbox')
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadSimulatedData = () => {
    setReports([
      {
        id: 'ventas-smartfix_2026-05',
        clientId: 'ventas-smartfix',
        periodo: '2026-05',
        totalVentas: 4500000,
        comisionPorcentaje: 1.5,
        comisionValor: 67500,
        estadoPago: 'pendiente',
        updatedAt: { toDate: () => new Date() }
      },
      {
        id: 'tienda-calzado-x_2026-05',
        clientId: 'tienda-calzado-x',
        periodo: '2026-05',
        totalVentas: 8200000,
        comisionPorcentaje: 2.0,
        comisionValor: 164000,
        estadoPago: 'pagado',
        updatedAt: { toDate: () => new Date(Date.now() - 86400000) }
      },
      {
        id: 'restaurante-gourmet_2026-04',
        clientId: 'restaurante-gourmet',
        periodo: '2026-04',
        totalVentas: 12500000,
        comisionPorcentaje: 1.0,
        comisionValor: 125000,
        estadoPago: 'pagado',
        updatedAt: { toDate: () => new Date(Date.now() - 172800000) }
      }
    ])
  }

  // Cambiar estado de pago (PAGADO / PENDIENTE)
  const handleTogglePayment = async (report) => {
    if (isSimulated) {
      setReports(prev => prev.map(r => r.id === report.id ? { 
        ...r, 
        estadoPago: r.estadoPago === 'pagado' ? 'pendiente' : 'pagado' 
      } : r))
      return
    }

    const centralDb = getCentralDb()
    if (!centralDb) return

    try {
      const docRef = doc(centralDb, 'reportesBilling', report.id)
      await updateDoc(docRef, {
        estadoPago: report.estadoPago === 'pagado' ? 'pendiente' : 'pagado',
        updatedAt: serverTimestamp()
      })
    } catch (err) {
      console.error("[DashboardDev] Error actualizando estado de pago:", err)
    }
  }

  // Generar reporte de prueba rápido (Para testing local)
  const handleCreateTestReport = async () => {
    const centralDb = getCentralDb()
    if (!centralDb || !CLIENT_ID || !DEV_TOKEN) {
      alert("Configura las variables de entorno para enviar reportes de prueba.")
      return
    }

    try {
      const testPeriod = new Date().toISOString().substring(0, 7) // YYYY-MM
      const reportId = `${CLIENT_ID}_${testPeriod}`
      const docRef = doc(centralDb, 'reportesBilling', reportId)
      
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
      alert("Reporte de prueba creado/actualizado en Firestore Central!")
    } catch (err) {
      console.error("Error creando reporte de prueba:", err)
      alert("Error: " + err.message)
    }
  }

  // Filtrar reportes
  const filteredReports = reports.filter(r => 
    r.clientId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.periodo.includes(searchQuery)
  )

  // Métricas Consolidadas
  const totalComision = reports.reduce((sum, r) => sum + (r.comisionValor || 0), 0)
  const totalCobrado = reports.reduce((sum, r) => r.estadoPago === 'pagado' ? sum + (r.comisionValor || 0) : sum, 0)
  const totalPendiente = totalComision - totalCobrado
  const clientesActivos = new Set(reports.map(r => r.clientId)).size

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-app">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate('/admin/configuracion')} />
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Consola Central SaaS
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                dbStatus === 'conectado' 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {dbStatus === 'conectado' ? 'Firestore Central Activo' : 'Modo Sandbox Local'}
              </span>
            </h2>
            <p className="text-xs text-muted">Panel privado de control de ingresos comisionales del Desarrollador.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {dbStatus === 'conectado' && (
            <button 
              onClick={handleCreateTestReport}
              className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Database size={13} />
              Enviar Telemetría de Prueba
            </button>
          )}
          <button 
            onClick={() => {
              if (isSimulated) loadSimulatedData()
              else setIsLoading(true)
            }}
            className="w-8 h-8 rounded-xl bg-surface border border-app hover:bg-surface-2 flex items-center justify-center text-muted hover:text-app transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Alerta de Simulación */}
      {isSimulated && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs text-amber-500">
          <AlertTriangle size={16} className="shrink-0 animate-bounce" />
          <p>
            <strong>Modo Sandbox Activado:</strong> Mostrando datos ficticios de demostración. Configura las variables `VITE_DEVELOPER_CENTRAL_*` en tu `.env.local` para conectarte a tu base de datos de control real.
          </p>
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Comisión Acumulada', val: totalComision, icon: TrendingUp, col: 'text-primary' },
          { label: 'Recaudado', val: totalCobrado, icon: CheckCircle, col: 'text-emerald-500' },
          { label: 'Por Cobrar', val: totalPendiente, icon: Clock, col: 'text-amber-500' },
          { label: 'Clientes Reportados', val: clientesActivos, icon: Users, col: 'text-indigo-500', isNumber: true }
        ].map((card, idx) => (
          <div key={idx} className="p-5 bg-surface border border-app rounded-2xl flex flex-col gap-2 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 transition-transform">
              <card.icon size={90} />
            </div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[11px] font-bold text-muted leading-tight uppercase tracking-wider">{card.label}</span>
              <card.icon size={16} className={card.col} />
            </div>
            <p className="text-2xl font-bold mt-2 z-10">
              {card.isNumber ? card.val : `$${card.val.toLocaleString('es-CO')}`}
            </p>
          </div>
        ))}
      </div>

      {/* Filtro y Barra de Búsqueda */}
      <div className="flex items-center gap-3 bg-surface border border-app px-3 py-2 rounded-2xl max-w-md shadow-sm">
        <Search size={16} className="text-muted" />
        <input 
          type="text" 
          placeholder="Buscar cliente o periodo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-0 outline-none text-xs w-full text-app placeholder-muted"
        />
      </div>

      {/* Listado de Facturación de Clientes */}
      <div className="bg-surface border border-app rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-app bg-surface-2 flex items-center justify-between">
          <h3 className="font-bold text-xs flex items-center gap-2">
            <Layers size={14} className="text-primary" />
            Consolidado Mensual de Comisiones
          </h3>
          <span className="text-[10px] text-muted font-semibold">{filteredReports.length} registros</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted text-xs space-y-2">
            <RefreshCw size={20} className="mx-auto animate-spin" />
            <p>Cargando registros centralizados...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-muted text-xs">
            Ningún reporte coincide con los criterios de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-app text-muted bg-surface-2 font-bold">
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
                  <tr key={report.id} className="border-b border-app hover:bg-surface-2 transition-colors">
                    <td className="p-4 font-bold text-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      {report.clientId}
                    </td>
                    <td className="p-4 font-mono font-semibold">{report.periodo}</td>
                    <td className="p-4 text-right font-mono">${report.totalVentas.toLocaleString('es-CO')}</td>
                    <td className="p-4 text-center font-bold text-muted">{report.comisionPorcentaje}%</td>
                    <td className="p-4 text-right font-mono font-bold text-app">${report.comisionValor.toLocaleString('es-CO')}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleTogglePayment(report)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          report.estadoPago === 'pagado'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                      >
                        {report.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono text-[10px] text-muted">
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
  )
}
