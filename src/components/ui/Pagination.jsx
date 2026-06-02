import React from 'react'

/**
 * Componente genérico y estándar de Paginación UI/UX para la plataforma.
 * 
 * @param {number} currentPage - Página actual activa (1-indexed).
 * @param {number} totalItems - Total de elementos de la lista.
 * @param {number} itemsPerPage - Cantidad de elementos renderizados por página.
 * @param {function} onPageChange - Callback al cambiar de página. Recibe el nuevo número de página.
 */
export default function Pagination({ currentPage, totalItems, itemsPerPage = 10, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalPages <= 1) return null

  const handlePageSelect = (page) => {
    if (page < 1 || page > totalPages) return
    onPageChange(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex justify-center items-center gap-2 mt-8 pb-4">
      {/* Botón Anterior */}
      <button
        disabled={currentPage === 1}
        onClick={() => handlePageSelect(currentPage - 1)}
        className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 font-bold text-sm bg-surface text-app hover:bg-surface-2 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Página anterior"
      >
        ‹
      </button>

      {/* Números de Página */}
      {Array.from({ length: totalPages }).map((_, idx) => {
        const pageNum = idx + 1
        const isActive = currentPage === pageNum
        return (
          <button
            key={pageNum}
            onClick={() => handlePageSelect(pageNum)}
            className={`h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 font-bold text-sm transition-all shadow-sm ${
              isActive ? 'bg-primary text-white' : 'bg-surface text-app hover:bg-surface-2'
            }`}
          >
            {pageNum}
          </button>
        )
      })}

      {/* Botón Siguiente */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => handlePageSelect(currentPage + 1)}
        className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 font-bold text-sm bg-surface text-app hover:bg-surface-2 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Página siguiente"
      >
        ›
      </button>
    </div>
  )
}
