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
    sql: `INSERT INTO categories (id, user_id, nom, tipus, pressupost_mensual, color, icona, es_fix, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false)`,
    args: [id, userId, data.nom, data.tipus, data.pressupost_mensual ?? null, data.color, data.icona, data.es_fix ? 1 : 0, ts],
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
              es_fix = COALESCE(?, es_fix),
              data_modificacio = ?
          WHERE id = ? AND user_id = ? AND eliminat = false`,
    args: [
      data.nom ?? null,
      data.tipus ?? null,
      data.pressupost_mensual ?? null,
      data.color ?? null,
      data.icona ?? null,
      data.es_fix !== undefined ? (data.es_fix ? 1 : 0) : null,
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

/** Retorna el resum de despesa del mes actual i any actual per categoria */
export async function getCategorySummaryCurrentMonth(
  userId: string
): Promise<Array<{ categoria_id: string; total: number; total_any: number; count_any: number; count_mes: number }>> {
  const db = getDb()
  const n = new Date()
  const monthStart = new Date(n.getFullYear(), n.getMonth(), 1).getTime()
  const monthEnd = new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  const yearStart = new Date(n.getFullYear(), 0, 1).getTime()
  const yearEnd = new Date(n.getFullYear(), 11, 31, 23, 59, 59, 999).getTime()

  const result = await db.execute({
    sql: `SELECT
            t.categoria_id,
            SUM(CASE WHEN t.data >= ? AND t.data <= ?
              THEN t.import_trs - COALESCE((SELECT SUM(s.import_degut) FROM transaction_splits s WHERE s.transaccio_id = t.id AND s.eliminat = false), 0)
              ELSE 0 END) as total,
            SUM(t.import_trs - COALESCE((SELECT SUM(s.import_degut) FROM transaction_splits s WHERE s.transaccio_id = t.id AND s.eliminat = false), 0)) as total_any,
            COUNT(*) as count_any,
            SUM(CASE WHEN t.data >= ? AND t.data <= ? THEN 1 ELSE 0 END) as count_mes
          FROM transactions t
          WHERE t.user_id = ?
            AND t.eliminat = false
            AND t.tipus = 'despesa'
            AND t.liquidacio_persona_id IS NULL
            AND t.data >= ? AND t.data <= ?
            AND t.categoria_id IS NOT NULL
          GROUP BY t.categoria_id`,
    args: [monthStart, monthEnd, monthStart, monthEnd, userId, yearStart, yearEnd],
  })
  return result.rows as unknown as Array<{ categoria_id: string; total: number; total_any: number; count_any: number; count_mes: number }>
}