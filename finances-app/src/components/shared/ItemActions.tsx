import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ItemActionsProps {
  onEdit: () => void
  onDelete: () => void
  className?: string
}

export function ItemActions({ onEdit, onDelete, className }: ItemActionsProps) {
  return (
    <div className={cn(
      "flex gap-0.5 shrink-0",
      className
    )}>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}