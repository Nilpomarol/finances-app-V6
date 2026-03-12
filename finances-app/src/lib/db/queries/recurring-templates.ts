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
