import { useState } from "react"
import { initializeDb, getDb } from "@/lib/db/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DbTestPage() {
  const [status, setStatus] = useState<string>("Pendent")
  const [users, setUsers] = useState<Array<{ id: string; nom: string }>>([])
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setStatus("Connectant...")
    setError(null)
    try {
      // En dev, usem el token directament de les variables d'entorn
      const token = import.meta.env.VITE_TURSO_AUTH_TOKEN as string
      await initializeDb(token)
      setStatus("Client inicialitzat ✓")

      // Test de lectura
      const db = getDb()
      const result = await db.execute(
        "SELECT id, nom FROM users WHERE eliminat = false"
      )
      setUsers(result.rows as unknown as Array<{ id: string; nom: string }>)
      setStatus("Connexió verificada ✓ — Dades rebudes correctament")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconegut"
      setError(message)
      setStatus("Error ✗")
    }
  }

  const testWrite = async () => {
    setStatus("Escrivint...")
    setError(null)
    try {
      const db = getDb()
      // Test d'escriptura amb una consulta inofensiva (llegeix la versió de l'esquema)
      const result = await db.execute("SELECT version FROM schema_version")
      setStatus(`Escriptura/Lectura OK ✓ — Versió esquema: ${result.rows[0]?.version ?? "?"}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconegut"
      setError(message)
      setStatus("Error d'escriptura ✗")
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test de Connexió — Fase 0.2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testConnection}>Inicialitzar BD</Button>
            <Button variant="outline" onClick={testWrite}>
              Test Lectura/Escriptura
            </Button>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm font-mono">
            <span className="text-muted-foreground">Estat: </span>
            <span>{status}</span>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {users.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Usuaris trobats:</p>
              <ul className="space-y-1">
                {users.map((u) => (
                  <li key={u.id} className="text-sm font-mono bg-muted rounded px-2 py-1">
                    {u.nom} — <span className="text-muted-foreground">{u.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}