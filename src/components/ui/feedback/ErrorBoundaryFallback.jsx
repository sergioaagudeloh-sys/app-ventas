import React, { Component } from 'react';
import { AlertOctagon, RefreshCcw, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { reportAppFailureToDeveloper } from '../../../services/telemetryService';

export class ErrorBoundaryFallback extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Callback para inyectar logs a telemetría central
    if (this.props.onErrorLogged) {
      this.props.onErrorLogged(error, errorInfo);
    }
    console.error('[ErrorBoundary] Capturado:', error, errorInfo);
    
    // Reporte automático silencioso al cargar el error
    const errorMsg = error?.message || String(error);
    const stack = error?.stack || errorInfo?.componentStack || '';
    reportAppFailureToDeveloper(errorMsg, stack).catch(err => {
      console.error('[ErrorBoundary] Error al reportar a telemetría:', err);
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReportManual = async () => {
    const errorMsg = this.state.error?.message || String(this.state.error);
    const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';
    try {
      await reportAppFailureToDeveloper(errorMsg, stack);
      alert('Bug reportado con éxito al equipo de desarrollo.');
    } catch (err) {
      console.error('[ErrorBoundary] Fallo al reportar manualmente:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Algo salió mal', fallbackDesc = 'El componente no se pudo renderizar correctamente.' } = this.props;

      return (
        <div className="w-full p-6 bg-slate-900/30 border border-slate-800 rounded-3xl backdrop-blur-md flex flex-col md:flex-row gap-5 items-start justify-between">
          <div className="flex-1 space-y-3 min-w-0">
            {/* Cabecera */}
            <div className="flex items-center gap-2 text-red-400">
              <AlertOctagon size={18} className="animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider">{fallbackTitle}</h3>
            </div>
            
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed max-w-md">
              {fallbackDesc} Si el problema persiste, intenta recargar el sitio o repórtalo a soporte técnico.
            </p>

            {/* Detalles Técnicos */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-indigo-400 transition-colors cursor-pointer outline-none"
              >
                {this.state.showDetails ? (
                  <>Ocultar Detalles <ChevronUp size={10} /></>
                ) : (
                  <>Ver Detalles Técnicos <ChevronDown size={10} /></>
                )}
              </button>

              {this.state.showDetails && (
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 overflow-x-auto max-h-[140px] overflow-y-auto">
                  <pre className="font-mono text-[9px] text-red-300 leading-normal whitespace-pre-wrap select-text">
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-[10px] font-black text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <RefreshCcw size={12} />
              Reintentar
            </button>
            
            <button
              type="button"
              onClick={this.handleReportManual}
              className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-indigo-500/35 hover:scale-105 active:scale-95 text-[10px] font-black text-[var(--color-text)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Send size={11} />
              Reportar Bug
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
