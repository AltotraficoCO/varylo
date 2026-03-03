import Link from "next/link"

export default function CompanyNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-4xl font-bold text-muted-foreground">404</h2>
        <p className="text-lg font-medium">Página no encontrada</p>
        <p className="text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/company"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  )
}
