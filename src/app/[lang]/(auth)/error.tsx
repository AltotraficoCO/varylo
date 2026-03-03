'use client'

import { Button } from "@/components/ui/button"

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md p-8">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-destructive/10 text-destructive text-xl font-bold">!</div>
        <h2 className="text-xl font-semibold">Error de autenticación</h2>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error. Por favor intenta de nuevo.
        </p>
        <Button onClick={reset} variant="outline">
          Reintentar
        </Button>
      </div>
    </div>
  )
}
