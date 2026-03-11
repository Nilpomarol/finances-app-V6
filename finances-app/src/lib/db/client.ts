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
  })

  console.log("[DB] Client inicialitzat correctament")
  return _client
}

export function getDb(): Client {
  if (!_client) {
    throw new Error("[DB] El client no està inicialitzat. Crida initializeDb() primer.")
  }
  return _client
}

export async function syncDb(): Promise<void> {
  // No-op: the web client connects directly to the remote DB on every query
}

export function closeDb(): void {
  if (_client) {
    _client.close()
    _client = null
  }
}