// Shared row component used in TransactionDetailModal

interface DetailRowProps {
  icon?: React.ElementType
  label: string
  children: React.ReactNode
}

export function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
      <span className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right">
        {children}
      </div>
    </div>
  )
}