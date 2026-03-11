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
  { to: "/analisi", label: "Anàlisi", icon: BarChart2 },
]

const moreNavItems = [
  { to: "/comptes", label: "Comptes", icon: Wallet },
  { to: "/persones", label: "Persones", icon: Users },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/esdeveniments", label: "Esdeveniments", icon: CalendarDays },
  { to: "/configuracio", label: "Configuració", icon: Settings },
]

interface MobileNavProps {
  onNewTransaction: () => void
}

function BottomNavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex flex-col items-center gap-1 px-2 py-1.5 min-w-0"
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
          </span>
          <span
            className={cn(
              "text-[10px] font-medium truncate",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
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

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Submenu panel */}
      {open && (
        <div className="md:hidden fixed bottom-[4.5rem] right-0 left-0 z-50 bg-card border-t border-border/60 shadow-lg px-4 py-4">
          <p className="px-1 mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            Més opcions
          </p>
          <div className="grid grid-cols-5 gap-1">
            {moreNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 px-1 py-1.5"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl transition-colors shrink-0",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium truncate text-center",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card">
        <div className="flex items-center justify-around h-[4.5rem] px-2">
          {/* Left items */}
          {leftNavItems.map(({ to, label, icon, end }) => (
            <BottomNavItem key={to} to={to} label={label} icon={icon} end={end} />
          ))}

          {/* Center FAB */}
          <button
            onClick={onNewTransaction}
            className="flex flex-col items-center justify-center w-14 h-14 -mt-6 rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
            aria-label="Nova transacció"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Right items */}
          {rightNavItems.map(({ to, label, icon }) => (
            <BottomNavItem key={to} to={to} label={label} icon={icon} />
          ))}

          {/* More button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex flex-col items-center gap-1 px-2 py-1.5 min-w-0"
          >
            <span
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0",
                open || isMoreActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground"
              )}
            >
              {open ? (
                <X className="w-4 h-4 shrink-0" />
              ) : (
                <MoreHorizontal className="w-4 h-4 shrink-0" />
              )}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium truncate",
                open || isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              Més
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
