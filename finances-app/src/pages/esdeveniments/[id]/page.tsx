import { useParams } from "react-router-dom"

export default function EsdevenimentDetallPage() {
  const { id } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold">Detall Esdeveniment</h1>
      <p className="text-muted-foreground">ID: {id} — Pendent d'implementar (Fase 3)</p>
    </div>
  )
}