/**
 * Utilidades para generar y reproducir sonidos de alerta sintetizados
 * en tiempo real utilizando la Web Audio API nativa del navegador.
 * Evita la necesidad de descargar archivos de audio externos.
 */

export function playAdminSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Primer tono (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);

    // Segundo tono (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('AudioContext no soportado o bloqueado por interacción del usuario:', e);
  }
}

export function playClientSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, time, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);
    };

    // Arpegio de C5 -> E5 -> G5
    playTone(523.25, ctx.currentTime, 0.25);
    playTone(659.25, ctx.currentTime + 0.08, 0.25);
    playTone(783.99, ctx.currentTime + 0.16, 0.35);
  } catch (e) {
    console.warn('AudioContext no soportado o bloqueado por interacción del usuario:', e);
  }
}

/**
 * Motor de sonidos del Notification Center.
 * Genera melodías sintetizadas distintas según la categoría del evento.
 *
 * Categorías: 'pedido' | 'entrega' | 'inventario' | 'promocion' | 'alerta' | 'cuenta'
 *
 * @param {string} category   - Categoría de sonido del NC
 * @param {boolean} [enabled] - Si el usuario tiene sonido habilitado
 */
export function playSynthesizedSound(category = 'pedido', enabled = true) {
  if (!enabled) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const tone = (type, freq, start, dur, vol = 0.09) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(vol, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }

    switch (category) {
      case 'pedido':
        // Arpegio alegre ascendente - Do Mayor
        tone('sine', 523.25, 0.00, 0.15)
        tone('sine', 659.25, 0.10, 0.15)
        tone('sine', 783.99, 0.20, 0.20)
        tone('sine', 1046.5, 0.30, 0.30, 0.07)
        break

      case 'entrega':
        // Dos tonos suaves tipo campana
        tone('sine',  880.0, 0.00, 0.25)
        tone('sine', 1108.7, 0.15, 0.25)
        tone('sine',  880.0, 0.35, 0.35, 0.06)
        break

      case 'inventario':
        // Tono menor de advertencia - Fa menor
        tone('triangle', 349.23, 0.00, 0.20)
        tone('triangle', 415.30, 0.15, 0.20)
        tone('triangle', 349.23, 0.30, 0.35, 0.07)
        break

      case 'promocion':
        // Melodía festiva rápida - escala pentatónica
        tone('sine', 523.25, 0.00, 0.10)
        tone('sine', 659.25, 0.08, 0.10)
        tone('sine', 783.99, 0.16, 0.10)
        tone('sine', 1046.5, 0.24, 0.10)
        tone('sine', 1318.5, 0.32, 0.25, 0.07)
        break

      case 'alerta':
        // Alarma pulsante de alta prioridad
        tone('square', 880.0, 0.00, 0.10, 0.08)
        tone('square', 880.0, 0.15, 0.10, 0.08)
        tone('square', 880.0, 0.30, 0.10, 0.08)
        tone('sine',   440.0, 0.45, 0.30, 0.06)
        break

      case 'cuenta':
        // Tono suave de confirmación
        tone('sine', 440.0, 0.00, 0.20)
        tone('sine', 554.4, 0.15, 0.20)
        tone('sine', 659.3, 0.30, 0.30, 0.06)
        break

      default:
        playClientSound()
    }
  } catch (e) {
    console.warn('[NC Audio] AudioContext no disponible:', e)
  }
}
