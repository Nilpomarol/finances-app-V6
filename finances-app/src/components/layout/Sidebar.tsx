import { NavLink } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import {
  LayoutDashboard,
  BarChart2,
  ArrowLeftRight,
  Wallet,
  Tag,
  Users,
  CalendarDays,
  Settings,
  Plus,
  Sun,
  Moon,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItemDef = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const mainNavItems: NavItemDef[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/analisi", label: "Anàlisi", icon: BarChart2 },
]

const financeNavItems: NavItemDef[] = [
  { to: "/transaccions", label: "Transaccions", icon: ArrowLeftRight },
  { to: "/comptes", label: "Comptes", icon: Wallet },
]

const manageNavItems: NavItemDef[] = [
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/persones", label: "Persones", icon: Users },
  { to: "/esdeveniments", label: "Esdeveniments", icon: CalendarDays },
]

function NavItem({ to, label, icon: Icon, end }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0",
              isActive
                ? "bg-primary-foreground/20"
                : "bg-muted/80 group-hover:bg-accent-foreground/10"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

function NavSection({ label, items }: { label: string; items: NavItemDef[] }) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
        {label}
      </p>
      {items.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}
    </div>
  )
}

interface SidebarProps {
  onNewTransaction?: () => void
}

export default function Sidebar({ onNewTransaction }: SidebarProps) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border/60 bg-card h-screen sticky top-0">
      {/* Branding header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border/60">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-sm shrink-0">
          <TrendingUp className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-none tracking-tight">
            Finances
          </p>
          <p className="text-[10px] text-muted-foreground/60 leading-none mt-0.5 tracking-wide">
            Gestió personal
          </p>
        </div>
      </div>

      {/* New transaction button */}
      {onNewTransaction && (
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={onNewTransaction}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nou moviment
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        <NavSection label="Principal" items={mainNavItems} />
        <NavSection label="Finances" items={financeNavItems} />
        <NavSection label="Gestió" items={manageNavItems} />
      </nav>

      {/* Footer controls */}
      <div className="p-3 border-t border-border/60 space-y-0.5">
        <NavLink
          to="/configuracio"
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0",
                  isActive
                    ? "bg-primary-foreground/20"
                    : "bg-muted/80 group-hover:bg-accent-foreground/10"
                )}
              >
                <Settings className="w-4 h-4 shrink-0" />
              </span>
              Configuració
            </>
          )}
        </NavLink>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/80 shrink-0">
            {theme === "dark"
              ? <Sun className="w-4 h-4 shrink-0" />
              : <Moon className="w-4 h-4 shrink-0" />}
          </span>
          {theme === "dark" ? "Mode clar" : "Mode fosc"}
        </button>
      </div>
    </aside>
  )
}