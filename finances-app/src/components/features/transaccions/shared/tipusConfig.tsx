import { TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react"

export const TIPUS_CONFIG = {
  ingres: {
    icon: TrendingUp,
    headerBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    headerBgDark: "dark:from-emerald-600 dark:to-emerald-700",
    iconBg: "bg-white/20",
    amountColor: "text-white",
    sign: "+",
    label: "Ingrés",
    badge: "bg-white/25 text-white",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    submitBg: "bg-emerald-500 hover:bg-emerald-600",
  },
  despesa: {
    icon: TrendingDown,
    headerBg: "bg-gradient-to-br from-rose-500 to-rose-600",
    headerBgDark: "dark:from-rose-600 dark:to-rose-700",
    iconBg: "bg-white/20",
    amountColor: "text-white",
    sign: "-",
    label: "Despesa",
    badge: "bg-white/25 text-white",
    accentColor: "text-rose-500 dark:text-rose-400",
    submitBg: "bg-rose-500 hover:bg-rose-600",
  },
  transferencia: {
    icon: ArrowLeftRight,
    headerBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    headerBgDark: "dark:from-indigo-600 dark:to-indigo-700",
    iconBg: "bg-white/20",
    amountColor: "text-white",
    sign: "",
    label: "Transferència",
    badge: "bg-white/25 text-white",
    accentColor: "text-indigo-500 dark:text-indigo-400",
    submitBg: "bg-indigo-500 hover:bg-indigo-600",
  },
} as const

export type TipusKey = keyof typeof TIPUS_CONFIG