import { useState } from "react"
import type { Account } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Loader2, Unlink, ArrowRightLeft, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"

type DeleteOption = "cancel" | "delete-all" | "unlink" | "transfer"

interface DeleteAccountModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (option: DeleteOption, targetAccountId?: string) => Promise<void>
  account: Account
  otherAccounts: Account[]
}

const OPTIONS = [
  {
    value: "unlink" as DeleteOption,
    label: "Desvincular les transaccions",
    description: "Les transaccions es mantenen però sense compte assignat",
    icon: <Unlink className="w-4 h-4" />,
    destructive: false,
  },
  {
    value: "transfer" as DeleteOption,
    label: "Moure a un altre compte",
    description: "Totes les transaccions es mouen al compte seleccionat",
    icon: <ArrowRightLeft className="w-4 h-4" />,
    destructive: false,
  },
  {
    value: "delete-all" as DeleteOption,
    label: "Eliminar-ho tot",
    description: "S'eliminen el compte i totes les seves transaccions",
    icon: <Trash2 className="w-4 h-4" />,
    destructive: true,
  },
]

export default function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
  account,
  otherAccounts,
}: DeleteAccountModalProps) {
  const [selectedOption, setSelectedOption] = useState<DeleteOption>("unlink")
  const [targetAccountId, setTargetAccountId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (selectedOption === "transfer" && !targetAccountId) return
    setIsLoading(true)
    try {
      await onConfirm(selectedOption, targetAccountId || undefined)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* Warning header */}
        <div className="bg-rose-50 dark:bg-rose-900/20 px-5 pt-5 pb-4 border-b border-rose-100 dark:border-rose-800/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                  Eliminar '{account.nom}'
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">
                  Aquest compte té transaccions associades
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/50 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="px-5 pt-4 pb-3 space-y-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Què vols fer amb les transaccions?
          </p>

          {OPTIONS.map((option) => {
            const isSelected = selectedOption === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedOption(option.value)}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3",
                  isSelected
                    ? option.destructive
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                      : "border-[#ef4444] bg-[#ef4444]/5 dark:bg-[#ef4444]/10"
                    : "border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <span className={cn(
                  "mt-0.5 shrink-0",
                  isSelected ? "text-[#ef4444]" : "text-slate-400 dark:text-slate-500"
                )}>
                  {option.icon}
                </span>
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    isSelected && option.destructive
                      ? "text-rose-500"
                      : "text-slate-800 dark:text-slate-200"
                  )}>
                    {option.label}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            )
          })}

          {/* Transfer selector */}
          {selectedOption === "transfer" && (
            <div className="pt-1">
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 h-11 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Selecciona el compte destí..." />
                </SelectTrigger>
                <SelectContent>
                  {otherAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: acc.color }}
                        />
                        {acc.nom}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl font-semibold border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300"
          >
            Cancel·lar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (selectedOption === "transfer" && !targetAccountId)}
            className="flex-1 h-11 rounded-xl font-semibold text-white bg-[#ef4444] hover:bg-[#dc2626]"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}