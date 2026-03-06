import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"

export interface AssignmentRule {
  id: string
  user_id: string
  paraula_clau: string
  categoria_id: string
  data_modificacio: number
  eliminat: boolean
}

export async function getRules(userId: string): Promise<AssignmentRule[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM assignment_rules WHERE user_id = ? AND eliminat = 0 ORDER BY data_modificacio DESC`,
    args: [userId],
  })
  return result.rows as unknown as AssignmentRule[]
}

export async function createRule(
  userId: string,
  paraula_clau: string,
  categoria_id: string
): Promise<AssignmentRule> {
  const db = getDb()
  const id = generateId()
  const ts = now()

  await db.execute({
    sql: `INSERT INTO assignment_rules (id, user_id, paraula_clau, categoria_id, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, 0)`,
    args: [id, userId, paraula_clau.toLowerCase(), categoria_id, ts],
  })

  return { id, user_id: userId, paraula_clau, categoria_id, data_modificacio: ts, eliminat: false }
}

export async function deleteRule(id: string, userId: string): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE assignment_rules SET eliminat = 1, data_modificacio = ? WHERE id = ? AND user_id = ?`,
    args: [now(), id, userId],
  })
}