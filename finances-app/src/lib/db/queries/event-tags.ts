import { getDb } from "../client"
import { generateId, now } from "@/lib/utils"
import type { EventTag } from "@/types/database"

const DEFAULT_TAGS: Record<string, { nom: string; icona: string; color: string }[]> = {
  viatge: [
    { nom: "Transport", icona: "Plane", color: "#3b82f6" },
    { nom: "Allotjament", icona: "Bed", color: "#8b5cf6" },
    { nom: "Menjar", icona: "Utensils", color: "#f59e0b" },
    { nom: "Activitats", icona: "Ticket", color: "#ec4899" },
    { nom: "Altres", icona: "MoreHorizontal", color: "#64748b" },
  ],
  celebracio: [
    { nom: "Regals", icona: "Gift", color: "#ec4899" },
    { nom: "Menjar i Beguda", icona: "GlassWater", color: "#f59e0b" },
    { nom: "Decoració", icona: "PartyPopper", color: "#10b981" },
    { nom: "Altres", icona: "MoreHorizontal", color: "#64748b" },
  ]
}

export async function getEventTags(userId: string, tipus?: string): Promise<EventTag[]> {
  const db = getDb()
  let sql = `SELECT * FROM event_tags WHERE user_id = ? AND eliminat = 0`
  const args: any[] = [userId]

  if (tipus) {
    sql += ` AND tipus_esdeveniment = ?`
    args.push(tipus)
  }

  sql += ` ORDER BY tipus_esdeveniment ASC, nom ASC`

  const result = await db.execute({ sql, args })
  return result.rows as unknown as EventTag[]
}

export async function createEventTag(
  userId: string,
  data: Omit<EventTag, "id" | "user_id" | "data_modificacio" | "eliminat">
): Promise<EventTag> {
  const db = getDb()
  const id = generateId()
  const ts = now()

  await db.execute({
    sql: `INSERT INTO event_tags (id, user_id, tipus_esdeveniment, nom, color, icona, data_modificacio, eliminat)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    args: [id, userId, data.tipus_esdeveniment, data.nom, data.color, data.icona, ts],
  })

  return { id, user_id: userId, ...data, data_modificacio: ts, eliminat: false } as EventTag
}

export async function deleteEventTag(id: string, userId: string): Promise<void> {
  const db = getDb()
  const ts = now()

  // Transacción atómica: Borrar el tag (soft delete) y poner en NULL a las transacciones afectadas
  await db.execute("BEGIN TRANSACTION")
  try {
    await db.execute({
      sql: `UPDATE event_tags SET eliminat = 1, data_modificacio = ? WHERE id = ? AND user_id = ?`,
      args: [ts, id, userId],
    })

    await db.execute({
      sql: `UPDATE transactions SET event_tag_id = NULL, data_modificacio = ? WHERE event_tag_id = ? AND user_id = ?`,
      args: [ts, id, userId],
    })

    await db.execute("COMMIT")
  } catch (error) {
    await db.execute("ROLLBACK")
    throw error
  }
}

export async function ensureDefaultTagsForType(userId: string, tipus: string): Promise<void> {
  const existingTags = await getEventTags(userId, tipus)
  if (existingTags.length > 0) return // Ya existen tags para este tipo

  const tagsToCreate = DEFAULT_TAGS[tipus] || [
    { nom: "General", icona: "Tag", color: "#64748b" }
  ]

  for (const tag of tagsToCreate) {
    await createEventTag(userId, {
      tipus_esdeveniment: tipus,
      nom: tag.nom,
      icona: tag.icona,
      color: tag.color
    })
  }
}