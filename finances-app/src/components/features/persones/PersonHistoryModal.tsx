import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { getPersonHistory, type PersonHistoryItem } from "@/lib/db/queries/people"
import { useAuthStore } from "@/store/authStore"
import type { Person } from "@/types/database"
import { formatDate, formatEuros } from "@/lib/utils"
import { X, ArrowDownLeft, ArrowUpRight, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PersonHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  person: (Person & { balance: number }) | null
}

function getDeutes(history: PersonHistoryItem[]): PersonHistoryItem[] {
  // history is sorted date DESC — take only debts before the first liquidacio
  const settleIdx = history.findIndex(i => String(i.tipus) === "liquidacio")
  if (settleIdx === -1) {
    // No settle-up ever — return all debts
    return history.filter(i => String(i.tipus) === "deute")
  }
  // Return only debts that appear before (i.e. more recent than) the last settle-up
  return history.slice(0, settleIdx).filter(i => String(i.tipus) === "deute")
}

function buildCopyText(items: PersonHistoryItem[]): string {
  const lines = items.map((item, idx) => {
    const ts = Number(item.data)
    const date = new Date(ts > 1e12 ? ts : ts * 1000)
    const dd = String(date.getDate()).padStart(2, "0")
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const val = Math.round(Number(item.import) * 100) / 100
    const amount = val % 1 === 0 ? `${val}€` : `${val.toFixed(2)}€`
    return `${idx + 1}. ${amount} ${item.concepte} (${dd}/${mm})`
  })
  const total = Math.round(items.reduce((s, i) => s + Number(i.import), 0) * 100) / 100
  const totalStr = total % 1 === 0 ? `${total}€` : `${total.toFixed(2)}€`
  return [...lines, "", `Total: ${totalStr}`].join("\n")
}

export default function PersonHistoryModal({ isOpen, onClose, person }: PersonHistoryModalProps) {
  const { userId } = useAuthStore()
  const [history, setHistory] = useState<PersonHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen || !person || !userId) return
    setIsLoading(true)
    getPersonHistory(person.id, userId)
      .then((data) => setHistory(data))
      .catch((err) => console.error("[PersonHistory] error:", err))
      .finally(() => setIsLoading(false))
  }, [isOpen, person?.id, userId])

  useEffect(() => {
    if (!isOpen) {
      setHistory([])
      setCopied(false)
    }
  }, [isOpen])

  if (!person) return null

  const initials = person.nom.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
  const balancePositive = person.balance > 0
  const balanceNeutral = person.balance === 0
  const balanceColor = balancePositive ? "#22c55e" : person.balance < 0 ? "#ef4444" : "#94a3b8"

  const deutes = getDeutes(history)
  const canCopy = !isLoading && deutes.length > 0

  const handleCopy = async () => {
    if (!canCopy) return
    const text = buildCopyText(deutes)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl max-h-[85vh] flex flex-col">

        {/* Header — name + copy button + close all in one row */}
        <div
          className="shrink-0 px-5 pt-5 pb-4"
          style={{ backgroundColor: balanceColor + "14" }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
              style={{ backgroundColor: balanceColor + "30", color: balanceColor }}
            >
              {initials}
            </div>

            {/* Name + balance */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {person.nom}
              </DialogTitle>
              <p className="text-xs mt-0.5 font-semibold tabular-nums" style={{ color: balanceColor }}>
                {balanceNeutral
                  ? "Al corrent"
                  : balancePositive
                  ? `Et deu ${formatEuros(person.balance)}`
                  : `Li deus ${formatEuros(Math.abs(person.balance))}`}
              </p>
            </div>

            {/* Copy button — always in header, no conditional flex issues */}
            {canCopy && (
              <button
                onClick={handleCopy}
                title="Copiar moviments"
                className="h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0"
                style={{
                  backgroundColor: copied ? "#22c55e22" : balanceColor + "22",
                  color: copied ? "#22c55e" : balanceColor,
                }}
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" />Copiat</>
                  : <><Copy className="w-3.5 h-3.5" />Copiar ({deutes.length})</>
                }
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 shrink-0"
              style={{ backgroundColor: balanceColor + "22" }}
            >
              <X className="w-4 h-4" style={{ color: balanceColor }} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px shrink-0" style={{ backgroundColor: balanceColor + "30" }} />

        {/* History list */}
        <div className="overflow-y-auto flex-1 min-h-0 p-3 pb-3">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Cap moviment registrat</p>
              <p className="text-xs text-slate-400 mt-1">Els moviments amb {person.nom} apareixeran aquí</p>
            </div>
          ) : (
            <div className="space-y-1.5 p-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      String(item.tipus) === "deute"
                        ? "bg-rose-500/10 text-rose-500"
                        : "bg-emerald-500/10 text-emerald-600"
                    )}
                  >
                    {String(item.tipus) === "deute"
                      ? <ArrowDownLeft className="w-4 h-4" />
                      : <ArrowUpRight className="w-4 h-4" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">
                      {item.concepte}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(item.data)} · {String(item.tipus) === "deute" ? "Deute generat" : "Liquidació"}
                    </p>
                  </div>

                  <span className={cn(
                    "text-sm font-bold tabular-nums shrink-0",
                    String(item.tipus) === "deute" ? "text-rose-500" : "text-emerald-600"
                  )}>
                    {String(item.tipus) === "deute" ? "+" : "−"}{formatEuros(Number(item.import))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}