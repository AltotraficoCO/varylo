'use client'

import { Button } from "@/components/ui/button"

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-destructive/10 text-destructive text-xl font-bold">!</div>
        <h2 className="text-xl font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error al cargar esta sección. Por favor intenta de nuevo.
        </p>
        <p className="text-xs text-muted-foreground/60 font-mono break-all">
          {error?.message}
        </p>
        <Button onClick={reset} variant="outline">
          Reintentar
        </Button>
      </div>
    </div>
  )
}
