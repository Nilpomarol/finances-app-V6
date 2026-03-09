import { TrendingDown, TrendingUp, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Tipus = "ingres" | "despesa" | "transferencia"

const TIPUS_TABS = [
  {
    value: "despesa" as const,
    label: "Despesa",
    icon: TrendingDown,
    active: "bg-rose-500 text-white shadow-sm",
    inactive: "text-slate-500 hover:text-rose-500",
  },
  {
    value: "ingres" as const,
    label: "Ingrés",
    icon: TrendingUp,
    active: "bg-emerald-500 text-white shadow-sm",
    inactive: "text-slate-500 hover:text-emerald-500",
  },
  {
    value: "transferencia" as const,
    label: "Transferència",
    icon: ArrowLeftRight,
    active: "bg-indigo-500 text-white shadow-sm",
    inactive: "text-slate-500 hover:text-indigo-500",
  },
]

interface TipusToggleProps {
  value: Tipus
  onChange: (v: Tipus) => void
}

export function TipusToggle({ value, onChange }: TipusToggleProps) {
  return (
    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
      {TIPUS_TABS.map(({ value: v, label, icon: Icon, active, inactive }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150",
            value === v ? active : inactive
          )}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{label.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  )
}