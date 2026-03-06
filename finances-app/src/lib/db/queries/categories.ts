import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { Category } from "@/types/database"

export async function getCategories(userId: string): Promise<Category[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM categories
          WHERE user_id = ? AND eliminat = false
          ORDER BY tipus ASC, nom ASC`,
    args: [userId],
  })
  return result.rows as unknown as Category[]
}

export async function createCategory(
  userId: string,
  data: Omit<Category, "id" | "user_id" | "data_modificacio" | "eliminat">
): Promise<Category> {
  const db = getDb()
  const id = generateId()
  const ts = now()

  await db.execute({
    sql: `INSERT INTO categories (id, user_id, nom, tipus, pressupost_mensual, color, icona, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, false)`,
    args: [id, userId, data.nom, data.tipus, data.pressupost_mensual ?? null, data.color, data.icona, ts],
  })

  return { id, user_id: userId, ...data, data_modificacio: ts, eliminat: false }
}

export async function updateCategory(
  id: string,
  userId: string,
  data: Partial<Omit<Category, "id" | "user_id" | "eliminat">>
): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE categories
          SET nom = COALESCE(?, nom),
              tipus = COALESCE(?, tipus),
              pressupost_mensual = ?,
              color = COALESCE(?, color),
              icona = COALESCE(?, icona),
              data_modificacio = ?
          WHERE id = ? AND user_id = ? AND eliminat = false`,
    args: [
      data.nom ?? null,
      data.tipus ?? null,
      data.pressupost_mensual ?? null,
      data.color ?? null,
      data.icona ?? null,
      now(),
      id,
      userId,
    ],
  })
}

export async function deleteCategory(id: string, userId: string): Promise<void> {
  const db = getDb()
  const ts = now()
  // Soft delete de la categoria + desvincula les transaccions associades
  await db.batch([
    {
      sql: `UPDATE categories SET eliminat = true, data_modificacio = ?
            WHERE id = ? AND user_id = ?`,
      args: [ts, id, userId],
    },
    {
      sql: `UPDATE transactions SET categoria_id = NULL, data_modificacio = ?
            WHERE categoria_id = ? AND user_id = ? AND eliminat = false`,
      args: [ts, id, userId],
    },
  ])
}

/** Retorna una categoria per ID */
export async function getCategoryById(
  id: string,
  userId: string
): Promise<Category | null> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM categories WHERE id = ? AND user_id = ? AND eliminat = false`,
    args: [id, userId],
  })
  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as Category
}

/** Retorna el resum de despesa del mes actual per categoria */
export async function getCategorySummaryCurrentMonth(
  userId: string
): Promise<Array<{ categoria_id: string; total: number }>> {
  const db = getDb()
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

  const result = await db.execute({
    sql: `SELECT categoria_id, SUM(import_trs) as total
          FROM transactions
          WHERE user_id = ?
            AND eliminat = false
            AND tipus = 'despesa'
            AND liquidacio_persona_id IS NULL
            AND data >= ? AND data <= ?
            AND categoria_id IS NOT NULL
          GROUP BY categoria_id`,
    args: [userId, start, end],
  })
  return result.rows as unknown as Array<{ categoria_id: string; total: number }>
}