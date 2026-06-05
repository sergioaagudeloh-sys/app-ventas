import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, QrCode, Download, Printer, Copy, Phone, Check, MessageSquare } from 'lucide-react'
import QRCode from 'qrcode'
import { formatCurrency } from '../../../utils/formatters'
import useAppConfigStore from '../../../store/appConfigStore'
import { trackTrackingEvent } from '../../../services/trackingAnalyticsService'

export default function OrderShareModal({ isOpen, onClose, order }) {
  const [qrUrl, setQrUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const canvasRef = useRef(null)
  
  const { appName, whatsappAdmin, trackingWaTemplate } = useAppConfigStore()

  // Construir enlace seguro de seguimiento
  const trackingLink = `${window.location.origin}/pedido/status?t=${order?.trackingToken || ''}`

  useEffect(() => {
    if (isOpen && order?.trackingToken) {
      // Registrar evento de generación de QR
      trackTrackingEvent(order.id, order.orderNumber, 'qr_generate')
      
      // Renderizar QR en canvas
      const linkWithRef = `${trackingLink}&ref=qr`
      QRCode.toDataURL(linkWithRef, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900 para óptimo contraste en lectura
          light: '#ffffff'
        }
      })
      .then(url => {
        setQrUrl(url)
      })
      .catch(err => {
        console.error('Error al generar QR de seguimiento:', err)
      })
    }
  }, [isOpen, order, trackingLink])


  // ─── ACCIÓN: Copiar Enlace al Portapapeles ─────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── ACCIÓN: Descargar QR como PNG ─────────────────────────────────────────
  const handleDownloadQR = () => {
    const link = document.createElement('a')
    link.download = `QR_Seguimiento_${order.orderNumber}.png`
    link.href = qrUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─── ACCIÓN: Imprimir QR y Ficha ───────────────────────────────────────────
  const handlePrintQR = () => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    iframe.contentDocument.write(`
      <html>
        <head>
          <title>Imprimir QR Seguimiento - ${order.orderNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 15px; color: #000; text-align: center; }
            .ticket { max-width: 280px; margin: 0 auto; border: 1px dashed #ccc; padding: 15px; border-radius: 8px; }
            h2 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; }
            p { margin: 3px 0; font-size: 11px; color: #444; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .qr-container { margin: 15px 0; }
            .qr-container img { width: 180px; height: 180px; }
            .footer-msg { font-size: 9px; font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h2>${appName || 'App Ventas'}</h2>
            <p>Seguimiento en Vivo del Pedido</p>
            <div class="divider"></div>
            <p><strong>Pedido:</strong> ${order.orderNumber}</p>
            <p><strong>Cliente:</strong> ${order.cliente?.nombre || 'N/A'}</p>
            <p><strong>Fecha:</strong> ${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</p>
            <div class="qr-container">
              <img src="${qrUrl}" alt="Código QR" />
            </div>
            <p><strong>Escanea el código QR</strong> para consultar el estado en tiempo real de tu pedido.</p>
            <p class="footer-msg">¡Gracias por tu compra!</p>
          </div>
        </body>
      </html>
    `)
    iframe.contentDocument.close()

    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 500)
  }

  // ─── ACCIÓN: Compartir por WhatsApp con Plantilla ─────────────────────────
  const handleShareWhatsApp = () => {
    const defaultTemplate = `¡Hola {cliente}! Muchas gracias por tu compra. 😊\n\nTu pedido *{pedido}* está en estado *{estado}* (Total: {total}).\n\nPuedes consultar su preparación y envío en tiempo real ingresando a nuestra aplicación, en la sección de *'Mis Pedidos'* y presionando el botón *'🚀 Ver Seguimiento en Tiempo Real'* en la tarjeta de tu compra.\n\n¡Gracias por confiar en *{tienda}*!`
    
    let baseText = trackingWaTemplate || defaultTemplate

    // Parseo dinámico de etiquetas variables
    const stateLabel = order.estado ? order.estado.toUpperCase() : 'PENDIENTE'
    const cleanMessage = baseText
      .replace(/{cliente}/gi, order.cliente?.nombre || 'Cliente')
      .replace(/{pedido}/gi, order.orderNumber)
      .replace(/{estado}/gi, stateLabel)
      .replace(/{tienda}/gi, appName || 'Nuestra Tienda')
      .replace(/{total}/gi, formatCurrency(order.total))
      .replace(/{enlace}/gi, trackingLink)

    const encoded = encodeURIComponent(cleanMessage)
    const phone = order.cliente?.celular?.replace(/\D/g, '') || ''
    
    // Registrar evento de telemetría de compartición por WhatsApp
    trackTrackingEvent(order.id, order.orderNumber, 'whatsapp_share')

    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
    setWhatsappSent(true)
    setTimeout(() => setWhatsappSent(false), 3000)
  }

  return (
    <AnimatePresence>
      {isOpen && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Contenedor */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-surface w-full max-w-sm rounded-[2.5rem] border border-app shadow-2xl p-6 overflow-hidden z-10"
        >
          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted transition-colors border-none cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Encabezado */}
          <div className="text-center mt-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <QrCode size={24} />
            </div>
            <h3 className="text-lg font-black text-app uppercase tracking-wide">Compartir Seguimiento</h3>
            <p className="text-xs text-muted mt-1 leading-snug">
              Comparte el estado en tiempo real del pedido
            </p>
          </div>

          {/* Ficha Resumen del Pedido */}
          <div className="bg-surface-2 p-4 rounded-2xl space-y-2 mb-5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Pedido:</span>
              <span className="font-mono font-black text-app text-sm">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Cliente:</span>
              <span className="font-bold text-app">{order.cliente?.nombre}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Método Entrega:</span>
              <span className="font-medium text-app capitalize">{order.tipoEntrega}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Total:</span>
              <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Contenedor del QR */}
          <div className="w-48 h-48 bg-white border border-app rounded-3xl mx-auto flex items-center justify-center overflow-hidden shadow-inner mb-6 relative group">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="w-44 h-44 object-contain transition-transform group-hover:scale-105 duration-300" />
            ) : (
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          {/* Acciones principales */}
          <div className="space-y-2">
            {/* Compartir por WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full h-13 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-green-500/20 active:scale-95 transition-all cursor-pointer border-none"
            >
              {whatsappSent ? <Check size={16} /> : <Phone size={16} />}
              <span>{whatsappSent ? 'Enviado por WhatsApp' : 'Enviar por WhatsApp'}</span>
            </button>

            {/* Copiar Enlace y Descarga QR */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="h-12 bg-surface hover:bg-surface-2 border border-app rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                onClick={handleDownloadQR}
                className="h-12 bg-surface hover:bg-surface-2 border border-app rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Descargar</span>
              </button>
            </div>

            {/* Imprimir QR */}
            <button
              onClick={handlePrintQR}
              className="w-full h-11 bg-surface-2 hover:bg-surface-3 text-app rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all border-none cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir Ficha QR</span>
            </button>
          </div>

        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}
