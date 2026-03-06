import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { Person } from "@/types/database" 

/** * Obté totes les persones amb el saldo calculat.
 * Suma deutes (splits) i resta devolucions (liquidacions).
 */
export async function getPeople(userId: string): Promise<(Person & { balance: number })[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT 
            p.*,
            (
              COALESCE((SELECT SUM(s.import_degut) FROM transaction_splits s WHERE s.persona_id = p.id AND s.eliminat = false), 0)
              - 
              COALESCE((SELECT SUM(t.import_trs) FROM transactions t WHERE t.liquidacio_persona_id = p.id AND t.eliminat = false), 0)
            ) as balance
          FROM people p
          WHERE p.user_id = ? AND p.eliminat = false
          ORDER BY p.nom ASC`,
    args: [userId],
  })
  return result.rows as unknown as (Person & { balance: number })[]
}

// Alias per evitar errors d'importació si algun fitxer busca l'altre nom
export const getPeopleWithBalances = getPeople;

export async function createPerson(userId: string, nom: string): Promise<Person> {
  const db = getDb()
  const id = generateId()
  const ts = now()
  await db.execute({
    sql: `INSERT INTO people (id, user_id, nom, saldo_caixejat, amagat, data_modificacio, eliminat)
          VALUES (?, ?, ?, 0, false, ?, false)`,
    args: [id, userId, nom, ts],
  })
  return { id, user_id: userId, nom, saldo_caixejat: 0, amagat: false, data_modificacio: ts, eliminat: false }
}

export async function updatePerson(id: string, userId: string, nom: string): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE people SET nom = ?, data_modificacio = ? WHERE id = ? AND user_id = ? AND eliminat = false`,
    args: [nom, now(), id, userId],
  })
}

// Afegeix això al final de: src/lib/db/queries/people.ts

export interface PersonHistoryItem {
  id: string
  data: number
  concepte: string
  import: number
  tipus: 'deute' | 'liquidacio'
}

export async function getPersonHistory(personaId: string, userId: string): Promise<PersonHistoryItem[]> {
  const db = getDb()
  // Combinem els deutes (splits) i els pagaments (liquidacions)
  const result = await db.execute({
    sql: `
      SELECT t.id, t.data, t.concepte, s.import_degut as import, 'deute' as tipus
      FROM transaction_splits s
      JOIN transactions t ON s.transaccio_id = t.id
      WHERE s.persona_id = ? AND s.eliminat = false AND t.eliminat = false AND t.user_id = ?
      
      UNION ALL
      
      SELECT id, data, concepte, import_trs as import, 'liquidacio' as tipus
      FROM transactions
      WHERE liquidacio_persona_id = ? AND eliminat = false AND user_id = ?
      
      ORDER BY data DESC
    `,
    args: [personaId, userId, personaId, userId],
  })
  
  return result.rows as unknown as PersonHistoryItem[]
}

// Sobreescriu la funció deletePerson per fer servir 'amagat'
export async function deletePerson(id: string, userId: string): Promise<void> {
  const db = getDb()
  // En lloc de eliminat = true, fem amagat = true per no perdre l'historial
  await db.execute({
    sql: `UPDATE people SET amagat = true, data_modificacio = ? WHERE id = ? AND user_id = ?`,
    args: [now(), id, userId],
  })
}