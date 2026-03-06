import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { Account } from "@/types/database"

export async function getAccounts(userId: string): Promise<Account[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM accounts
          WHERE user_id = ? AND eliminat = false
          ORDER BY nom ASC`,
    args: [userId],
  })
  return result.rows as unknown as Account[]
}

export async function createAccount(
  userId: string,
  data: Omit<Account, "id" | "user_id" | "data_modificacio" | "eliminat">
): Promise<Account> {
  const db = getDb()
  const id = generateId()
  const ts = now()

  await db.execute({
    sql: `INSERT INTO accounts (id, user_id, nom, tipus, logo, color, saldo, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, false)`,
    args: [id, userId, data.nom, data.tipus, data.logo, data.color, data.saldo, ts],
  })

  return { id, user_id: userId, ...data, data_modificacio: ts, eliminat: false }
}

export async function updateAccount(
  id: string,
  userId: string,
  data: Partial<Omit<Account, "id" | "user_id" | "eliminat">>
): Promise<void> {
  const db = getDb()
  const ts = now()

  await db.execute({
    sql: `UPDATE accounts
          SET nom = COALESCE(?, nom),
              tipus = COALESCE(?, tipus),
              logo = COALESCE(?, logo),
              color = COALESCE(?, color),
              saldo = COALESCE(?, saldo),
              data_modificacio = ?
          WHERE id = ? AND user_id = ? AND eliminat = false`,
    args: [
      data.nom ?? null,
      data.tipus ?? null,
      data.logo ?? null,
      data.color ?? null,
      data.saldo ?? null,
      ts,
      id,
      userId,
    ],
  })
}

/** Retorna un compte per ID */
export async function getAccountById(id: string, userId: string): Promise<Account | null> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM accounts WHERE id = ? AND user_id = ? AND eliminat = false`,
    args: [id, userId],
  })
  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as Account
}

/** Comprova si un compte té transaccions associades */
export async function accountHasTransactions(accountId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM transactions
          WHERE (compte_id = ? OR compte_desti_id = ?)
            AND user_id = ? AND eliminat = false`,
    args: [accountId, accountId, userId],
  })
  const count = Number((result.rows[0] as unknown as { count: number }).count)
  return count > 0
}

// ============================================================================
// LÒGICA DE PROTECCIÓ D'ESBORRATS AMB TRANSACCIONS ATÒMIQUES
// ============================================================================

/** Helper intern: Recalcula el saldo d'un compte donat dins d'una transacció */
async function recalculateAccountBalance(tx: any, accountId: string, userId: string): Promise<number> {
  const result = await tx.execute({
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

/** Helper intern: Troba comptes que han interactuat amb el que anem a esborrar (via transferències) */
async function getLinkedAccounts(tx: any, accountId: string, userId: string): Promise<string[]> {
  const res = await tx.execute({
    sql: `SELECT compte_desti_id as linked_id FROM transactions WHERE compte_id = ? AND compte_desti_id IS NOT NULL AND user_id = ?
          UNION
          SELECT compte_id as linked_id FROM transactions WHERE compte_desti_id = ? AND compte_id IS NOT NULL AND user_id = ?`,
    args: [accountId, userId, accountId, userId]
  })
  return res.rows.map((r: any) => r.linked_id)
}

/** 1. Elimina compte NORMAL (sense transaccions) */
export async function deleteAccount(id: string, userId: string): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE accounts SET eliminat = true, data_modificacio = ? WHERE id = ? AND user_id = ?`,
    args: [now(), id, userId],
  })
}

/** 2. Elimina compte + totes les seves transaccions (Destructiu) */
export async function deleteAccountWithTransactions(accountId: string, userId: string): Promise<void> {
  const db = getDb()
  const tx = await db.transaction("write")
  try {
    const ts = now()
    const linkedAccounts = await getLinkedAccounts(tx, accountId, userId)

    await tx.execute({
      sql: `UPDATE transactions SET eliminat = true, data_modificacio = ? WHERE (compte_id = ? OR compte_desti_id = ?) AND user_id = ?`,
      args: [ts, accountId, accountId, userId],
    })

    await tx.execute({
      sql: `UPDATE accounts SET eliminat = true, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [ts, accountId, userId],
    })

    // Si hi havia transferències a altres comptes, recalculem els seus saldos
    for (const linkedId of linkedAccounts) {
      if (linkedId !== accountId) {
        const newBal = await recalculateAccountBalance(tx, linkedId, userId)
        await tx.execute({
          sql: `UPDATE accounts SET saldo = ?, data_modificacio = ? WHERE id = ? AND user_id = ?`,
          args: [newBal, ts, linkedId, userId],
        })
      }
    }

    await tx.commit()
  } catch (e) {
    await tx.rollback()
    throw e
  }
}

/** 3. Elimina compte i 'arxiva' les transaccions (es queden lligades al compte soft-deleted) */
export async function deleteAccountUnlinking(accountId: string, userId: string): Promise<void> {
  const db = getDb()
  const tx = await db.transaction("write")
  try {
    const ts = now()
    
    // Simplement marquem el compte com a eliminat (Soft Delete).
    // No toquem les transaccions! Així l'historial es manté perfecte
    // però el compte desapareix de l'app i del càlcul de patrimoni.
    await tx.execute({
      sql: `UPDATE accounts SET eliminat = true, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [ts, accountId, userId],
    })

    await tx.commit()
  } catch (e) {
    await tx.rollback()
    console.error("Error a l'opció desvincular compte:", e)
    throw e
  }
}

/** 4. Elimina compte traspassant les transaccions a un altre compte existent */
export async function deleteAccountTransferring(accountId: string, targetAccountId: string, userId: string): Promise<void> {
  const db = getDb()
  const tx = await db.transaction("write")
  try {
    const ts = now()
    await tx.execute({
      sql: `UPDATE transactions SET compte_id = ?, data_modificacio = ? WHERE compte_id = ? AND user_id = ? AND eliminat = false`,
      args: [targetAccountId, ts, accountId, userId],
    })
    await tx.execute({
      sql: `UPDATE transactions SET compte_desti_id = ?, data_modificacio = ? WHERE compte_desti_id = ? AND user_id = ? AND eliminat = false`,
      args: [targetAccountId, ts, accountId, userId],
    })
    await tx.execute({
      sql: `UPDATE accounts SET eliminat = true, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [ts, accountId, userId],
    })

    // Recalculem immediatament el saldo del compte que s'ho ha quedat tot!
    const newBal = await recalculateAccountBalance(tx, targetAccountId, userId)
    await tx.execute({
      sql: `UPDATE accounts SET saldo = ?, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [newBal, ts, targetAccountId, userId],
    })

    await tx.commit()
  } catch (e) {
    await tx.rollback()
    throw e
  }
}