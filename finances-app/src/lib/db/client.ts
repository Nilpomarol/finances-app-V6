import { createClient, type Client } from "@libsql/client/web"

let _client: Client | null = null

/** Runs pending migrations that are safe to apply on every boot (idempotent). */
async function runMigrations(client: Client): Promise<void> {
  const migrations: Array<{ name: string; sql: string }> = [
    {
      name: "add-es-fix-to-categories",
      sql: `ALTER TABLE categories ADD COLUMN es_fix INTEGER NOT NULL DEFAULT 0`,
    },
  ]

  for (const migration of migrations) {
    try {
      await client.execute(migration.sql)
      console.log(`[DB] Migration applied: ${migration.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // "duplicate column" means already applied — safe to ignore
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        // already applied, skip silently
      } else {
        console.warn(`[DB] Migration "${migration.name}" skipped:`, msg)
      }
    }
  }
}

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

  await runMigrations(_client)

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