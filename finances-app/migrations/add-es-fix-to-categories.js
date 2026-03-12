/**
 * Migration: add es_fix column to categories table.
 * Run once: node migrations/add-es-fix-to-categories.js
 *
 * Requires env vars (any of these patterns work):
 *   - TURSO_DATABASE_URL + TURSO_AUTH_TOKEN  (vercel dev / Vercel env)
 *   - VITE_TURSO_DATABASE_URL + VITE_TURSO_AUTH_TOKEN  (.env.local)
 *
 * With .env.local:  node --env-file=.env.local migrations/add-es-fix-to-categories.js
 * With Turso CLI:   turso db shell <db-name> "ALTER TABLE categories ADD COLUMN es_fix INTEGER NOT NULL DEFAULT 0"
 */
import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error("Missing Turso credentials. Try one of:")
  console.error("  node --env-file=.env.local migrations/add-es-fix-to-categories.js")
  console.error('  turso db shell <db-name> "ALTER TABLE categories ADD COLUMN es_fix INTEGER NOT NULL DEFAULT 0"')
  process.exit(1)
}

const db = createClient({ url, authToken })

try {
  await db.execute(
    `ALTER TABLE categories ADD COLUMN es_fix INTEGER NOT NULL DEFAULT 0`
  )
  console.log("✓ Column es_fix added to categories (default 0 = variable).")
} catch (err) {
  if (err.message?.includes("duplicate column")) {
    console.log("Column already exists, nothing to do.")
  } else {
    console.error("Migration failed:", err.message)
    process.exit(1)
  }
} finally {
  db.close()
}


const db = createClient({ url, authToken })

try {
  await db.execute(
    `ALTER TABLE categories ADD COLUMN es_fix INTEGER NOT NULL DEFAULT 0`
  )
  console.log("✓ Column es_fix added to categories (default 0 = variable).")
} catch (err) {
  if (err.message?.includes("duplicate column")) {
    console.log("Column already exists, nothing to do.")
  } else {
    console.error("Migration failed:", err.message)
    process.exit(1)
  }
} finally {
  db.close()
}
