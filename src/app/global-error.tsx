'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <div className="text-center space-y-4 p-8">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-red-100 text-red-600 text-xl font-bold">!</div>
          <h2 className="text-xl font-semibold">Algo salió mal</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Ocurrió un error inesperado. Por favor intenta de nuevo.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
