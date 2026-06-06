// jsPDF y jspdf-autotable se importan dinámicamente en cada función para reducir el bundle inicial del cliente
import { formatCurrency } from '../utils/formatters'
import { ORDER_STATES, PAYMENT_METHODS } from '../constants'
import useAppConfigStore from '../store/appConfigStore'

// Helper to convert Firestore timestamp or other date representation to a local Date object
function toLocalDate(ts) {
  if (!ts) return null
  if (ts.toDate) return ts.toDate()
  if (ts instanceof Date) return ts
  return new Date(ts)
}

/**
 * Generates and downloads the Financial Sales Report PDF.
 */
export async function exportSalesReportPDF({ dateFrom, dateTo, orders, products = [] }) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')
  const { creditsEnabled } = useAppConfigStore.getState()
  const from = new Date(dateFrom + 'T00:00:00')
  const to = new Date(dateTo + 'T23:59:59')

  const filtered = orders.filter(o => {
    if (o.estado !== ORDER_STATES.COMPLETED) return false
    const fecha = toLocalDate(o.createdAt)
    if (!fecha) return false
    if (!creditsEnabled && o.metodoPago === PAYMENT_METHODS.CREDIT) return false
    return fecha >= from && fecha <= to
  })

  // Build product lookup map
  const productMap = new Map()
  products.forEach(p => {
    productMap.set(p.id, p)
  })

  let cashTotal = 0
  let transferTotal = 0
  let creditTotal = 0
  let totalCost = 0

  const orderCalculations = filtered.map(o => {
    let orderCost = 0
    if (o.items && Array.isArray(o.items)) {
      o.items.forEach(item => {
        let itemCost = 0
        // Try finding by product ID first
        let prod = item.productoId ? productMap.get(item.productoId) : null
        // Fallback to name search
        if (!prod && item.nombre) {
          prod = products.find(p => p.nombre === item.nombre)
        }

        if (prod) {
          // If variantId exists, try to find variant cost
          let variant = null
          if (item.varianteId && prod.variantes) {
            variant = prod.variantes.find(v => v.id === item.varianteId)
          }
          
          if (variant && variant.precioCosto !== undefined && variant.precioCosto !== null && variant.precioCosto !== '') {
            itemCost = Number(variant.precioCosto) || 0
          } else if (prod.precioCosto !== undefined && prod.precioCosto !== null && prod.precioCosto !== '') {
            itemCost = Number(prod.precioCosto) || 0
          } else {
            // Default to base selling price * 0.6 if no cost configured, or just 0
            itemCost = 0
          }
        }
        orderCost += itemCost * (item.cantidad || 1)
      })
    }
    totalCost += orderCost
    const orderProfit = o.total - orderCost

    return {
      order: o,
      cost: orderCost,
      profit: orderProfit
    }
  })

  filtered.forEach(o => {
    if (o.metodoPago === PAYMENT_METHODS.CASH) {
      cashTotal += o.total
    } else if (o.metodoPago === PAYMENT_METHODS.TRANSFER) {
      transferTotal += o.total
    } else if (o.metodoPago === PAYMENT_METHODS.CREDIT) {
      creditTotal += o.total
    }
  })

  const totalVentas = cashTotal + transferTotal + creditTotal
  const totalProfit = totalVentas - totalCost
  const averageTicket = filtered.length > 0 ? totalVentas / filtered.length : 0

  const doc = new jsPDF()
  const primaryColor = [79, 70, 229]
  
  // Header
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE FINANCIERO DE VENTAS', 15, 25)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${dateFrom} al ${dateTo}`, 15, 33)
  doc.text(`Generado: ${new Date().toLocaleString()}`, 140, 33)
  
  // Metricas clave
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Ejecutivo', 15, 55)
  
  // Grid boxes
  doc.setDrawColor(243, 244, 246)
  doc.setFillColor(249, 250, 251)
  
  // Row 1
  doc.rect(15, 62, 85, 25, 'F')
  doc.rect(110, 62, 85, 25, 'F')
  
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('TOTAL FACTURADO', 20, 68)
  doc.text('TRANSACCIONES EXITOSAS', 115, 68)
  
  doc.setFontSize(15)
  doc.setTextColor(79, 70, 229)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(totalVentas), 20, 80)
  doc.text(`${filtered.length} pedidos`, 115, 80)
  
  // Row 2
  doc.setFillColor(249, 250, 251)
  doc.rect(15, 92, 85, 25, 'F')
  doc.rect(110, 92, 85, 25, 'F')
  
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.setFont('helvetica', 'normal')
  doc.text('TICKET PROMEDIO', 20, 98)
  doc.text('DESGLOSE METODOS DE PAGO', 115, 98)
  
  doc.setFontSize(13)
  doc.setTextColor(31, 41, 55)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(averageTicket), 20, 110)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let currentY = 107
  doc.text(`Efectivo: ${formatCurrency(cashTotal)}`, 115, currentY)
  currentY += 5
  doc.text(`Transferencia: ${formatCurrency(transferTotal)}`, 115, currentY)
  if (creditsEnabled) {
    currentY += 5
    doc.text(`Credito: ${formatCurrency(creditTotal)}`, 115, currentY)
  }

  // Row 3 (Cost & Profit)
  doc.setFillColor(249, 250, 251)
  doc.rect(15, 122, 85, 25, 'F')
  doc.rect(110, 122, 85, 25, 'F')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.setFont('helvetica', 'normal')
  doc.text('COSTO TOTAL DE VENTAS', 20, 128)
  doc.text('GANANCIA NETA ESTIMADA', 115, 128)

  doc.setFontSize(13)
  doc.setTextColor(220, 38, 38) // Reddish for cost
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(totalCost), 20, 140)

  doc.setTextColor(22, 163, 74) // Greenish for profit
  doc.text(formatCurrency(totalProfit), 115, 140)
  
  // Table
  doc.setFontSize(14)
  doc.setTextColor(31, 41, 55)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalle de Ventas', 15, 160)
  
  const tableHeaders = [['Fecha/Hora', 'Cliente', 'Metodo de Pago', 'Venta', 'Ganancia']]
  const tableData = orderCalculations.map(item => {
    const o = item.order
    const fecha = toLocalDate(o.createdAt)?.toLocaleString('es-ES') || 'N/A'
    const cliente = o.cliente?.nombre || 'Cliente General'
    const pago = o.metodoPago === PAYMENT_METHODS.CASH 
      ? 'Efectivo' 
      : o.metodoPago === PAYMENT_METHODS.TRANSFER 
      ? 'Transferencia' 
      : 'Credito'
    return [fecha, cliente, pago, formatCurrency(o.total), formatCurrency(item.profit)]
  })
  
  autoTable(doc, {
    startY: 166,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, halign: 'left' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  })
  
  doc.save(`Reporte_Ventas_${dateFrom}_a_${dateTo}.pdf`)
}

/**
 * Generates and downloads the Product Rotation and Inventory Report PDF.
 */
export async function exportRotationReportPDF({ dateFrom, dateTo, orders, products }) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')
  const from = new Date(dateFrom + 'T00:00:00')
  const to = new Date(dateTo + 'T23:59:59')

  const filtered = orders.filter(o => {
    if (o.estado !== ORDER_STATES.COMPLETED) return false
    const fecha = toLocalDate(o.createdAt)
    if (!fecha) return false
    return fecha >= from && fecha <= to
  })

  const conteo = {}
  filtered.forEach(order => {
    (order.items || []).forEach(item => {
      const nombre = item.nombre || 'Sin nombre'
      if (!conteo[nombre]) conteo[nombre] = { cantidad: 0, total: 0 }
      conteo[nombre].cantidad += item.cantidad || 1
      conteo[nombre].total += (item.precio || 0) * (item.cantidad || 1)
    })
  })

  const stats = products.map(p => {
    const sales = conteo[p.nombre] || { cantidad: 0, total: 0 }
    const totalStock = (p.variantes || []).reduce((sum, v) => sum + (v.stock || 0), 0)
    
    let recomendacion = 'Mantener'
    
    if (sales.cantidad > 0 && totalStock <= (p.umbralAlerta || 5)) {
      recomendacion = 'Surtir Urgente'
    } else if (sales.cantidad === 0) {
      recomendacion = 'Descontinuar / Liquidar'
    }
    
    return {
      nombre: p.nombre,
      vendidas: sales.cantidad,
      ingresos: sales.total,
      stock: totalStock,
      recomendacion
    }
  })

  stats.sort((a, b) => b.vendidas - a.vendidas)

  const doc = new jsPDF()
  const primaryColor = [79, 70, 229]
  
  // Header
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE DE ROTACIÓN E INVENTARIO', 15, 25)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo analizado: ${dateFrom} al ${dateTo}`, 15, 33)
  doc.text(`Generado: ${new Date().toLocaleString()}`, 140, 33)
  
  // Titulo
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Análisis de Rotación de Productos', 15, 55)
  
  const tableHeaders = [['Producto', 'Unidades Vendidas', 'Ingresos Generados', 'Stock Actual', 'Acción Recomendada']]
  const tableData = stats.map(s => [
    s.nombre,
    s.vendidas,
    formatCurrency(s.ingresos),
    s.stock,
    s.recomendacion
  ])
  
  autoTable(doc, {
    startY: 62,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, halign: 'left' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'center' }
    },
    didParseCell: function(data) {
      if (data.column.index === 4 && data.cell.section === 'body') {
        const text = data.cell.raw
        if (text.includes('Surtir')) {
          data.cell.styles.textColor = [16, 185, 129]
          data.cell.styles.fontStyle = 'bold'
        } else if (text.includes('Descontinuar')) {
          data.cell.styles.textColor = [239, 68, 68]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    }
  })
  
  doc.save(`Reporte_Rotacion_${dateFrom}_a_${dateTo}.pdf`)
}

/**
 * Generates and downloads the Developer Monthly Commission Receipt PDF.
 */
export async function exportDeveloperReceiptPDF({ signatureDataUrl, orders, config, billingMetrics }) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const monthLabel = `${MONTH_NAMES_ES[currentMonth]} ${currentYear}`

  const currentPercent = billingMetrics?.commissionPercent ?? 1

  const currentMonthOrders = orders.filter(o => {
    if (o.estado !== ORDER_STATES.COMPLETED) return false
    if (!o.createdAt) return false
    const fecha = toLocalDate(o.createdAt)
    return fecha && fecha.getFullYear() === currentYear && fecha.getMonth() === currentMonth
  })

  const totalVentas = currentMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalComision = (totalVentas * currentPercent) / 100

  const doc = new jsPDF()
  const primaryColor = [16, 185, 129]

  // Header banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBO DE COMISIÓN DE DESARROLLADOR', 15, 22)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${monthLabel}`, 15, 30)
  doc.text(`Generado: ${new Date().toLocaleString()}`, 140, 30)

  // Detalle de las Partes
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMACIÓN DE COBRO', 15, 52)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Desarrollador: Soporte Técnico / Administrador del Sistema`, 15, 59)
  doc.text(`Cliente: ${config.sellerName || 'Propietaria de la Tienda'} (Dueña de la Tienda)`, 15, 64)
  doc.text(`Porcentaje de Comisión: ${currentPercent}%`, 15, 69)

  // Grid boxes
  doc.setDrawColor(243, 244, 246)
  doc.setFillColor(249, 250, 251)
  doc.rect(15, 76, 85, 20, 'F')
  doc.rect(110, 76, 85, 20, 'F')

  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('VENTAS TOTALES PROCESADAS', 20, 82)
  doc.text('TOTAL COMISIÓN NETO A PAGAR', 115, 82)

  doc.setFontSize(13)
  doc.setTextColor(31, 41, 55)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(totalVentas), 20, 91)
  doc.setTextColor(16, 185, 129)
  doc.text(formatCurrency(totalComision), 115, 91)

  // Table de Detalle
  doc.setFontSize(11)
  doc.setTextColor(31, 41, 55)
  doc.text('Desglose de Pedidos del Periodo', 15, 107)

  const tableHeaders = [['Fecha/Hora', 'Cliente Venta', 'Total Venta', 'Comisión']]
  const tableData = currentMonthOrders.map(o => {
    const fecha = toLocalDate(o.createdAt)?.toLocaleString('es-ES') || 'N/A'
    const clienteVenta = o.cliente?.nombre || 'Cliente General'
    const comisionIndividual = (o.total * currentPercent) / 100
    return [
      fecha, 
      clienteVenta, 
      formatCurrency(o.total || 0), 
      formatCurrency(comisionIndividual)
    ]
  })

  const result = autoTable(doc, {
    startY: 112,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, halign: 'left' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  })

  // Seccion de Firma
  const finalY = (result && result.lastY) ? result.lastY + 15 : 150;

  if (finalY + 45 > 297) {
    doc.addPage()
    doc.text('Firma de Conformidad', 15, 30)
    doc.addImage(signatureDataUrl, 'PNG', 15, 35, 60, 30)
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('_____________________________________', 15, 75)
    doc.text(`Firma del Cliente: ${config.sellerName || 'Propietaria de la Tienda'}`, 15, 80)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 84)
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Firma de Conformidad', 15, finalY)
    doc.addImage(signatureDataUrl, 'PNG', 15, finalY + 5, 60, 30)
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('_____________________________________', 15, finalY + 40)
    doc.text(`Firma del Cliente: ${config.sellerName || 'Propietaria de la Tienda'}`, 15, finalY + 45)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, finalY + 49)
  }

  doc.save(`Recibo_Comision_${monthLabel.replace(' ', '_')}.pdf`)
}
