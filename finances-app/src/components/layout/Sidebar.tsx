import { NavLink } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  Users,
  CalendarDays,
  BarChart2,
  Settings,
  LogOut,
  Plus,
  Sun,
  Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transaccions", label: "Transaccions", icon: ArrowLeftRight },
  { to: "/comptes", label: "Comptes", icon: Wallet },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/persones", label: "Persones", icon: Users },
  { to: "/esdeveniments", label: "Esdeveniments", icon: CalendarDays },
  { to: "/analisi", label: "Anàlisi", icon: BarChart2 },
]

interface SidebarProps {
  onNewTransaction?: () => void
}

export default function Sidebar({ onNewTransaction }: SidebarProps) {
  const { logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-card h-screen sticky top-0">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="font-semibold text-lg tracking-tight">Finances</span>
      </div>

      {onNewTransaction && (
        <div className="px-3 pt-4 pb-2">
          <Button className="w-full gap-2" onClick={onNewTransaction}>
            <Plus className="w-4 h-4" />
            Nou moviment
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-2 space-y-1">
        <NavLink
          to="/configuracio"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          Configuració
        </NavLink>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />}
          {theme === "dark" ? "Mode clar" : "Mode fosc"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Tancar sessió
        </Button>
      </div>
    </aside>
  )
}