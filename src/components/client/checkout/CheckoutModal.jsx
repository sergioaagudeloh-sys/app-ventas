import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, CreditCard, CheckCircle2, ChevronRight, Store, Truck, User, Phone, Tag, Check, AlertCircle } from 'lucide-react'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_MESSAGES, SUPPORT_WHATSAPP } from '../../../constants'
import { checkoutSchema } from '../../../schemas/orderSchemas'
import useCartStore from '../../../store/cartStore'
import useAuthStore from '../../../store/authStore'
import useAppConfigStore from '../../../store/appConfigStore'
import { useCreateOrder } from '../../../hooks/useOrders'
import { useCoupons } from '../../../hooks/useCoupons'
import { formatCurrency } from '../../../utils/formatters'
import useGuidedStore from '../../../store/guidedStore'
import useInactivityTimer from '../../../hooks/useInactivityTimer'
import SmartHint from '../guided/SmartHint'

const PAYMENT_METHODS_OPTIONS = [
  {
    id: PAYMENT_METHODS.CASH,
    title: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CASH],
    description: PAYMENT_METHOD_MESSAGES[PAYMENT_METHODS.CASH],
  },
  {
    id: PAYMENT_METHODS.TRANSFER,
    title: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.TRANSFER],
    description: PAYMENT_METHOD_MESSAGES[PAYMENT_METHODS.TRANSFER],
  },
  {
    id: PAYMENT_METHODS.CREDIT,
    title: PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CREDIT],
    description: PAYMENT_METHOD_MESSAGES[PAYMENT_METHODS.CREDIT],
  },
]

// Opciones de entrega
const DELIVERY_OPTIONS = [
  {
    id: 'retiro',
    icon: Store,
    title: 'Retiro en Tienda',
    description: 'Recoge tu pedido directamente en nuestro local. Sin costo de envío.',
    badge: 'Gratis',
    badgeColor: 'bg-success/10 text-success',
  },
  {
    id: 'domicilio',
    icon: Truck,
    title: 'Domicilio',
    description: 'Recibe tu pedido en la comodidad de tu casa. Te contactaremos para coordinar.',
    badge: 'A tu puerta',
    badgeColor: 'bg-primary/10 text-primary',
  },
]

// Títulos del header según paso
const STEP_TITLES = {
  1: 'Método de Entrega',
  2: 'Tus Datos',
  3: 'Método de Pago',
}

export default function CheckoutModal({ isOpen, onClose }) {
  const { items, getTotal, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const { bankInfo, bankInfo2, whatsappAdmin, appName, deliverySettings, orderTrackingEnabled } = useAppConfigStore()
  const { mutateAsync: createOrder, isPending } = useCreateOrder()
  const { completedSteps, markStepCompleted } = useGuidedStore()
  const { data: coupons = [] } = useCoupons()

  // Construcción dinámica de métodos de entrega
  const activeDeliveryOptions = []
  const currentSettings = deliverySettings || {
    pickup: { enabled: true, address: '', instructions: 'Recoge tu pedido directamente en nuestro local.' },
    shipping: { enabled: true, cost: 0, estimatedTime: '30 a 60 min', instructions: 'Recibe tu pedido en la comodidad de tu casa.' },
    digital: { enabled: false, instructions: '' }
  }

  if (currentSettings.pickup?.enabled !== false) {
    activeDeliveryOptions.push({
      id: 'retiro',
      icon: Store,
      title: 'Retiro en Tienda',
      description: currentSettings.pickup?.instructions || 'Recoge tu pedido directamente en nuestro local.',
      badge: 'Gratis',
      badgeColor: 'bg-success/10 text-success',
    })
  }

  if (currentSettings.shipping?.enabled !== false) {
    activeDeliveryOptions.push({
      id: 'domicilio',
      icon: Truck,
      title: 'Domicilio',
      description: currentSettings.shipping?.instructions || 'Recibe tu pedido en la comodidad de tu casa. Te contactaremos para coordinar.',
      badge: currentSettings.shipping?.cost > 0 ? `+ ${formatCurrency(currentSettings.shipping.cost)}` : 'Gratis',
      badgeColor: 'bg-primary/10 text-primary',
    })
  }

  if (currentSettings.digital?.enabled === true) {
    activeDeliveryOptions.push({
      id: 'digital',
      icon: CheckCircle2,
      title: 'Entrega Digital / Servicio',
      description: currentSettings.digital?.instructions || 'Servicios presenciales o productos virtuales.',
      badge: 'Sin envío',
      badgeColor: 'bg-info/10 text-info',
    })
  }

  // step: 1=Entrega, 2=Datos, 3=Pago, 4=Éxito
  const [step, setStep] = useState(1)
  const [orderNumber, setOrderNumber] = useState('')
  const [errors, setErrors] = useState({})
  const [orderSnapshot, setOrderSnapshot] = useState(null)
  const isSubmittingRef = useRef(false)

  // Cupones state
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [showCouponSelector, setShowCouponSelector] = useState(false)

  const { isInactive: isShippingInactive } = useInactivityTimer(10000, step === 2 && isOpen)

  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    tipoEntrega: '',   // 'retiro' | 'domicilio' | 'digital'
    direccion: '',
    barrio: '',
    ciudad: '',
    metodoPago: '',
    notas: '',
  })

  // Banco seleccionado para transferencia (cuando hay dos cuentas)
  const [selectedBank, setSelectedBank] = useState(1) // 1 | 2

  // Limpiar cupones si cambia el método de pago para re-validar compatibilidad
  useEffect(() => {
    if (appliedCoupon && formData.metodoPago) {
      const isCompat = isCouponCompatible(appliedCoupon, formData.metodoPago)
      if (!isCompat) {
        setAppliedCoupon(null)
        setCouponError(`El cupón aplicado no es válido para el método de pago ${PAYMENT_METHOD_LABELS[formData.metodoPago]}.`)
      }
    }
  }, [formData.metodoPago])

  useEffect(() => {
    if (isOpen) {
      const hasOnlyOneOption = activeDeliveryOptions.length === 1
      const initialDeliveryType = hasOnlyOneOption ? activeDeliveryOptions[0].id : ''

      setStep(hasOnlyOneOption ? 2 : 1)
      setErrors({})
      setOrderSnapshot(null)
      isSubmittingRef.current = false
      setCouponCodeInput('')
      setAppliedCoupon(null)
      setCouponError('')
      setShowCouponSelector(false)
      setFormData({
        nombre: user?.nombre || '',
        celular: user?.celular || '',
        tipoEntrega: initialDeliveryType,
        direccion: '',
        barrio: '',
        ciudad: '',
        metodoPago: '',
        notas: '',
      })
      setSelectedBank(1)
    }
  }, [isOpen, user])

  // ── Paso 1 → 2: selección de entrega ─────────────────────────────────────
  const handleSelectDelivery = (tipo) => {
    setFormData(prev => ({ ...prev, tipoEntrega: tipo }))
    setErrors({})
    setStep(2)
  }

  // ── Paso 2 → 3: validación de datos ──────────────────────────────────────
  const handleNextStep = () => {
    const isDomicilio = formData.tipoEntrega === 'domicilio'
    const missing = []

    if (!formData.nombre) missing.push('nombre')
    if (!formData.celular) missing.push('celular')
    if (isDomicilio) {
      if (!formData.ciudad) missing.push('ciudad')
      if (!formData.barrio) missing.push('barrio')
      if (!formData.direccion) missing.push('dirección')
    }

    if (missing.length > 0) {
      setErrors({ global: `Por favor completa todos los campos obligatorios: ${missing.join(', ')}.` })
      return
    }
    setErrors({})
    setStep(3)
  }

  // ── Lógica de Cupones ────────────────────────────────────────────────────
  const isCouponCompatible = (coupon, paymentMethod) => {
    if (!coupon.metodosPago || coupon.metodosPago.length === 0) return true
    return coupon.metodosPago.includes(paymentMethod)
  }

  const handleApplyCoupon = (codeToApply = couponCodeInput) => {
    setCouponError('')
    const code = codeToApply.trim().toUpperCase()
    if (!code) {
      setCouponError('Ingresa un código de cupón.')
      return
    }

    const coupon = coupons.find(c => c.codigo.toUpperCase() === code)
    
    if (!coupon) {
      setCouponError('El cupón ingresado no existe.')
      return
    }

    if (!coupon.activo) {
      setCouponError('Este cupón ya no está activo.')
      return
    }

    // Validar expiración
    if (coupon.fechaExpiracion) {
      const expirationDate = new Date(coupon.fechaExpiracion)
      if (expirationDate < new Date()) {
        setCouponError('Este cupón ha expirado.')
        return
      }
    }

    // Validar monto mínimo
    const subtotal = getTotal()
    if (coupon.minimoCompra && subtotal < coupon.minimoCompra) {
      setCouponError(`Compra mínima requerida para este cupón: ${formatCurrency(coupon.minimoCompra)} (Tienes ${formatCurrency(subtotal)}).`)
      return
    }

    // Validar método de pago (si ya seleccionó uno)
    if (formData.metodoPago && !isCouponCompatible(coupon, formData.metodoPago)) {
      setCouponError(`Este cupón no aplica para el método de pago: ${PAYMENT_METHOD_LABELS[formData.metodoPago]}.`)
      return
    }

    setAppliedCoupon(coupon)
    setCouponCodeInput('')
    setShowCouponSelector(false)
  }

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0
    const subtotal = getTotal()
    if (appliedCoupon.tipoDescuento === 'porcentaje') {
      return (subtotal * appliedCoupon.valorDescuento) / 100
    } else {
      return appliedCoupon.valorDescuento
    }
  }

  const getShippingCost = () => {
    if (formData.tipoEntrega === 'domicilio') {
      return currentSettings.shipping?.cost || 0
    }
    return 0
  }

  const getFinalTotal = () => {
    const subtotal = getTotal()
    const discount = calculateDiscount()
    const shippingCost = getShippingCost()
    return Math.max(0, subtotal - discount + shippingCost)
  }

  // ── Paso 3: confirmar pedido ──────────────────────────────────────────────
  const handleCheckout = async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    const result = checkoutSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors = {}
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0]] = issue.message
      })
      setErrors(fieldErrors)
      isSubmittingRef.current = false
      return
    }

    try {
      setErrors({})
      const isDomicilio = formData.tipoEntrega === 'domicilio'
      const finalDiscount = calculateDiscount()
      const currentShippingCost = getShippingCost()

      const orderData = {
        cliente: {
          nombre: formData.nombre,
          celular: formData.celular,
          ...(isDomicilio && {
            direccion: formData.direccion,
            barrio: formData.barrio,
            ciudad: formData.ciudad,
          }),
        },
        tipoEntrega: formData.tipoEntrega,
        costoEnvio: currentShippingCost,
        metodoPago: formData.metodoPago,
        ...(formData.metodoPago === 'transferencia' && {
          bancoElegido: selectedBank === 2 && bankInfo2?.activa ? bankInfo2.banco : bankInfo?.banco,
        }),
        notas: formData.notas,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          nombre: item.nombre,
          precio: item.precio,
          talla: item.talla,
          color: item.color,
          cantidad: item.cantidad,
          imageUrl: item.imageUrl,
        })),
        total: getFinalTotal(),
        subtotal: getTotal(),
        descuento: finalDiscount,
        ...(appliedCoupon && {
          couponCode: appliedCoupon.codigo,
          couponId: appliedCoupon.id,
        })
      }

      const currentTotal = getFinalTotal()
      const currentItems = [...items]

      const { id: newOrderId, trackingToken } = await createOrder(orderData)
      const shortId = newOrderId.slice(-8).toUpperCase()

      setOrderSnapshot({
        ...orderData,
        items: currentItems,
        total: currentTotal,
        numero: shortId,
        trackingToken,
      })

      if (!completedSteps?.['checkout']) {
        markStepCompleted('checkout')
      }

      setOrderNumber(shortId)
      clearCart()
      setStep(4)
    } catch (error) {
      console.error('Error al crear pedido:', error)
      setErrors({ global: error.message || 'Error procesando tu pedido. Intenta nuevamente.' })
      isSubmittingRef.current = false
    }
  }

  // ── Mensaje WhatsApp ──────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    const adminPhone = whatsappAdmin || SUPPORT_WHATSAPP
    if (!adminPhone) return
    const snap = orderSnapshot
    const num = snap?.numero || orderNumber
    const isDomicilio = snap?.tipoEntrega === 'domicilio'
    const isDigital = snap?.tipoEntrega === 'digital'

    const e = {
      carrito:   String.fromCodePoint(0x1F6D2),
      cliente:   String.fromCodePoint(0x1F464),
      celular:   String.fromCodePoint(0x1F4F1),
      ubicacion: String.fromCodePoint(0x1F4CD),
      tienda:    String.fromCodePoint(0x1F3EA),
      caja:      String.fromCodePoint(0x1F4E6),
      item:      String.fromCodePoint(0x1F3F7),
      tarjeta:   String.fromCodePoint(0x1F4B3),
      dinero:    String.fromCodePoint(0x1F4B0),
      nota:      String.fromCodePoint(0x1F4DD),
      camion:    String.fromCodePoint(0x1F69A),
      cupon:     String.fromCodePoint(0x1F39F),
      digital:   String.fromCodePoint(0x1F4F2),
    }

    const metodosLabel = { efectivo: 'Efectivo', transferencia: 'Transferencia', credito: 'Crédito (Fiado)' }
    // Banco elegido para transferencia
    const bancoInfo = snap?.metodoPago === 'transferencia'
      ? (selectedBank === 2 && bankInfo2?.activa ? bankInfo2 : bankInfo)
      : null
    const itemsText = (snap?.items || []).map(item => {
      const variant = item.talla || item.color ? ` (${[item.talla, item.color].filter(Boolean).join(', ')})` : ''
      return `  ${e.item} ${item.nombre}${variant} x${item.cantidad} — ${formatCurrency(item.precio * item.cantidad)}`
    }).join('\n')

    let entregaLine = ''
    if (isDomicilio) {
      entregaLine = `${e.camion} *Entrega:* Domicilio\n${e.ubicacion} *Dirección:* ${snap?.cliente?.direccion || ''}, ${snap?.cliente?.barrio || ''}, ${snap?.cliente?.ciudad || ''}`
    } else if (isDigital) {
      entregaLine = `${e.digital} *Entrega:* Digital / Servicios`
    } else {
      const addressText = currentSettings.pickup?.address ? ` (${currentSettings.pickup.address})` : ''
      entregaLine = `${e.tienda} *Entrega:* Retiro en Tienda${addressText}`
    }

    const notasLine = snap?.notas ? `\n\n${e.nota} *Notas:* ${snap.notas}` : ''

    const couponLine = snap?.couponCode 
      ? `\n${e.cupon} *Cupón Aplicado:* ${snap.couponCode} (- ${formatCurrency(snap.descuento)})` 
      : ''

    const shippingLine = snap?.costoEnvio > 0 
      ? `\n${e.camion} *Envío:* ${formatCurrency(snap.costoEnvio)}`
      : ''

    const subtotalLine = `\nSubtotal: ${formatCurrency(snap?.subtotal || getTotal())}`

    const bancoLine = bancoInfo
      ? `\n🏦 *Banco elegido:* ${bancoInfo.banco} · ${bancoInfo.numeroCuenta}${bancoInfo.titular ? ` · ${bancoInfo.titular}` : ''}`
      : ''

    const seller = useAppConfigStore.getState().sellerName || 'el Administrador'

    let trackingLine = ''
    if (orderTrackingEnabled && snap?.trackingToken) {
      const trackingUrl = `${window.location.origin}/pedido/status?t=${snap.trackingToken}`
      trackingLine = `\n\n📍 *Sigue tu pedido en vivo aquí:*\n${trackingUrl}`
    }

    const text =
`Hola ${seller} de *${appName || 'la Tienda'}*.
${e.carrito} *Nuevo Pedido #${num}*

${e.cliente} *Cliente:* ${snap?.cliente?.nombre || ''}
${e.celular} *Celular:* ${snap?.cliente?.celular || ''}
${entregaLine}

${e.caja} *Productos:*
${itemsText}
${subtotalLine}${couponLine}${shippingLine}
${e.tarjeta} *Método de pago:* ${metodosLabel[snap?.metodoPago] || snap?.metodoPago}${bancoLine}
${e.dinero} *Total:* ${formatCurrency(snap?.total || 0)}${notasLine}${trackingLine}`

    const encoded = encodeURIComponent(text)
    const url = `https://api.whatsapp.com/send/?phone=${adminPhone.replace(/\D/g, '')}&text=${encoded}&type=phone_number&app_absent=0`
    window.open(url, '_blank')
    onClose()
  }

  if (!isOpen) return null

  const isDomicilio = formData.tipoEntrega === 'domicilio'
  const activeCoupons = coupons.filter(coupon => {
    if (!coupon.activo) return false
    if (coupon.fechaExpiracion && new Date(coupon.fechaExpiracion) < new Date()) return false
    if (coupon.minimoCompra && getTotal() < coupon.minimoCompra) return false
    if (formData.metodoPago && !isCouponCompatible(coupon, formData.metodoPago)) return false
    return true
  })

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step === 4 ? onClose : undefined}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]"
        >
          {/* Header */}
          {step !== 4 && (
            <div className="flex items-center justify-between p-4 border-b border-app bg-surface z-10 shrink-0">
              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center hover:bg-app text-app transition-colors"
                  >
                    <ChevronRight className="rotate-180" size={18} />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold text-app">{STEP_TITLES[step]}</h2>
                  {/* Indicadores de paso */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {[1, 2, 3].map(s => (
                      <div
                        key={s}
                        className="h-1 rounded-full transition-all duration-300"
                        style={{
                          width: s === step ? '20px' : '6px',
                          backgroundColor: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-6">

            {errors.global && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-error rounded-xl text-sm font-medium">
                {errors.global}
              </div>
            )}

            {/* ══ PASO 1: SELECCIÓN DE ENTREGA ══════════════════════════════════ */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Truck size={26} className="text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-app">¿Cómo quieres recibir tu pedido?</h3>
                  <p className="text-sm text-muted mt-1">Elige el método de entrega que más te convenga</p>
                </div>

                <div className="space-y-3">
                  {activeDeliveryOptions.map(({ id, icon: Icon, title, description, badge, badgeColor }) => (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectDelivery(id)}
                      className="w-full p-4 rounded-2xl border-2 border-app bg-surface-2 hover:border-primary/40 hover:bg-surface transition-all text-left flex gap-4 items-start group"
                    >
                      {/* Icono */}
                      <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-app group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                        <Icon size={22} className="text-muted group-hover:text-primary transition-colors" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-app text-sm">{title}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{description}</p>
                      </div>

                      {/* Flecha */}
                      <ChevronRight size={18} className="text-muted shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ══ PASO 2: DATOS DE CONTACTO / ENVÍO ════════════════════════════ */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

                {/* Badge de tipo de entrega seleccionado */}
                <div
                  className="flex items-center gap-2 p-3 rounded-xl mb-2"
                  style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
                >
                  {formData.tipoEntrega === 'domicilio' && <Truck size={16} className="text-primary shrink-0" />}
                  {formData.tipoEntrega === 'retiro' && <Store size={16} className="text-primary shrink-0" />}
                  {formData.tipoEntrega === 'digital' && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                  <span className="text-xs font-bold text-primary capitalize">
                    {formData.tipoEntrega === 'domicilio' ? 'Entrega a domicilio' : formData.tipoEntrega === 'retiro' ? 'Retiro en tienda' : 'Entrega digital / servicio'}
                  </span>
                  {activeDeliveryOptions.length > 1 && (
                    <button onClick={() => setStep(1)} className="ml-auto text-xs text-muted hover:text-primary underline underline-offset-2">
                      Cambiar
                    </button>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">
                    <User size={11} className="inline mr-1" />Nombre completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Celular */}
                <div>
                  <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">
                    <Phone size={11} className="inline mr-1" />Celular *
                  </label>
                  <input
                    type="tel"
                    placeholder="Número de contacto"
                    value={formData.celular}
                    onChange={e => setFormData({ ...formData, celular: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Campos de dirección — SOLO para domicilio */}
                {isDomicilio && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 pt-2">
                      <MapPin size={14} className="text-primary" />
                      <p className="text-xs font-bold text-muted uppercase tracking-wider">Dirección de entrega</p>
                    </div>
                    <input
                      type="text"
                      placeholder="Ciudad *"
                      value={formData.ciudad}
                      onChange={e => setFormData({ ...formData, ciudad: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Barrio o sector *"
                      value={formData.barrio}
                      onChange={e => setFormData({ ...formData, barrio: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Dirección exacta *"
                      value={formData.direccion}
                      onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </motion.div>
                )}

                {/* Notas */}
                <div>
                  <textarea
                    placeholder={isDomicilio ? 'Notas adicionales (ej: Casa verde de 2 pisos)' : 'Notas adicionales (opcional)'}
                    value={formData.notas}
                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                    rows={2}
                    className="w-full p-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <SmartHint
                  stepId="checkout_shipping"
                  message={isDomicilio ? 'Asegúrate de escribir tu dirección correctamente para que tu pedido llegue sin problemas.' : 'Pronto recibirás una notificación cuando tu pedido esté listo para retirar.'}
                  position="bottom"
                  inactivityTrigger={true}
                  isInactive={isShippingInactive}
                  className="mt-2"
                />

                <button
                  onClick={handleNextStep}
                  className="w-full h-14 mt-4 bg-action text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-action/30"
                >
                  Continuar al Pago <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {/* ══ PASO 3: MÉTODO DE PAGO ════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={18} className="text-primary" />
                  <span className="font-semibold text-app">¿Cómo deseas pagar?</span>
                </div>

                <div className="relative mb-2">
                  <SmartHint
                    stepId="checkout_payment"
                    message="Puedes elegir cómo deseas pagar tu pedido. El pago lo realizarás al recibir o a las cuentas que te enviaremos."
                    position="top"
                    delay={500}
                  />
                </div>

                <div className="space-y-3">
                  {PAYMENT_METHODS_OPTIONS.map((method) => {
                    const isSelected = formData.metodoPago === method.id
                    return (
                      <motion.div
                        key={method.id}
                        onClick={() => setFormData({ ...formData, metodoPago: method.id })}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                          isSelected ? 'shadow-lg shadow-primary/5 scale-[1.01]' : 'border-app bg-surface-2 hover:border-primary/30'
                        }`}
                        style={isSelected ? {
                          borderColor: 'var(--color-primary)',
                          backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                        } : {}}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3
                            className={`font-bold text-base ${isSelected ? 'text-primary' : 'text-app'}`}
                            style={isSelected ? { color: 'var(--color-primary)' } : {}}
                          >
                            {method.title}
                          </h3>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                            style={isSelected ? { borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary)' } : { borderColor: 'var(--color-border)' }}
                          >
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </div>
                        <p className="text-sm text-muted pr-6 leading-relaxed">{method.description}</p>

                        {isSelected && method.id === 'transferencia' && bankInfo?.banco && (() => {
                          const hasSecondBank = bankInfo2?.activa && bankInfo2?.banco
                          return (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 space-y-2"
                            >
                              {hasSecondBank ? (
                                // ─── Dos cuentas: el cliente elige ───
                                <>
                                  <p className="text-xs text-muted mb-2 flex items-center gap-1">
                                    <span>Elige a cuál cuenta transferir:</span>
                                  </p>
                                  {[{ num: 1, info: bankInfo }, { num: 2, info: bankInfo2 }].map(({ num, info }) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setSelectedBank(num) }}
                                      className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 ${
                                        selectedBank === num
                                          ? 'border-primary/60 bg-surface shadow-sm'
                                          : 'border-app bg-surface hover:border-primary/30'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                        selectedBank === num ? 'border-primary bg-primary' : 'border-muted'
                                      }`}>
                                        {selectedBank === num && <div className="w-2 h-2 bg-white rounded-full" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-app text-sm">{info.banco}</p>
                                        <p className="text-app font-mono text-xs">{info.numeroCuenta}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-muted text-xs capitalize">{info.tipoCuenta}</span>
                                          {info.titular && <span className="text-muted text-xs">· {info.titular}</span>}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </>
                              ) : (
                                // ─── Una sola cuenta ───
                                <div className="p-3 bg-surface rounded-xl border border-app text-sm">
                                  <p className="text-muted mb-1">Transfiere a:</p>
                                  <p className="font-bold text-app">{bankInfo.banco}</p>
                                  <p className="text-app font-mono">{bankInfo.numeroCuenta}</p>
                                  <p className="text-muted text-xs capitalize">{bankInfo.tipoCuenta}</p>
                                </div>
                              )}
                            </motion.div>
                          )
                        })()}
                      </motion.div>
                    )
                  })}
                </div>

                {errors.metodoPago && (
                  <p className="text-sm text-error font-medium mt-2 text-center">{errors.metodoPago}</p>
                )}

                <div className="mt-8 pt-6 border-t border-app space-y-3">
                  <div className="flex justify-between items-center text-sm text-muted">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(getTotal())}</span>
                  </div>
                  {calculateDiscount() > 0 && (
                    <div className="flex justify-between items-center text-sm text-success">
                      <span>Descuento cupón:</span>
                      <span>- {formatCurrency(calculateDiscount())}</span>
                    </div>
                  )}
                  {getShippingCost() > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted">
                      <span>Costo de envío:</span>
                      <span>+ {formatCurrency(getShippingCost())}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-app/60 mb-6">
                    <span className="text-app font-semibold">Total a pagar:</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(getFinalTotal())}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isPending || !formData.metodoPago}
                    className="w-full h-14 bg-action text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center disabled:opacity-50 shadow-lg shadow-action/30"
                  >
                    {isPending ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Finalizar Compra'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ PASO 4: ÉXITO ════════════════════════════════════════════════ */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 size={40} />
                </motion.div>

                <div className="relative max-w-[280px] mx-auto mb-4">
                  <SmartHint
                    stepId="checkout_success"
                    message="¡Felicidades! Lograste realizar tu pedido. Nosotros nos encargaremos del resto."
                    position="bottom"
                    delay={300}
                  />
                </div>

                <h2 className="text-2xl font-bold text-app mb-2">¡Pedido Exitoso!</h2>
                <p className="text-muted mb-2">
                  Tu pedido <span className="font-mono font-bold text-app">#{orderNumber}</span> ha sido recibido.
                </p>

                {/* Resumen de entrega */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
                  style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}
                >
                  {orderSnapshot?.tipoEntrega === 'domicilio' && <><Truck size={13} /> Domicilio</>}
                  {orderSnapshot?.tipoEntrega === 'retiro' && <><Store size={13} /> Retiro en Tienda</>}
                  {orderSnapshot?.tipoEntrega === 'digital' && <><CheckCircle2 size={13} /> Digital / Servicio</>}
                </div>

                {whatsappAdmin || SUPPORT_WHATSAPP ? (
                  <div className="space-y-3">
                    <p className="text-sm text-app font-medium">
                      Para agilizar el proceso, notifícanos por WhatsApp:
                    </p>
                    <button
                      onClick={handleWhatsApp}
                      className="w-full h-12 bg-[#25D366] text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Avisar por WhatsApp
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full h-12 bg-surface-2 text-app rounded-xl font-bold transition-all active:scale-95"
                    >
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-bold transition-all active:scale-95"
                  >
                    Entendido
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
