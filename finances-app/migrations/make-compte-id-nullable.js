/**
 * Migration: make compte_id nullable in transactions table.
 * SQLite requires recreating the table to remove a NOT NULL constraint.
 * Run once: node migrations/make-compte-id-nullable.js
 * Requires: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars.
 */
import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN env vars.")
  process.exit(1)
}

const db = createClient({ url, authToken })

try {
  await db.execute({ sql: "PRAGMA foreign_keys=OFF", args: [] })

  await db.execute({
    sql: `CREATE TABLE transactions_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      concepte TEXT NOT NULL,
      data INTEGER NOT NULL,
      import_trs REAL NOT NULL,
      notes TEXT,
      compte_id TEXT REFERENCES accounts(id),
      compte_desti_id TEXT REFERENCES accounts(id),
      categoria_id TEXT REFERENCES categories(id),
      esdeveniment_id TEXT REFERENCES events(id),
      event_tag_id TEXT REFERENCES event_tags(id),
      tipus TEXT NOT NULL CHECK(tipus IN ('ingres', 'despesa', 'transferencia')),
      recurrent INTEGER NOT NULL DEFAULT 0,
      liquidacio_persona_id TEXT REFERENCES people(id),
      pagat_per_id TEXT REFERENCES people(id),
      data_modificacio INTEGER NOT NULL,
      eliminat INTEGER NOT NULL DEFAULT 0
    )`,
    args: [],
  })

  await db.execute({
    sql: `INSERT INTO transactions_new
          SELECT id, user_id, concepte, data, import_trs, notes,
                 compte_id, compte_desti_id, categoria_id, esdeveniment_id,
                 event_tag_id, tipus, recurrent, liquidacio_persona_id,
                 pagat_per_id, data_modificacio, eliminat
          FROM transactions`,
    args: [],
  })

  await db.execute({ sql: "DROP TABLE transactions", args: [] })
  await db.execute({ sql: "ALTER TABLE transactions_new RENAME TO transactions", args: [] })
  await db.execute({ sql: "PRAGMA foreign_keys=ON", args: [] })

  console.log("✓ compte_id is now nullable in transactions.")
} catch (err) {
  console.error("Migration failed:", err.message)
  process.exit(1)
} finally {
  db.close()
}
