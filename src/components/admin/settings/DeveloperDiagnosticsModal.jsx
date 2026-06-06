import React, { useState, useEffect } from 'react';
import { 
  X, Activity, Database, Network, Key, AlertTriangle, 
  CheckCircle, RefreshCw, Terminal, Cpu, Bell, Mail
} from 'lucide-react';
import { db, auth, messaging } from '../../../config/firebaseConfig';
import { collection, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { isSupported } from 'firebase/messaging';

export default function DeveloperDiagnosticsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  const [logs, setLogs] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingCentral, setLoadingCentral] = useState(false);
  const [loadingVapid, setLoadingVapid] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' ? Notification.permission : 'unknown'
  );

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, message, type }]);
  };

  const clearLogs = () => setLogs([]);

  // 1. Diagnóstico de Ping Local a Firebase
  const testLocalFirebase = async () => {
    setLoadingLocal(true);
    clearLogs();
    addLog('Iniciando prueba de ping a Firestore Local...', 'info');
    const start = performance.now();
    try {
      // Intentar escribir un documento temporal
      addLog('Intentando escribir documento temporal en colección "_diagnostics"...', 'info');
      const tempDocRef = await addDoc(collection(db, '_diagnostics'), {
        test: true,
        timestamp: Date.now(),
        by: auth.currentUser?.email || 'System Diagnostics'
      });
      addLog(`Documento escrito con éxito: ID = ${tempDocRef.id}`, 'success');

      // Intentar leer el documento temporal
      addLog('Intentando leer el documento recién creado...', 'info');
      const readSnap = await getDoc(doc(db, '_diagnostics', tempDocRef.id));
      if (readSnap.exists()) {
        addLog('Lectura de documento exitosa.', 'success');
      } else {
        throw new Error('El documento no fue encontrado en la base de datos tras la escritura.');
      }

      // Intentar borrar el documento temporal
      addLog('Intentando eliminar documento temporal...', 'info');
      await deleteDoc(doc(db, '_diagnostics', tempDocRef.id));
      addLog('Documento temporal eliminado con éxito.', 'success');

      const end = performance.now();
      const latency = (end - start).toFixed(1);
      addLog(`¡Ping a Firebase local finalizado con éxito! Latencia total: ${latency}ms`, 'success');
    } catch (error) {
      console.error(error);
      addLog(`Error en Ping Local: ${error.message || 'Error desconocido'}`, 'error');
    } finally {
      setLoadingLocal(false);
    }
  };

  // 2. Diagnóstico de Ping Central
  const testCentralFirebase = async () => {
    setLoadingCentral(true);
    clearLogs();
    addLog('Iniciando prueba de conexión con Servidor Central/DNS...', 'info');
    const start = performance.now();
    try {
      addLog('Realizando petición GET a Google APIs para verificar conectividad...', 'info');
      const res = await fetch('https://firestore.googleapis.com/v1/projects/' + import.meta.env.VITE_FIREBASE_PROJECT_ID, {
        method: 'GET'
      });
      const end = performance.now();
      const latency = (end - start).toFixed(1);
      if (res.ok || res.status === 404 || res.status === 403 || res.status === 400) {
        addLog(`Petición realizada. HTTP Status: ${res.status}.`, 'info');
        addLog(`¡Ping a Servidor Central finalizado! Latencia total: ${latency}ms`, 'success');
      } else {
        throw new Error(`Código de estado HTTP inesperado: ${res.status}`);
      }
    } catch (error) {
      console.error(error);
      addLog(`Error en Ping Central: ${error.message || 'Error de red / DNS'}`, 'error');
    } finally {
      setLoadingCentral(false);
    }
  };

  // 3. Diagnóstico de VAPID y Notificaciones Push
  const testVapidMessaging = async () => {
    setLoadingVapid(true);
    clearLogs();
    addLog('Validando soporte de mensajería push...', 'info');
    try {
      const messagingSupported = await isSupported();
      addLog(`Mensajería PWA Push soportada en este navegador: ${messagingSupported ? 'SÍ' : 'NO'}`, messagingSupported ? 'success' : 'error');

      const vapidKey = import.meta.env.VITE_VAPID_KEY;
      addLog(`VITE_VAPID_KEY configurado en .env.local: ${vapidKey ? 'SÍ (Presente)' : 'NO (Faltante)'}`, vapidKey ? 'success' : 'error');

      const permissionStatus = Notification.permission;
      setNotificationPermission(permissionStatus);
      addLog(`Permiso de notificaciones del sistema: "${permissionStatus}"`, 
        permissionStatus === 'granted' ? 'success' : permissionStatus === 'default' ? 'info' : 'error'
      );

      if (permissionStatus !== 'granted') {
        addLog('Solicitando permiso de notificaciones al navegador...', 'info');
        const userPermission = await Notification.requestPermission();
        setNotificationPermission(userPermission);
        addLog(`Nuevo estado del permiso: "${userPermission}"`, userPermission === 'granted' ? 'success' : 'error');
      }

      if (messagingSupported && vapidKey && Notification.permission === 'granted') {
        addLog('Intentando recuperar Token de Registro de Dispositivo (FCM)...', 'info');
        const { getToken } = await import('firebase/messaging');
        if (messaging) {
          const currentToken = await getToken(messaging, { vapidKey });
          if (currentToken) {
            addLog(`Token FCM recuperado con éxito: ${currentToken.substring(0, 15)}...`, 'success');
            console.log('FCM Token Completo:', currentToken);
          } else {
            addLog('No se pudo recuperar el token del dispositivo (Token nulo).', 'error');
          }
        } else {
          addLog('El servicio de Mensajería no está inicializado.', 'error');
        }
      }
    } catch (error) {
      console.error(error);
      addLog(`Error en diagnóstico VAPID/Push: ${error.message || 'Error desconocido'}`, 'error');
    } finally {
      setLoadingVapid(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-2xl bg-surface border border-app rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        style={{ color: 'var(--color-text)' }}
      >
        {/* Cabecera */}
        <div className="p-5 border-b border-app bg-surface-2 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="text-primary w-5 h-5 animate-pulse" />
            <div>
              <h3 className="text-sm font-black text-app">Consola de Diagnóstico del Desarrollador</h3>
              <p className="text-[10px] text-muted">Infraestructura, Conectividad y Variables del Entorno</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-muted hover:text-app transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-app bg-surface shrink-0 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('general'); clearLogs(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-app'
            }`}
          >
            Datos Generales
          </button>
          <button
            onClick={() => { setActiveTab('ping'); clearLogs(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === 'ping' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-app'
            }`}
          >
            Pings Firebase
          </button>
          <button
            onClick={() => { setActiveTab('vapid'); clearLogs(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === 'vapid' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-app'
            }`}
          >
            Notificaciones (VAPID)
          </button>
        </div>

        {/* Contenido principal con Scroll */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'general' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-app uppercase tracking-wide">Variables del Entorno (.env.local)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 bg-surface-2 border border-app rounded-xl">
                  <p className="text-[10px] text-muted">VITE_FIREBASE_PROJECT_ID</p>
                  <p className="font-bold truncate mt-0.5">{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'No definido'}</p>
                </div>
                <div className="p-3 bg-surface-2 border border-app rounded-xl">
                  <p className="text-[10px] text-muted">VITE_DEVELOPER_EMAIL</p>
                  <p className="font-bold truncate mt-0.5">{import.meta.env.VITE_DEVELOPER_EMAIL || 'No definido'}</p>
                </div>
                <div className="p-3 bg-surface-2 border border-app rounded-xl col-span-1 md:col-span-2">
                  <p className="text-[10px] text-muted">Usuario Activo Autenticado</p>
                  <p className="font-bold truncate mt-0.5 flex items-center gap-1">
                    <Mail size={12} className="text-primary" />
                    {auth.currentUser?.email || 'Invitado o No Autenticado'}
                  </p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-app uppercase tracking-wide pt-2">Datos del Cliente y Navegador</h4>
              <div className="p-3 bg-surface-2 border border-app rounded-xl text-xs space-y-2">
                <p><span className="font-semibold text-muted">Plataforma:</span> {navigator.platform}</p>
                <p className="truncate"><span className="font-semibold text-muted">User Agent:</span> {navigator.userAgent}</p>
                <p><span className="font-semibold text-muted">Estado de Red:</span> {navigator.onLine ? '🟢 Conectado (Online)' : '🔴 Desconectado (Offline)'}</p>
              </div>
            </div>
          )}

          {activeTab === 'ping' && (
            <div className="space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Prueba la velocidad de respuesta de Firebase escribiendo un registro temporal o resolviendo peticiones directas de red hacia los endpoints.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={testLocalFirebase}
                  disabled={loadingLocal}
                  className="flex-1 h-11 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Database size={16} className={loadingLocal ? 'animate-spin' : ''} />
                  Ping Firestore Local
                </button>

                <button
                  onClick={testCentralFirebase}
                  disabled={loadingCentral}
                  className="flex-1 h-11 bg-surface-2 border border-app text-app text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-3 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Network size={16} className={loadingCentral ? 'animate-spin' : ''} />
                  Ping Central / API
                </button>
              </div>
            </div>
          )}

          {activeTab === 'vapid' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-surface-2 border border-app rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted">Permiso de Notificaciones:</span>
                  <span className={`font-bold capitalize ${notificationPermission === 'granted' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {notificationPermission}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-app pt-2.5">
                  <span className="font-semibold text-muted">VITE_VAPID_KEY Cargado:</span>
                  <span className="font-bold">{import.meta.env.VITE_VAPID_KEY ? '✅ SÍ' : '❌ NO'}</span>
                </div>
              </div>

              <button
                onClick={testVapidMessaging}
                disabled={loadingVapid}
                className="w-full h-11 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Bell size={16} className={loadingVapid ? 'animate-spin' : ''} />
                Diagnosticar FCM & VAPID Push
              </button>
            </div>
          )}

          {/* Consola de logs en tiempo real */}
          {logs.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                  <Terminal size={12} /> Salida de Diagnóstico
                </span>
                <button 
                  onClick={clearLogs}
                  className="text-[10px] text-muted hover:underline"
                >
                  Limpiar logs
                </button>
              </div>
              <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs overflow-y-auto max-h-[200px] border border-slate-900 space-y-1">
                {logs.map((log, index) => (
                  <div 
                    key={index}
                    className={
                      log.type === 'error' ? 'text-rose-400' :
                      log.type === 'success' ? 'text-emerald-400' :
                      'text-slate-300'
                    }
                  >
                    <span className="text-slate-500 mr-2">[{log.time}]</span>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-app bg-surface-2 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-app text-surface text-xs font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Cerrar Consola
          </button>
        </div>
      </div>
    </div>
  );
}
