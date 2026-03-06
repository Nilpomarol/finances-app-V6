import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  BarChart2,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Al mòbil mostrem només les 5 accions més importants
const mobileNavItems = [
  { to: "/", label: "Inici", icon: LayoutDashboard, end: true },
  { to: "/transaccions", label: "Moviments", icon: ArrowLeftRight },
  { to: "/comptes", label: "Comptes", icon: Wallet },
  { to: "/analisi", label: "Anàlisi", icon: BarChart2 },
  { to: "/configuracio", label: "Config", icon: Settings },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}