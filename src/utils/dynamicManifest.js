/**
 * Dibuja un rectángulo con esquinas redondeadas.
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Genera una imagen PNG en Base64 colocando el logo de la tienda centrado sobre un fondo redondeado de color.
 */
export function generateBrandIcon(appIcon, primaryColor) {
  return new Promise((resolve) => {
    if (!appIcon) {
      resolve('/pwa-192x192.png')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Rellenar fondo con color primario usando esquinas redondeadas
    ctx.fillStyle = primaryColor || '#6d28d9'
    drawRoundedRect(ctx, 0, 0, 512, 512, 96)
    ctx.fill()

    // Cargar la imagen del logo
    const img = new Image()
    img.crossOrigin = 'anonymous' // Evitar problemas de CORS si la imagen viene de Firebase Storage
    img.onload = () => {
      // Dibujar imagen centrada con algo de padding (por ejemplo 12% de padding)
      const padding = 64
      const destSize = 512 - (padding * 2)
      ctx.drawImage(img, padding, padding, destSize, destSize)
      try {
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        console.error('Error al generar dataURL del canvas:', err)
        resolve(appIcon) // Fallback al original si falla el canvas por CORS o similar
      }
    }
    img.onerror = () => {
      console.warn('No se pudo cargar la imagen del logo de la tienda para generar el icono PWA.')
      resolve(appIcon) // Fallback al original si falla la carga
    }
    img.src = appIcon
  })
}

/**
 * Utilidad para generar e inyectar dinámicamente el manifest de la PWA
 * basado en la configuración real de marca (Nombre e Icono) en runtime.
 */
export async function updateDynamicManifest(appName, appIcon, pwaAppName, pwaAppIcon, pwaUseBrandIcon, primaryColor) {
  const finalAppName = pwaAppName || appName
  if (!finalAppName) return

  const displayName = finalAppName
  const shortName = finalAppName.substring(0, 12)

  // Determinar la URL final del icono
  let iconUrl = '/pwa-192x192.png'
  if (pwaUseBrandIcon && appIcon) {
    iconUrl = await generateBrandIcon(appIcon, primaryColor)
  } else {
    iconUrl = pwaAppIcon || appIcon || '/pwa-192x192.png'
  }

  const manifest = {
    name: displayName,
    short_name: shortName,
    description: `Catálogo de compras y pedidos para ${displayName}`,
    start_url: window.location.origin + '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: primaryColor || '#6d28d9',
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  }

  // Convertir el JSON a string y codificarlo como un Data URI Base64
  const manifestString = JSON.stringify(manifest)
  const manifestBlob = new Blob([manifestString], { type: 'application/json' })
  const manifestUrl = URL.createObjectURL(manifestBlob)

  // Buscar el tag de manifest existente en el head del index.html
  let link = document.querySelector('link[rel="manifest"]')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }

  // Actualizar el href con el manifest dinámico generado
  link.href = manifestUrl
}

