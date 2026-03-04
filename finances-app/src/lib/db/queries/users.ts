import { getDb } from "../client"
import type { User } from "@/types/database"

/**
 * Retorna tots els usuaris actius (per a la pantalla de selecció de perfil).
 */
export async function getUsers(): Promise<User[]> {
  const db = getDb()
  const result = await db.execute(
    "SELECT * FROM users WHERE eliminat = false ORDER BY nom ASC"
  )
  return result.rows as unknown as User[]
}

/**
 * Valida el PIN d'un usuari. Retorna l'usuari si el PIN és correcte.
 */
export async function validateUserPin(
  userId: string,
  pin: string
): Promise<User | null> {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ? AND pin = ? AND eliminat = false",
    args: [userId, pin],
  })
  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as User
}