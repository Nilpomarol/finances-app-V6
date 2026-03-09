import { useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { createTransaction } from "@/lib/db/queries/transactions"
import type { Account, Person } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { formatEuros, now } from "@/lib/utils"

interface SettleUpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  person: Person & { balance: number }
  accounts: Account[]
}

export default function SettleUpModal({
  isOpen, onClose, onSuccess, person, accounts,
}: SettleUpModalProps) {
  const { userId } = useAuthStore()
  const [targetAccountId, setTargetAccountId] = useState("")
  const [amount, setAmount] = useState(Math.round(Math.abs(person.balance) * 100) / 100)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initials = person.nom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)

  const handleSettle = async () => {
    if (!userId || !targetAccountId || amount <= 0) return
    setIsSubmitting(true)
    try {
      await createTransaction(userId, {
        tipus: "ingres",
        concepte: `Liquidació: ${person.nom}`,
        import_trs: amount,
        data: now(),
        compte_id: targetAccountId,
        liquidacio_persona_id: person.id,
        recurrent: false,
        notes: `Retorn de deute acumulat`,
      })
      toast.success(`S'ha registrat el retorn de ${formatEuros(amount)}`)
      onSuccess()
      onClose()
    } catch {
      toast.error("Error al registrar la liquidació")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-emerald-600">{initials}</span>
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Liquidació
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">{person.nom} · {formatEuros(Math.abs(person.balance))} pendent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Fields */}
        <div className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/50">

          {/* Import */}
          <div className="px-4 pt-3 pb-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Import que et torna
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">€</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100) / 100)}
                className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border-none tabular-nums"
              />
            </div>
          </div>

          {/* Compte */}
          <div className="px-4 pt-3 pb-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              A quin compte reps els diners?
            </p>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none border-none appearance-none cursor-pointer"
            >
              <option value="" disabled>Selecciona compte...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="px-5 pb-5">
          <Button
            onClick={handleSettle}
            disabled={isSubmitting || !targetAccountId || amount <= 0}
            className="w-full h-12 text-base font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <CheckCircle2 className="w-4 h-4 mr-2" />
            }
            Confirmar liquidació
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}