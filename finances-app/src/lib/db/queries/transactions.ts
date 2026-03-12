import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { Transaction, TransactionWithRelations, TransactionSplit } from "@/types/database"
import {
  upsertRecurringTemplateInTx,
  deleteRecurringTemplateInTx,
} from "./recurring-templates"

export interface GetTransactionsOptions {
  userId: string
  compteId?: string
  categoriaId?: string
  tipus?: Transaction["tipus"]
  dateStart?: number
  dateEnd?: number
  limit?: number
  offset?: number
  excludeLiquidacions?: boolean
  excludeEsdeveniments?: boolean
}

// Tipus flexible per a la creació/edició. Les columnes nullable de la BD
// no cal que es passin sempre perquè ja es normalitzen a null abans de desar.
export interface TransactionData {
  concepte: string
  data: number
  import_trs: number
  notes?: string | null
  compte_id?: string | null
  compte_desti_id?: string | null
  categoria_id?: string | null
  esdeveniment_id?: string | null
  event_tag_id?: string | null
  tipus: Transaction["tipus"]
  recurrent?: boolean
  liquidacio_persona_id?: string | null
  pagat_per_id?: string | null
  deutes?: { persona_id: string; import_degut: number }[]
}

export async function getTransactions(
  opts: GetTransactionsOptions
): Promise<TransactionWithRelations[]> {
  const db = getDb()

  const conditions: string[] = ["t.user_id = ?", "t.eliminat = false", "t.concepte != 'Saldo inicial'"]
  const args: (string | number | boolean | null)[] = [opts.userId]

  if (opts.compteId) {
    conditions.push("(t.compte_id = ? OR t.compte_desti_id = ?)")
    args.push(opts.compteId, opts.compteId)
  }
  if (opts.categoriaId) {
    conditions.push("t.categoria_id = ?")
    args.push(opts.categoriaId)
  }
  if (opts.tipus) {
    conditions.push("t.tipus = ?")
    args.push(opts.tipus)
  }
  if (opts.dateStart !== undefined) {
    conditions.push("t.data >= ?")
    args.push(opts.dateStart)
  }
  if (opts.dateEnd !== undefined) {
    conditions.push("t.data <= ?")
    args.push(opts.dateEnd)
  }
  if (opts.excludeLiquidacions) {
    conditions.push("t.liquidacio_persona_id IS NULL")
  }
  if (opts.excludeEsdeveniments) {
    conditions.push("t.esdeveniment_id IS NULL")
  }

  const whereClause = conditions.join(" AND ")
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  const result = await db.execute({
    sql: `SELECT
            t.*,
            a.nom as compte_nom,
            a.color as compte_color,
            ad.nom as compte_desti_nom,
            c.nom as categoria_nom,
            c.color as categoria_color,
            c.icona as categoria_icona,
            c.es_fix as categoria_es_fix,
            e.nom as esdeveniment_nom,
            et.nom as event_tag_nom,
            p.nom as persona_nom,
            pp.nom as pagat_per_nom,
            (SELECT COALESCE(SUM(import_degut), 0) FROM transaction_splits WHERE transaccio_id = t.id AND eliminat = false) as total_deutes
          FROM transactions t
          LEFT JOIN accounts a ON t.compte_id = a.id
          LEFT JOIN accounts ad ON t.compte_desti_id = ad.id
          LEFT JOIN categories c ON t.categoria_id = c.id
          LEFT JOIN events e ON t.esdeveniment_id = e.id
          LEFT JOIN event_tags et ON t.event_tag_id = et.id
          LEFT JOIN people p ON t.liquidacio_persona_id = p.id
          LEFT JOIN people pp ON t.pagat_per_id = pp.id
          WHERE ${whereClause}
          ORDER BY t.data DESC, t.data_modificacio DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  })

  return result.rows as unknown as TransactionWithRelations[]
}

/** Retorna els períodes (any + mes) que tenen almenys una transacció */
export async function getDistinctPeriods(
  userId: string,
): Promise<{ mes: number; any: number }[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT DISTINCT
            CAST(strftime('%Y', CAST(data/1000 AS INTEGER), 'unixepoch') AS INTEGER) as any,
            CAST(strftime('%m', CAST(data/1000 AS INTEGER), 'unixepoch') AS INTEGER) as mes
          FROM transactions
          WHERE user_id = ? AND eliminat = false AND concepte != 'Saldo inicial'
          ORDER BY any DESC, mes DESC`,
    args: [userId],
  })
  return result.rows as unknown as { mes: number; any: number }[]
}

/** Obté els deutes (splits) associats a una transacció concreta */
export async function getTransactionSplits(transaccioId: string): Promise<TransactionSplit[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM transaction_splits WHERE transaccio_id = ? AND eliminat = false`,
    args: [transaccioId],
  })
  return result.rows as unknown as TransactionSplit[]
}

async function recalculateAccountBalance(
  dbClient: any,
  accountId: string,
  userId: string
): Promise<number> {
  const result = await dbClient.execute({
    sql: `SELECT
            COALESCE(SUM(
              CASE
                WHEN tipus = 'ingres' AND compte_id = ? THEN import_trs
                WHEN tipus = 'despesa' AND compte_id = ? THEN -import_trs
                WHEN tipus = 'transferencia' AND compte_id = ? THEN -import_trs
                WHEN tipus = 'transferencia' AND compte_desti_id = ? THEN import_trs
                ELSE 0
              END
            ), 0) as saldo
          FROM transactions
          WHERE user_id = ? AND eliminat = false
            AND (compte_id = ? OR compte_desti_id = ?)`,
    args: [accountId, accountId, accountId, accountId, userId, accountId, accountId],
  })
  return Number((result.rows[0] as unknown as { saldo: number }).saldo)
}

async function updateAccountBalances(
  tx: any,
  compteId: string | null,
  compteDesti: string | null,
  userId: string
): Promise<void> {
  const accountsToUpdate = new Set<string>()
  if (compteId) accountsToUpdate.add(compteId)
  if (compteDesti) accountsToUpdate.add(compteDesti)

  for (const accountId of accountsToUpdate) {
    const newBalance = await recalculateAccountBalance(tx, accountId, userId)
    await tx.execute({
      sql: `UPDATE accounts SET saldo = ?, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [newBalance, now(), accountId, userId],
    })
  }
}

export async function createTransaction(
  userId: string,
  data: TransactionData
): Promise<Transaction> {
  const db = getDb()
  const tx = await db.transaction("write") 
  
  try {
    const id = generateId()
    const ts = now()

    await tx.execute({
      sql: `INSERT INTO transactions
              (id, user_id, concepte, data, import_trs, notes, compte_id, compte_desti_id,
               categoria_id, esdeveniment_id, event_tag_id, tipus, recurrent,
               liquidacio_persona_id, pagat_per_id, data_modificacio, eliminat)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)`,
      args: [
        id, userId, data.concepte, data.data, data.import_trs,
        data.notes ?? null, data.compte_id ?? null, data.compte_desti_id ?? null,
        data.categoria_id ?? null, data.esdeveniment_id ?? null,
        data.event_tag_id ?? null, data.tipus, data.recurrent ? 1 : 0,
        data.liquidacio_persona_id ?? null, data.pagat_per_id ?? null, ts,
      ],
    })

    // INSERIM ELS DEUTES (SPLITS) SI N'HI HA
    if (data.deutes && data.deutes.length > 0) {
      for (const split of data.deutes) {
        await tx.execute({
          sql: `INSERT INTO transaction_splits
                  (id, transaccio_id, persona_id, import_degut, data_modificacio, eliminat)
                VALUES (?, ?, ?, ?, ?, false)`,
          args: [generateId(), id, split.persona_id, split.import_degut, ts]
        })
      }
    }

    // SINCRONITZEM EL TEMPLATE RECURRENT
    if (data.recurrent && (data.tipus === "ingres" || data.tipus === "despesa")) {
      const splitTotal = (data.deutes ?? []).reduce((s, d) => s + d.import_degut, 0)
      await upsertRecurringTemplateInTx(tx, userId, {
        concepte: data.concepte,
        import_trs: data.import_trs,
        user_import: data.import_trs - splitTotal,
        compte_id: data.compte_id ?? null,
        categoria_id: data.categoria_id ?? null,
        tipus: data.tipus,
        dia_del_mes: new Date(data.data).getDate(),
        notes: data.notes ?? null,
        pagat_per_id: data.pagat_per_id ?? null,
      })
    }

    await updateAccountBalances(tx, data.compte_id ?? null, data.compte_desti_id ?? null, userId)

    await tx.commit() 
    const { deutes, ...txData } = data
    return {
      id,
      user_id: userId,
      concepte: txData.concepte,
      data: txData.data,
      import_trs: txData.import_trs,
      notes: txData.notes ?? null,
      compte_id: txData.compte_id ?? null,
      compte_desti_id: txData.compte_desti_id ?? null,
      categoria_id: txData.categoria_id ?? null,
      esdeveniment_id: txData.esdeveniment_id ?? null,
      event_tag_id: txData.event_tag_id ?? null,
      tipus: txData.tipus,
      recurrent: txData.recurrent ?? false,
      liquidacio_persona_id: txData.liquidacio_persona_id ?? null,
      pagat_per_id: txData.pagat_per_id ?? null,
      data_modificacio: ts,
      eliminat: false,
    }
  } catch (error) {
    await tx.rollback() 
    throw error
  }
}

export async function updateTransaction(
  id: string,
  userId: string,
  data: Partial<TransactionData>
): Promise<void> {
  const db = getDb()
  const tx = await db.transaction("write")

  try {
    const current = await tx.execute({
      sql: `SELECT compte_id, compte_desti_id, concepte, import_trs, categoria_id, tipus,
                   recurrent, data, notes, pagat_per_id
            FROM transactions WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    })

    if (current.rows.length === 0) throw new Error("Transacció no trobada")

    const currentTx = current.rows[0] as unknown as {
      compte_id: string | null
      compte_desti_id: string | null
      concepte: string
      import_trs: number
      categoria_id: string | null
      tipus: string
      recurrent: number
      data: number
      notes: string | null
      pagat_per_id: string | null
    }
    const ts = now()

    await tx.execute({
      sql: `UPDATE transactions
            SET concepte = COALESCE(?, concepte),
                data = COALESCE(?, data),
                import_trs = COALESCE(?, import_trs),
                notes = ?,
                compte_id = COALESCE(?, compte_id),
                compte_desti_id = ?,
                categoria_id = ?,
                esdeveniment_id = ?,
                event_tag_id = ?,
                tipus = COALESCE(?, tipus),
                recurrent = COALESCE(?, recurrent),
                pagat_per_id = ?,
                data_modificacio = ?
            WHERE id = ? AND user_id = ? AND eliminat = false`,
      args: [
        data.concepte ?? null, data.data ?? null, data.import_trs ?? null,
        data.notes ?? null, data.compte_id ?? null, data.compte_desti_id ?? null,
        data.categoria_id ?? null, data.esdeveniment_id ?? null, data.event_tag_id ?? null,
        data.tipus ?? null, data.recurrent !== undefined ? (data.recurrent ? 1 : 0) : null,
        data.pagat_per_id !== undefined ? (data.pagat_per_id ?? null) : null,
        ts, id, userId,
      ],
    })

    // ACTUALITZEM ELS DEUTES: Eliminem els antics (soft delete) i inserim els nous
    if (data.deutes !== undefined) {
      await tx.execute({
        sql: `UPDATE transaction_splits SET eliminat = true, data_modificacio = ? WHERE transaccio_id = ?`,
        args: [ts, id]
      })

      for (const split of data.deutes) {
        await tx.execute({
          sql: `INSERT INTO transaction_splits 
                  (id, transaccio_id, persona_id, import_degut, data_modificacio, eliminat)
                VALUES (?, ?, ?, ?, ?, false)`,
          args: [generateId(), id, split.persona_id, split.import_degut, ts]
        })
      }
    }

    const affectedAccounts = new Set<string>()
    if (currentTx.compte_id) affectedAccounts.add(currentTx.compte_id)
    if (currentTx.compte_desti_id) affectedAccounts.add(currentTx.compte_desti_id)
    if (data.compte_id) affectedAccounts.add(data.compte_id)
    if (data.compte_desti_id) affectedAccounts.add(data.compte_desti_id)

    // SINCRONITZEM EL TEMPLATE RECURRENT
    const newRecurrent = data.recurrent !== undefined ? data.recurrent : Boolean(currentTx.recurrent)
    const mergedTipus = (data.tipus ?? currentTx.tipus) as string
    if (newRecurrent && (mergedTipus === "ingres" || mergedTipus === "despesa")) {
      const mergedImport = data.import_trs ?? currentTx.import_trs
      let splitTotal: number
      if (data.deutes !== undefined) {
        splitTotal = data.deutes.reduce((s, d) => s + d.import_degut, 0)
      } else {
        const existingSplits = await tx.execute({
          sql: `SELECT COALESCE(SUM(import_degut), 0) as total FROM transaction_splits WHERE transaccio_id = ? AND eliminat = false`,
          args: [id],
        })
        splitTotal = Number((existingSplits.rows[0] as unknown as { total: number })?.total ?? 0)
      }
      await upsertRecurringTemplateInTx(tx, userId, {
        concepte: data.concepte ?? currentTx.concepte,
        import_trs: mergedImport,
        user_import: mergedImport - splitTotal,
        compte_id: data.compte_id !== undefined ? (data.compte_id ?? null) : currentTx.compte_id,
        categoria_id: data.categoria_id !== undefined ? (data.categoria_id ?? null) : currentTx.categoria_id,
        tipus: mergedTipus as "ingres" | "despesa",
        dia_del_mes: new Date(data.data ?? currentTx.data).getDate(),
        notes: data.notes !== undefined ? (data.notes ?? null) : currentTx.notes,
        pagat_per_id: data.pagat_per_id !== undefined ? (data.pagat_per_id ?? null) : currentTx.pagat_per_id,
      })
    } else if (data.recurrent === false && Boolean(currentTx.recurrent)) {
      // Desmarcat com a recurrent: eliminem el template
      await deleteRecurringTemplateInTx(
        tx, userId,
        currentTx.concepte, currentTx.compte_id, currentTx.categoria_id, currentTx.tipus,
      )
    }

    for (const accountId of affectedAccounts) {
      const newBalance = await recalculateAccountBalance(tx, accountId, userId)
      await tx.execute({
        sql: `UPDATE accounts SET saldo = ?, data_modificacio = ? WHERE id = ? AND user_id = ?`,
        args: [newBalance, ts, accountId, userId],
      })
    }

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

export async function deleteTransaction(id: string, userId: string, preserveTemplate = false): Promise<void> {
  const db = getDb()
  const tx = await db.transaction("write")

  try {
    const current = await tx.execute({
      sql: `SELECT compte_id, compte_desti_id, concepte, categoria_id, tipus, recurrent
            FROM transactions WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    })

    if (current.rows.length === 0) throw new Error("Transacció no trobada")

    const currentTx = current.rows[0] as unknown as {
      compte_id: string | null
      compte_desti_id: string | null
      concepte: string
      categoria_id: string | null
      tipus: string
      recurrent: number
    }
    const ts = now()

    await tx.execute({
      sql: `UPDATE transactions SET eliminat = true, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [ts, id, userId],
    })

    // També eliminem els deutes associats a aquesta transacció
    await tx.execute({
      sql: `UPDATE transaction_splits SET eliminat = true, data_modificacio = ? WHERE transaccio_id = ?`,
      args: [ts, id],
    })

    // Si la transacció era recurrent, netegem el template
    if (!preserveTemplate && currentTx.recurrent) {
      await deleteRecurringTemplateInTx(
        tx, userId,
        currentTx.concepte, currentTx.compte_id, currentTx.categoria_id, currentTx.tipus,
      )
    }

    await updateAccountBalances(tx, currentTx.compte_id, currentTx.compte_desti_id, userId)

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

/** Checks for potential duplicate transactions (same date AND (same amount OR same concept)) */
export async function checkDuplicates(
  userId: string,
  data: number,
  importTrs: number,
  concepte: string
): Promise<{ isDuplicate: boolean; matches: { id: string; concepte: string; import_trs: number; data: number }[] }> {
  const db = getDb()
  // Look for transactions with same date AND (same amount OR very similar concept)
  const dayStart = new Date(data)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(data)
  dayEnd.setHours(23, 59, 59, 999)

  const result = await db.execute({
    sql: `SELECT id, concepte, import_trs, data FROM transactions
          WHERE user_id = ? AND eliminat = false
            AND data >= ? AND data <= ?
            AND (import_trs = ? OR LOWER(concepte) = LOWER(?))`,
    args: [userId, dayStart.getTime(), dayEnd.getTime(), importTrs, concepte],
  })

  const matches = result.rows as unknown as { id: string; concepte: string; import_trs: number; data: number }[]
  return { isDuplicate: matches.length > 0, matches }
}

/** Suggests a category based on similar past transactions */
export async function suggestCategory(
  userId: string,
  concepte: string
): Promise<string | null> {
  const db = getDb()
  // Find the most common category for transactions with similar concepts
  const result = await db.execute({
    sql: `SELECT categoria_id, COUNT(*) as cnt
          FROM transactions
          WHERE user_id = ? AND eliminat = false
            AND categoria_id IS NOT NULL
            AND LOWER(concepte) LIKE ?
          GROUP BY categoria_id
          ORDER BY cnt DESC
          LIMIT 1`,
    args: [userId, `%${concepte.toLowerCase().substring(0, 10)}%`],
  })

  if (result.rows.length === 0) return null
  return (result.rows[0] as unknown as { categoria_id: string }).categoria_id
}