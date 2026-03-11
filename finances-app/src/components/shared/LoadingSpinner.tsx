import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  label?: string
  className?: string
}

export function LoadingSpinner({ label, className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center min-h-[60vh]", className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-slate-200 dark:border-slate-700 border-t-slate-500 dark:border-t-slate-400 rounded-full animate-spin" />
        {label && <p className="text-slate-400 text-sm">{label}</p>}
      </div>
    </div>
  )
}
