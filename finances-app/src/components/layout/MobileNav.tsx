import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  BarChart2,
  MoreHorizontal,
  Settings,
  Users,
  Tag,
  CalendarDays,
  Plus,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const leftNavItems = [
  { to: "/", label: "Inici", icon: LayoutDashboard, end: true },
  { to: "/transaccions", label: "Moviments", icon: ArrowLeftRight },
]

const rightNavItems = [
  { to: "/comptes", label: "Comptes", icon: Wallet },
]

const moreNavItems = [
  { to: "/analisi", label: "Anàlisi", icon: BarChart2 },
  { to: "/persones", label: "Persones", icon: Users },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/esdeveniments", label: "Esdeveniments", icon: CalendarDays },
  { to: "/configuracio", label: "Configuració", icon: Settings },
]

interface MobileNavProps {
  onNewTransaction: () => void
}

export default function MobileNav({ onNewTransaction }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const isMoreActive = moreNavItems.some((item) =>
    location.pathname.startsWith(item.to)
  )

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors min-w-0",
      isActive ? "text-primary" : "text-muted-foreground"
    )

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Submenu panel */}
      {open && (
        <div className="md:hidden fixed bottom-16 right-0 left-0 z-50 bg-card border-t shadow-lg px-4 py-3">
          <div className="grid grid-cols-5 gap-1">
            {moreNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 px-1 py-3 rounded-md text-xs font-medium transition-colors",
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate text-center">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Left items */}
          {leftNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {/* Center + button */}
          <button
            onClick={onNewTransaction}
            className="flex flex-col items-center justify-center w-14 h-14 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
            aria-label="Nova transacció"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Right items */}
          {rightNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors min-w-0",
              open || isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {open ? (
              <X className="w-5 h-5 shrink-0" />
            ) : (
              <MoreHorizontal className="w-5 h-5 shrink-0" />
            )}
            <span className="truncate">Més</span>
          </button>
        </div>
      </nav>
    </>
  )
}
