import { createClient, type Client } from "@libsql/client/web"

let _client: Client | null = null

export async function initializeDb(token: string, url?: string): Promise<Client> {
  if (_client) return _client

  const dbUrl = url ?? (import.meta.env.VITE_TURSO_DATABASE_URL as string)

  if (!dbUrl) {
    throw new Error("URL de la base de dades no disponible")
  }

  _client = createClient({
    url: dbUrl,
    authToken: token,
    syncUrl: dbUrl,
    syncInterval: 60,
  })

  await _client.sync()
  console.log("[DB] Client inicialitzat i sincronitzat correctament")
  return _client
}

export function getDb(): Client {
  if (!_client) {
    throw new Error("[DB] El client no està inicialitzat. Crida initializeDb() primer.")
  }
  return _client
}

export async function syncDb(): Promise<void> {
  if (!_client) return
  await _client.sync()
  console.log("[DB] Sincronització manual completada")
}

export function closeDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}