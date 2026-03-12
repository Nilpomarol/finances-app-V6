import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { RecurringTemplate } from "@/types/database"

export interface RecurringTemplateData {
  concepte: string
  import_trs: number
  user_import: number
  compte_id: string | null
  categoria_id: string | null
  tipus: "ingres" | "despesa"
  dia_del_mes: number
  notes: string | null
  pagat_per_id: string | null
}

/** Retorna els templates pendents (no eliminats) per a un usuari.
 *  El filtre de dia i mes es fa al hook per flexibilitat. */
export async function getPendingRecurringTemplates(
  userId: string,
): Promise<RecurringTemplate[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM recurring_templates
          WHERE user_id = ? AND eliminat = 0
          ORDER BY concepte ASC`,
    args: [userId],
  })
  return (result.rows as unknown as RecurringTemplate[]).map(r => ({
    ...r,
    eliminat: Boolean(r.eliminat),
  }))
}

/** Upsert dins d'una transacció DB existent (per usar des de transactions.ts).
 *  Identifica el template per (user_id + concepte + compte_id + categoria_id + tipus). */
export async function upsertRecurringTemplateInTx(
  tx: any,
  userId: string,
  data: RecurringTemplateData,
): Promise<void> {
  const ts = now()

  // Comprova si ja existeix un template actiu equivalent
  const existing = await tx.execute({
    sql: `SELECT id FROM recurring_templates
          WHERE user_id = ?
            AND concepte = ?
            AND COALESCE(compte_id, '') = COALESCE(?, '')
            AND COALESCE(categoria_id, '') = COALESCE(?, '')
            AND tipus = ?
            AND eliminat = 0
          LIMIT 1`,
    args: [userId, data.concepte, data.compte_id, data.categoria_id, data.tipus],
  })

  if (existing.rows.length > 0) {
    const id = (existing.rows[0] as unknown as { id: string }).id
    await tx.execute({
      sql: `UPDATE recurring_templates
            SET import_trs = ?,
                user_import = ?,
                dia_del_mes = ?,
                notes = ?,
                pagat_per_id = ?,
                data_modificacio = ?
            WHERE id = ? AND user_id = ?`,
      args: [data.import_trs, data.user_import, data.dia_del_mes, data.notes, data.pagat_per_id, ts, id, userId],
    })
  } else {
    await tx.execute({
      sql: `INSERT INTO recurring_templates
              (id, user_id, concepte, import_trs, user_import, compte_id, categoria_id, tipus,
               dia_del_mes, notes, pagat_per_id, darrer_mes_gestionat, data_inici, data_modificacio, eliminat)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)`,
      args: [
        generateId(), userId, data.concepte, data.import_trs, data.user_import,
        data.compte_id, data.categoria_id, data.tipus,
        data.dia_del_mes, data.notes, data.pagat_per_id, ts, ts,
      ],
    })
  }
}

/** Soft-delete del template equivalent (quan es desmarca recurrent). */
export async function deleteRecurringTemplateInTx(
  tx: any,
  userId: string,
  concepte: string,
  compteId: string | null,
  categoriaId: string | null,
  tipus: string,
): Promise<void> {
  await tx.execute({
    sql: `UPDATE recurring_templates
          SET eliminat = 1, data_modificacio = ?
          WHERE user_id = ?
            AND concepte = ?
            AND COALESCE(compte_id, '') = COALESCE(?, '')
            AND COALESCE(categoria_id, '') = COALESCE(?, '')
            AND tipus = ?
            AND eliminat = 0`,
    args: [now(), userId, concepte, compteId, categoriaId, tipus],
  })
}

/** Marca el template com a gestionat per al mes actual (Saltar mes / Afegir). */
export async function markRecurringTemplateHandled(
  templateId: string,
  userId: string,
): Promise<void> {
  const today = new Date()
  const mes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  const db = getDb()
  await db.execute({
    sql: `UPDATE recurring_templates
          SET darrer_mes_gestionat = ?, data_modificacio = ?
          WHERE id = ? AND user_id = ?`,
    args: [mes, now(), templateId, userId],
  })
}

/** Retorna tots els templates actius ordenats per dia del mes (per a la vista de calendari). */
export async function getAllActiveRecurringTemplates(
  userId: string,
): Promise<RecurringTemplate[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM recurring_templates
          WHERE user_id = ? AND eliminat = 0
          ORDER BY dia_del_mes ASC, concepte ASC`,
    args: [userId],
  })
  return (result.rows as unknown as RecurringTemplate[]).map(r => ({
    ...r,
    eliminat: Boolean(r.eliminat),
  }))
}

export interface UpdateRecurringTemplateData {
  concepte: string
  import_trs: number
  dia_del_mes: number
  compte_id: string | null
  categoria_id: string | null
  notes: string | null
}

/** Actualitza camps d'un template des de la pàgina de gestió. */
export async function updateRecurringTemplate(
  templateId: string,
  userId: string,
  data: UpdateRecurringTemplateData,
): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE recurring_templates
          SET concepte = ?, import_trs = ?, dia_del_mes = ?,
              compte_id = ?, categoria_id = ?, notes = ?,
              data_modificacio = ?
          WHERE id = ? AND user_id = ?`,
    args: [
      data.concepte, data.import_trs, data.dia_del_mes,
      data.compte_id, data.categoria_id, data.notes,
      now(), templateId, userId,
    ],
  })
}

/** Elimina definitivament el template (Eliminar recurrent). */
export async function eliminateRecurringTemplate(
  templateId: string,
  userId: string,
): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE recurring_templates
          SET eliminat = 1, data_modificacio = ?
          WHERE id = ? AND user_id = ?`,
    args: [now(), templateId, userId],
  })
}

/** Marca un mes com a saltat per a un template. */
export async function skipRecurringMonth(
  templateId: string,
  userId: string,
  year: number,
  month: number,
): Promise<void> {
  const db = getDb()
  const existing = await db.execute({
    sql: `SELECT id FROM recurring_skips WHERE template_id = ? AND user_id = ? AND year = ? AND month = ? AND eliminat = 0`,
    args: [templateId, userId, year, month],
  })
  if (existing.rows.length > 0) return
  await db.execute({
    sql: `INSERT INTO recurring_skips (id, template_id, user_id, year, month, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, ?, 0)`,
    args: [generateId(), templateId, userId, year, month, now()],
  })
}

/** Syncronitza templates recurrents a partir de transaccions marcades com a recurrents.
 *  - Crea templates nous amb data_inici = primera transacció del grup.
 *  - Actualitza data_inici en templates existents a la primera transacció real. */
export async function syncRecurringTemplatesFromTransactions(
  userId: string,
): Promise<{ created: number }> {
  const db = getDb()

  const result = await db.execute({
    sql: `SELECT concepte, compte_id, categoria_id, tipus, pagat_per_id, notes,
                 CAST(ROUND(AVG(import_trs)) AS INTEGER) as import_trs,
                 CAST(ROUND(AVG(CAST(strftime('%d', CAST(data/1000 AS INTEGER), 'unixepoch') AS INTEGER))) AS INTEGER) as dia_del_mes,
                 MIN(data) as primera_data
          FROM transactions
          WHERE user_id = ? AND eliminat = 0 AND recurrent = 1
            AND tipus IN ('ingres', 'despesa')
          GROUP BY concepte, COALESCE(compte_id, ''), COALESCE(categoria_id, ''), tipus`,
    args: [userId],
  })

  const rows = result.rows as unknown as Array<{
    concepte: string
    compte_id: string | null
    categoria_id: string | null
    tipus: "ingres" | "despesa"
    pagat_per_id: string | null
    notes: string | null
    import_trs: number
    dia_del_mes: number
    primera_data: number
  }>

  const tx = await db.transaction("write")
  let created = 0

  try {
    for (const row of rows) {
      const existing = await tx.execute({
        sql: `SELECT id, data_inici FROM recurring_templates
              WHERE user_id = ?
                AND concepte = ?
                AND COALESCE(compte_id, '') = COALESCE(?, '')
                AND COALESCE(categoria_id, '') = COALESCE(?, '')
                AND tipus = ?
                AND eliminat = 0
              LIMIT 1`,
        args: [userId, row.concepte, row.compte_id, row.categoria_id, row.tipus],
      })

      const ts = now()
      if (existing.rows.length === 0) {
        // Create new template with data_inici = date of first transaction
        await tx.execute({
          sql: `INSERT INTO recurring_templates
                  (id, user_id, concepte, import_trs, user_import, compte_id, categoria_id, tipus,
                   dia_del_mes, notes, pagat_per_id, darrer_mes_gestionat, data_inici, data_modificacio, eliminat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)`,
          args: [
            generateId(), userId, row.concepte, row.import_trs, row.import_trs,
            row.compte_id, row.categoria_id, row.tipus,
            row.dia_del_mes, row.notes, row.pagat_per_id, row.primera_data, ts,
          ],
        })
        created++
      } else {
        const existingRow = existing.rows[0] as unknown as { id: string; data_inici: number | null }
        // Always align data_inici to the first actual transaction date
        if (existingRow.data_inici !== row.primera_data) {
          await tx.execute({
            sql: `UPDATE recurring_templates SET data_inici = ?, data_modificacio = ? WHERE id = ? AND user_id = ?`,
            args: [row.primera_data, ts, existingRow.id, userId],
          })
        }
      }
    }

    await tx.commit()
    return { created }
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

/** Retorna el Set de template_ids saltats per a un mes concret. */
export async function getSkippedTemplateIds(
  userId: string,
  year: number,
  month: number,
): Promise<Set<string>> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT template_id FROM recurring_skips
          WHERE user_id = ? AND year = ? AND month = ? AND eliminat = 0`,
    args: [userId, year, month],
  })
  return new Set(result.rows.map(r => (r as unknown as { template_id: string }).template_id))
}
