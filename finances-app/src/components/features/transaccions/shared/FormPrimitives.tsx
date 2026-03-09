import { cn } from "@/lib/utils"

// Card-like section wrapper used to group related form fields
export function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 space-y-3.5", className)}>
      {children}
    </div>
  )
}

// Small uppercase label used above form fields inside sections
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </span>
  )
}

// Thin horizontal rule used as a visual divider inside sections
export function Divider() {
  return <div className="h-px bg-slate-200 dark:bg-slate-700" />
}