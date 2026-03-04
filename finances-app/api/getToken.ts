import type { VercelRequest, VercelResponse } from "@vercel/node"

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Només acceptem POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { password } = req.body as { password?: string }

  if (!password) {
    return res.status(400).json({ error: "Contrasenya requerida" })
  }

  if (password !== process.env.FAMILY_PASSWORD) {
    return res.status(401).json({ error: "Contrasenya incorrecta" })
  }

  const token = process.env.TURSO_AUTH_TOKEN
  const url = process.env.TURSO_DATABASE_URL

  if (!token || !url) {
    return res.status(500).json({ error: "Configuració del servidor incompleta" })
  }

  return res.status(200).json({ token, url })
}