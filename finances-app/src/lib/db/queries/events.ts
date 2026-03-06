import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { Event } from "@/types/database"
import { ensureDefaultTagsForType } from "./event-tags"

/** Obté els esdeveniments actius amb el sumatori de despeses vinculades */
export async function getEvents(userId: string): Promise<(Event & { total_despesa: number })[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT 
            e.*,
            COALESCE((SELECT SUM(t.import_trs) FROM transactions t WHERE t.esdeveniment_id = e.id AND t.tipus = 'despesa' AND t.eliminat = 0), 0) as total_despesa
          FROM events e
          WHERE e.user_id = ? AND e.eliminat = 0 
          ORDER BY e.data_inici DESC`,
    args: [userId],
  })
  return result.rows as unknown as (Event & { total_despesa: number })[]
}

/** Crea un esdeveniment segons l'esquema de database.d.ts */
export async function createEvent(
  userId: string, 
  data: Omit<Event, "id" | "user_id" | "data_modificacio" | "eliminat">
): Promise<Event> {
  const db = getDb()
  const id = generateId()
  const ts = now()

  await db.execute({
    sql: `INSERT INTO events (id, user_id, nom, tipus, data_inici, data_fi, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    args: [ id, userId, data.nom, data.tipus, data.data_inici, data.data_fi, ts ],
  })

  // NUEVO: Generar los tags por defecto si no existen
  await ensureDefaultTagsForType(userId, data.tipus)

  return { id, user_id: userId, ...data, data_modificacio: ts, eliminat: false } as Event
}

export async function deleteEvent(id: string, userId: string): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE events SET eliminat = 1, data_modificacio = ? WHERE id = ? AND user_id = ?`,
    args: [now(), id, userId],
  })
}

import type { TransactionWithRelations } from "@/types/database"

export async function getEventById(id: string, userId: string): Promise<Event | null> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM events WHERE id = ? AND user_id = ? AND eliminat = 0`,
    args: [id, userId]
  })
  
  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as Event
}

export async function getTransactionsByEvent(eventId: string, userId: string): Promise<TransactionWithRelations[]> {
  const db = getDb()
  // Fem JOIN amb les categories i els tags per tenir els noms i colors a la UI
  const result = await db.execute({
    sql: `SELECT 
            t.*,
            c.nom as categoria_nom,
            c.color as categoria_color,
            et.nom as event_tag_nom,
            et.color as event_tag_color
          FROM transactions t
          LEFT JOIN categories c ON t.categoria_id = c.id
          LEFT JOIN event_tags et ON t.event_tag_id = et.id
          WHERE t.esdeveniment_id = ? AND t.user_id = ? AND t.eliminat = 0
          ORDER BY t.data DESC`,
    args: [eventId, userId]
  })
  
  return result.rows as unknown as TransactionWithRelations[]
}