import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface KpiCardProps {
  title: string
  value: ReactNode
  icon: ReactNode
  trend?: { value: number; label: string }
  iconBg?: string
  className?: string
}

export function KpiCard({ title, value, icon, trend, iconBg, className }: KpiCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4",
      "shadow-[0_1px_4px_rgba(15,23,42,0.05),0_4px_16px_rgba(15,23,42,0.04)]",
      className
    )}>
      {/* Top row */}
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {title}
        </p>
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
          style={iconBg ? { backgroundColor: iconBg } : undefined}
        >
          {icon}
        </div>
      </div>

      {/* Value + optional trend badge */}
      <div className="flex items-end justify-between gap-2">
        <div className="text-[1.55rem] font-bold leading-none tracking-tight tabular-nums font-mono">
          {value}
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border mb-0.5 shrink-0 whitespace-nowrap",
            trend.value >= 0
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-rose-700 bg-rose-50 border-rose-200"
          )}>
            {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}