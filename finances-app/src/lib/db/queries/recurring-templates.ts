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

/**
 * Retorna els templates pendents per al mes actual.
 * - Comprova si ja existeix una transacció recurrent equivalent aquest mes (font de veritat).
 * - Descarta templates que han finalitzat (data_final < primer dia del mes).
 * - Clamp dia_del_mes al màxim de dies del mes actual per no perdre templates de dia 31.
 */
export async function getPendingRecurringTemplates(
  userId: string,
  diaAvui: number,
  mesActual: string,
  firstDayMs: number,
  lastDayMs: number,
  daysInCurrentMonth: number,
): Promise<RecurringTemplate[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT rt.* FROM recurring_templates rt
          WHERE rt.user_id = ?
            AND rt.eliminat = 0
            AND (rt.data_final IS NULL OR rt.data_final >= ?)
            AND (rt.data_inici IS NULL OR rt.data_inici <= ?)
            AND CASE WHEN rt.dia_del_mes > ? THEN ? ELSE rt.dia_del_mes END <= ?
            AND (rt.darrer_mes_gestionat IS NULL OR rt.darrer_mes_gestionat != ?)
            AND NOT EXISTS (
              SELECT 1 FROM transactions t
              WHERE t.user_id = rt.user_id
                AND t.concepte = rt.concepte
                AND COALESCE(t.compte_id, '') = COALESCE(rt.compte_id, '')
                AND COALESCE(t.categoria_id, '') = COALESCE(rt.categoria_id, '')
                AND t.tipus = rt.tipus
                AND t.recurrent = 1
                AND t.eliminat = 0
                AND t.data >= ?
                AND t.data <= ?
            )
          ORDER BY rt.concepte ASC`,
    args: [
      userId,
      firstDayMs,   // data_final >= primer dia del mes
      lastDayMs,    // data_inici <= últim dia del mes
      daysInCurrentMonth, daysInCurrentMonth, diaAvui, // clamped dia_del_mes <= avui
      mesActual,    // darrer_mes_gestionat != mes actual
      firstDayMs, lastDayMs, // NOT EXISTS interval
    ],
  })
  return (result.rows as unknown as RecurringTemplate[]).map(r => ({
    ...r,
    eliminat: Boolean(r.eliminat),
  }))
}

/** Upsert dins d'una transacció DB existent (per usar des de transactions.ts).
 *  Identifica el template per (user_id + concepte + compte_id + categoria_id + tipus + pagat_per_id).
 *  Valida que dia_del_mes estigui entre 1 i 31. */
export async function upsertRecurringTemplateInTx(
  tx: any,
  userId: string,
  data: RecurringTemplateData,
): Promise<void> {
  if (
    !Number.isInteger(data.dia_del_mes) ||
    data.dia_del_mes < 1 ||
    data.dia_del_mes > 31
  ) {
    throw new Error("dia_del_mes ha de ser un enter entre 1 i 31")
  }

  const ts = now()

  // Comprova si ja existeix un template actiu equivalent (inclou pagat_per_id)
  const existing = await tx.execute({
    sql: `SELECT id FROM recurring_templates
          WHERE user_id = ?
            AND concepte = ?
            AND COALESCE(compte_id, '') = COALESCE(?, '')
            AND COALESCE(categoria_id, '') = COALESCE(?, '')
            AND tipus = ?
            AND COALESCE(pagat_per_id, '') = COALESCE(?, '')
            AND eliminat = 0
          LIMIT 1`,
    args: [userId, data.concepte, data.compte_id, data.categoria_id, data.tipus, data.pagat_per_id],
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
                data_final = NULL,
                data_modificacio = ?
            WHERE id = ? AND user_id = ?`,
      args: [data.import_trs, data.user_import, data.dia_del_mes, data.notes, data.pagat_per_id, ts, id, userId],
    })
  } else {
    await tx.execute({
      sql: `INSERT INTO recurring_templates
              (id, user_id, concepte, import_trs, user_import, compte_id, categoria_id, tipus,
               dia_del_mes, notes, pagat_per_id, darrer_mes_gestionat, data_inici, data_final, data_modificacio, eliminat)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 0)`,
      args: [
        generateId(), userId, data.concepte, data.import_trs, data.user_import,
        data.compte_id, data.categoria_id, data.tipus,
        data.dia_del_mes, data.notes, data.pagat_per_id, ts, ts,
      ],
    })
  }
}

/** Soft-delete del template equivalent (quan es desmarca recurrent d'una transacció). */
export async function deleteRecurringTemplateInTx(
  tx: any,
  userId: string,
  concepte: string,
  compteId: string | null,
  categoriaId: string | null,
  tipus: string,
  pagatPerId: string | null = null,
): Promise<void> {
  await tx.execute({
    sql: `UPDATE recurring_templates
          SET eliminat = 1, data_modificacio = ?
          WHERE user_id = ?
            AND concepte = ?
            AND COALESCE(compte_id, '') = COALESCE(?, '')
            AND COALESCE(categoria_id, '') = COALESCE(?, '')
            AND tipus = ?
            AND COALESCE(pagat_per_id, '') = COALESCE(?, '')
            AND eliminat = 0`,
    args: [now(), userId, concepte, compteId, categoriaId, tipus, pagatPerId],
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

/** Retorna tots els templates actius (no eliminats) ordenats per dia del mes.
 *  Inclou templates amb data_final per a que la vista de calendari pugui filtrar-los. */
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
  if (
    !Number.isInteger(data.dia_del_mes) ||
    data.dia_del_mes < 1 ||
    data.dia_del_mes > 31
  ) {
    throw new Error("dia_del_mes ha de ser un enter entre 1 i 31")
  }
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

/**
 * Finalitza el template a partir d'un mes concret (no afecta mesos passats).
 * Posa data_final = últim ms del mes anterior a (calYear, calMonth 0-indexed).
 * Exemple: calYear=2026, calMonth=2 → data_final = fi de febrer 2026
 *          → el template desapareix a partir de març 2026.
 */
export async function eliminateRecurringTemplate(
  templateId: string,
  userId: string,
  calYear: number,
  calMonth: number, // 0-indexed (com Date.getMonth())
): Promise<void> {
  // last ms of the month BEFORE calMonth
  const dataFinal = new Date(calYear, calMonth, 0, 23, 59, 59, 999).getTime()
  const db = getDb()
  await db.execute({
    sql: `UPDATE recurring_templates
          SET data_final = ?, data_modificacio = ?
          WHERE id = ? AND user_id = ?`,
    args: [dataFinal, now(), templateId, userId],
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

/**
 * Syncronitza templates recurrents a partir de transaccions marcades com a recurrents.
 * - Agrupa per (concepte, compte_id, categoria_id, tipus, pagat_per_id).
 * - Crea templates nous amb data_inici = primera transacció del grup.
 * - Actualitza templates existents: data_inici, import_trs, user_import, dia_del_mes.
 * - Neteja data_final per reactivar templates finalitzats manualment.
 */
export async function syncRecurringTemplatesFromTransactions(
  userId: string,
): Promise<{ created: number }> {
  const db = getDb()

  const result = await db.execute({
    sql: `SELECT
            t.concepte,
            t.compte_id,
            t.categoria_id,
            t.tipus,
            t.pagat_per_id,
            t.notes,
            CAST(ROUND(AVG(t.import_trs)) AS INTEGER) as import_trs,
            CAST(ROUND(AVG(
              t.import_trs - COALESCE(
                (SELECT SUM(ts.import_degut)
                 FROM transaction_splits ts
                 WHERE ts.transaccio_id = t.id AND ts.eliminat = 0),
                0
              )
            )) AS INTEGER) as user_import,
            CAST(ROUND(AVG(CAST(strftime('%d', CAST(t.data/1000 AS INTEGER), 'unixepoch') AS INTEGER))) AS INTEGER) as dia_del_mes,
            MIN(t.data) as primera_data
          FROM transactions t
          WHERE t.user_id = ? AND t.eliminat = 0 AND t.recurrent = 1
            AND t.tipus IN ('ingres', 'despesa')
          GROUP BY t.concepte, COALESCE(t.compte_id, ''), COALESCE(t.categoria_id, ''), t.tipus, COALESCE(t.pagat_per_id, '')`,
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
    user_import: number
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
                AND COALESCE(pagat_per_id, '') = COALESCE(?, '')
                AND eliminat = 0
              LIMIT 1`,
        args: [userId, row.concepte, row.compte_id, row.categoria_id, row.tipus, row.pagat_per_id],
      })

      const ts = now()
      if (existing.rows.length === 0) {
        await tx.execute({
          sql: `INSERT INTO recurring_templates
                  (id, user_id, concepte, import_trs, user_import, compte_id, categoria_id, tipus,
                   dia_del_mes, notes, pagat_per_id, darrer_mes_gestionat, data_inici, data_final, data_modificacio, eliminat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 0)`,
          args: [
            generateId(), userId, row.concepte, row.import_trs, row.user_import,
            row.compte_id, row.categoria_id, row.tipus,
            row.dia_del_mes, row.notes, row.pagat_per_id, row.primera_data, ts,
          ],
        })
        created++
      } else {
        const existingRow = existing.rows[0] as unknown as { id: string; data_inici: number | null }
        // Update amounts, day, start date, and clear any data_final (reactivate)
        await tx.execute({
          sql: `UPDATE recurring_templates
                SET data_inici = ?, import_trs = ?, user_import = ?, dia_del_mes = ?,
                    data_final = NULL, data_modificacio = ?
                WHERE id = ? AND user_id = ?`,
          args: [row.primera_data, row.import_trs, row.user_import, row.dia_del_mes, ts, existingRow.id, userId],
        })
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
