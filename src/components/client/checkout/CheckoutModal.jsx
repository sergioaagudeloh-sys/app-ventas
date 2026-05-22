import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, CreditCard, CheckCircle2, ChevronRight } from 'lucide-react'
import { PAYMENT_METHODS } from '../../../constants'
import { checkoutSchema } from '../../../schemas/orderSchemas'
import useCartStore from '../../../store/cartStore'
import useAuthStore from '../../../store/authStore'
import useAppConfigStore from '../../../store/appConfigStore'
import { useCreateOrder } from '../../../hooks/useOrders'
import { formatCurrency } from '../../../utils/formatters'
import useGuidedStore from '../../../store/guidedStore'
import useInactivityTimer from '../../../hooks/useInactivityTimer'
import SmartHint from '../guided/SmartHint'

export default function CheckoutModal({ isOpen, onClose }) {
  const { items, total, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const { bankInfo, whatsappAdmin } = useAppConfigStore()
  const { mutateAsync: createOrder, isPending } = useCreateOrder()
  const { hasCompletedStep, markStepCompleted } = useGuidedStore()

  const [step, setStep] = useState(1) // 1: Datos, 2: Pago, 3: Éxito
  const [orderNumber, setOrderNumber] = useState('')
  const [errors, setErrors] = useState({})

  // Inactividad en el paso 1 (Envío)
  const { isInactive: isShippingInactive } = useInactivityTimer(10000, step === 1 && isOpen)

  // Formulario pre-llenado con datos del usuario si está logueado
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    direccion: '',
    barrio: '',
    ciudad: '',
    metodoPago: '',
    notas: '',
  })

  useEffect(() => {
    if (isOpen && user) {
      setFormData(prev => ({
        ...prev,
        nombre: user.nombre || '',
        celular: user.celular || '',
      }))
    }
  }, [isOpen, user])

  const handleNextStep = () => {
    // Validar paso 1 manualmente (parcial)
    if (!formData.nombre || !formData.celular || !formData.direccion || !formData.barrio || !formData.ciudad) {
      setErrors({ global: 'Por favor completa todos los campos obligatorios de envío.' })
      return
    }
    setErrors({})
    setStep(2)
  }

  const handleCheckout = async () => {
    // Validar con Zod completo
    const result = checkoutSchema.safeParse(formData)
    
    if (!result.success) {
      const fieldErrors = {}
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0]] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    try {
      setErrors({})
      const orderData = {
        cliente: {
          nombre: formData.nombre,
          celular: formData.celular,
          direccion: formData.direccion,
          barrio: formData.barrio,
          ciudad: formData.ciudad,
        },
        metodoPago: formData.metodoPago,
        notas: formData.notas,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          nombre: item.nombre,
          precio: item.precio,
          talla: item.talla,
          color: item.color,
          cantidad: 1, // En nuestro store actual cada item en el array es 1 unidad
          imageUrl: item.imageUrl
        })),
        total: total(),
      }

      const newOrderId = await createOrder(orderData)
      
      // Guided Mode
      if (!hasCompletedStep('checkout')) {
        markStepCompleted('checkout')
      }

      // Simular que el ID es el número de orden por ahora para la UI
      setOrderNumber(newOrderId.slice(-8).toUpperCase())
      clearCart()
      setStep(3)
    } catch (error) {
      console.error('Error al crear pedido:', error)
      setErrors({ global: 'Error procesando tu pedido. Intenta nuevamente.' })
    }
  }

  const handleWhatsApp = () => {
    if (!whatsappAdmin) return
    const text = `Hola, acabo de hacer el pedido *#${orderNumber}* por un valor de *${formatCurrency(total())}*.`
    window.open(`https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(text)}`, '_blank')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step === 3 ? onClose : undefined}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          {step !== 3 && (
            <div className="flex items-center justify-between p-4 border-b border-app bg-surface z-10 shrink-0">
              <div className="flex items-center gap-3">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center hover:bg-app text-app transition-colors"
                  >
                    <ChevronRight className="rotate-180" size={18} />
                  </button>
                )}
                <h2 className="text-lg font-bold text-app">
                  {step === 1 ? 'Datos de Envío' : 'Método de Pago'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-app transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Contenido (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {errors.global && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-error rounded-xl text-sm font-medium">
                {errors.global}
              </div>
            )}

            {/* PASO 1: DATOS */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={18} className="text-primary" />
                  <span className="font-semibold text-app">¿Dónde entregamos?</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Tu nombre completo *"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="tel"
                      placeholder="Celular de contacto *"
                      value={formData.celular}
                      onChange={e => setFormData({...formData, celular: e.target.value})}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Ciudad *"
                      value={formData.ciudad}
                      onChange={e => setFormData({...formData, ciudad: e.target.value})}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Barrio *"
                      value={formData.barrio}
                      onChange={e => setFormData({...formData, barrio: e.target.value})}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Dirección exacta *"
                      value={formData.direccion}
                      onChange={e => setFormData({...formData, direccion: e.target.value})}
                      className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <textarea
                      placeholder="Notas adicionales (opcional, ej: Casa verde de 2 pisos)"
                      value={formData.notas}
                      onChange={e => setFormData({...formData, notas: e.target.value})}
                      rows={2}
                      className="w-full p-4 rounded-xl bg-surface-2 border border-app text-app focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Asistencia Guiada: Envío (Inactividad) */}
                <SmartHint 
                  stepId="checkout_shipping" 
                  message="Asegúrate de escribir tu dirección correctamente para que tu pedido llegue sin problemas." 
                  position="bottom" 
                  inactivityTrigger={true}
                  isInactive={isShippingInactive}
                  className="mt-4"
                />

                <button
                  onClick={handleNextStep}
                  className="w-full h-14 mt-6 bg-action text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-action"
                >
                  Continuar al Pago <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {/* PASO 2: MÉTODO DE PAGO */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={18} className="text-primary" />
                  <span className="font-semibold text-app">¿Cómo deseas pagar?</span>
                </div>

                {/* Asistencia Guiada: Pago */}
                <div className="relative mb-2">
                  <SmartHint 
                    stepId="checkout_payment" 
                    message="Puedes elegir cómo deseas pagar tu pedido. El pago lo realizarás al recibir o a las cuentas que te enviaremos." 
                    position="top" 
                    delay={500} 
                  />
                </div>

                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = formData.metodoPago === method.id
                    return (
                      <div
                        key={method.id}
                        onClick={() => setFormData({ ...formData, metodoPago: method.id })}
                        className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-app bg-surface-2 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-bold text-base ${isSelected ? 'text-primary' : 'text-app'}`}>
                            {method.title}
                          </h3>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-primary bg-primary text-white' : 'border-app'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </div>
                        <p className="text-sm text-muted pr-6 leading-relaxed">
                          {method.description}
                        </p>
                        
                        {/* Info Bancaria Adicional si es Transferencia */}
                        {isSelected && method.id === 'transferencia' && bankInfo?.banco && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 p-3 bg-surface rounded-xl border border-app text-sm"
                          >
                            <p className="text-muted mb-1">Transfiere a:</p>
                            <p className="font-bold text-app">{bankInfo.banco}</p>
                            <p className="text-app font-mono">{bankInfo.numeroCuenta}</p>
                            <p className="text-muted text-xs capitalize">{bankInfo.tipoCuenta}</p>
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {errors.metodoPago && (
                  <p className="text-sm text-error font-medium mt-2 text-center">{errors.metodoPago}</p>
                )}

                <div className="mt-8 pt-6 border-t border-app">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-app font-semibold">Total a pagar:</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(total())}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isPending || !formData.metodoPago}
                    className="w-full h-14 bg-action text-white rounded-2xl font-bold text-base transition-all duration-300 active:scale-95 hover:opacity-90 flex items-center justify-center disabled:opacity-50 shadow-lg shadow-action"
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

            {/* PASO 3: ÉXITO */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                
                {/* Asistencia Guiada: Éxito */}
                <div className="relative max-w-[280px] mx-auto mb-4">
                  <SmartHint 
                    stepId="checkout_success" 
                    message="¡Felicidades! Lograste realizar tu pedido. Nosotros nos encargaremos del resto." 
                    position="bottom" 
                    delay={300} 
                  />
                </div>

                <h2 className="text-2xl font-bold text-app mb-2">¡Pedido Exitoso!</h2>
                <p className="text-muted mb-6">
                  Tu pedido <span className="font-mono font-bold text-app">#{orderNumber}</span> ha sido recibido correctamente.
                </p>

                {whatsappAdmin ? (
                  <div className="space-y-4">
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
