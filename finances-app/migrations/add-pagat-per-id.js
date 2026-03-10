/**
 * Migration: add pagat_per_id column to transactions table.
 * Run once: node migrations/add-pagat-per-id.js
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
  await db.execute(
    `ALTER TABLE transactions ADD COLUMN pagat_per_id TEXT REFERENCES people(id)`
  )
  console.log("✓ Column pagat_per_id added to transactions.")
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
