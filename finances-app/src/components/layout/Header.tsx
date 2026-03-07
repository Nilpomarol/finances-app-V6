import { useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transaccions": "Transaccions",
  "/comptes": "Comptes",
  "/categories": "Categories",
  "/persones": "Persones",
  "/esdeveniments": "Esdeveniments",
  "/analisi": "Anàlisi",
  "/configuracio": "Configuració",
}

export default function Header() {
  const location = useLocation()
  const { userId } = useAuthStore()

  // Determina el títol — suporta rutes dinàmiques com /esdeveniments/:id
  const baseRoute = "/" + location.pathname.split("/")[1]
  const title = routeTitles[baseRoute] ?? "Finances"

  if (!userId) return null

  return (
    <header className="md:hidden h-14 flex items-center justify-between px-4 border-b bg-card sticky top-0 z-40">
      <span className="font-semibold text-base">{title}</span>
    </header>
  )
}