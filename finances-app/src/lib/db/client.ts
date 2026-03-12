import { createClient, type Client } from "@libsql/client/web"

let _client: Client | null = null

/** Runs pending migrations that are safe to apply on every boot (idempotent). */
async function runMigrations(client: Client): Promise<void> {
  const migrations: Array<{ name: string; sql: string }> = [
    {
      name: "add-es-fix-to-categories",
      sql: `ALTER TABLE categories ADD COLUMN es_fix INTEGER NOT NULL DEFAULT 0`,
    },
    {
      name: "create-recurring-templates",
      sql: `CREATE TABLE IF NOT EXISTS recurring_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        concepte TEXT NOT NULL,
        import_trs REAL NOT NULL,
        compte_id TEXT,
        categoria_id TEXT,
        tipus TEXT NOT NULL DEFAULT 'despesa',
        dia_del_mes INTEGER NOT NULL,
        notes TEXT,
        pagat_per_id TEXT,
        darrer_mes_gestionat TEXT,
        data_modificacio INTEGER NOT NULL,
        eliminat INTEGER NOT NULL DEFAULT 0
      )`,
    },
    {
      name: "add-user-import-to-recurring-templates",
      sql: `ALTER TABLE recurring_templates ADD COLUMN user_import REAL`,
    },
    {
      name: "add-data-inici-to-recurring-templates",
      sql: `ALTER TABLE recurring_templates ADD COLUMN data_inici INTEGER`,
    },
    {
      name: "create-recurring-skips",
      sql: `CREATE TABLE IF NOT EXISTS recurring_skips (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        data_modificacio INTEGER NOT NULL,
        eliminat INTEGER NOT NULL DEFAULT 0
      )`,
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