import { useState } from "react"
import { Search, Repeat, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getTransactions, updateTransaction } from "@/lib/db/queries/transactions"
import { formatEuros } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { TransactionWithRelations } from "@/types/database"

type RecurrentCandidate = {
  key: string
  concepte: string
  frequency: "Setmanal" | "Quinzenal" | "Mensual"
  instances: TransactionWithRelations[]
  avgAmount: number
  allAlreadyMarked: boolean
}

function detectRecurrentPatterns(txs: TransactionWithRelations[]): RecurrentCandidate[] {
  const groups = new Map<string, TransactionWithRelations[]>()
  for (const tx of txs) {
    if (tx.tipus === "transferencia") continue
    const key = tx.concepte.trim().toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const candidates: RecurrentCandidate[] = []
  for (const [key, instances] of groups) {
    if (instances.length < 2) continue
    const sorted = [...instances].sort((a, b) => a.data - b.data)
    const diffs: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      diffs.push((sorted[i].data - sorted[i - 1].data) / (1000 * 60 * 60 * 24))
    }
    diffs.sort((a, b) => a - b)
    const median = diffs[Math.floor(diffs.length / 2)]

    let frequency: RecurrentCandidate["frequency"] | null = null
    if (median >= 6 && median <= 9) frequency = "Setmanal"
    else if (median >= 12 && median <= 16) frequency = "Quinzenal"
    else if (median >= 25 && median <= 35) frequency = "Mensual"
    if (!frequency) continue

    const avgAmount = instances.reduce((s, t) => s + t.import_trs, 0) / instances.length
    const allAlreadyMarked = instances.every(t => t.recurrent)
    candidates.push({ key, concepte: instances[0].concepte, frequency, instances, avgAmount, allAlreadyMarked })
  }

  return candidates.sort((a, b) => b.avgAmount - a.avgAmount)
}

interface DetectRecurrentsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onDone?: () => void
}

export function DetectRecurrentsModal({ isOpen, onClose, userId, onDone }: DetectRecurrentsModalProps) {
  const { toast } = useToast()
  const [isDetecting, setIsDetecting] = useState(false)
  const [candidates, setCandidates] = useState<RecurrentCandidate[] | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [isMarking, setIsMarking] = useState(false)

  async function handleDetect() {
    setIsDetecting(true)
    setCandidates(null)
    try {
      const now = new Date()
      const dateStart = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).getTime()
      const txs = await getTransactions({ userId, dateStart, dateEnd: now.getTime(), excludeLiquidacions: true, limit: 10000 })
      const result = detectRecurrentPatterns(txs)
      setCandidates(result)
      setSelectedKeys(new Set(result.filter(c => !c.allAlreadyMarked).map(c => c.key)))
    } catch {
      toast({ variant: "destructive", title: "Error al detectar patrons recurrents." })
    } finally {
      setIsDetecting(false)
    }
  }

  async function handleMark() {
    if (!candidates) return
    setIsMarking(true)
    try {
      const toMark = candidates.filter(c => selectedKeys.has(c.key))
      const allInstances = toMark.flatMap(c => c.instances.filter(t => !t.recurrent))
      await Promise.all(allInstances.map(tx => updateTransaction(tx.id, userId, { recurrent: true })))
      toast({ title: `${allInstances.length} transaccions marcades com a recurrents` })
      window.dispatchEvent(new CustomEvent("finances:refresc"))
      setCandidates(null)
      setSelectedKeys(new Set())
      onDone?.()
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Error al marcar les transaccions." })
    } finally {
      setIsMarking(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setCandidates(null)
      setSelectedKeys(new Set())
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Detectar recurrents
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Analitza els últims 6 mesos i detecta transaccions que es repeteixen regularment.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Detect button */}
          {candidates === null && (
            <Button onClick={handleDetect} disabled={isDetecting} className="w-full gap-2">
              {isDetecting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              {isDetecting ? "Analitzant..." : "Analitzar transaccions"}
            </Button>
          )}

          {/* Results */}
          {candidates !== null && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {candidates.length} patró{candidates.length !== 1 ? "ns" : ""} trobat{candidates.length !== 1 ? "s" : ""}
                </p>
                <Button size="sm" variant="ghost" onClick={handleDetect} disabled={isDetecting} className="text-xs h-7">
                  Tornar a analitzar
                </Button>
              </div>

              {candidates.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Search className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-sm font-medium">Cap patró recurrent detectat</p>
                  <p className="text-xs opacity-70 mt-1">No s'han trobat transaccions que es repeteixin regularment.</p>
                </div>
              ) : (
                <div className="rounded-xl border divide-y overflow-hidden">
                  {candidates.map(c => {
                    const isSelected = selectedKeys.has(c.key)
                    return (
                      <label
                        key={c.key}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors",
                          c.allAlreadyMarked
                            ? "opacity-50 cursor-default"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-primary shrink-0"
                          checked={isSelected}
                          disabled={c.allAlreadyMarked}
                          onChange={() => {
                            setSelectedKeys(prev => {
                              const next = new Set(prev)
                              if (next.has(c.key)) next.delete(c.key)
                              else next.add(c.key)
                              return next
                            })
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{c.concepte}</span>
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              c.frequency === "Mensual"
                                ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : c.frequency === "Setmanal"
                                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}>
                              {c.frequency}
                            </span>
                            {c.allAlreadyMarked && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                                Ja marcades
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.instances.length} ocurrències · ~{formatEuros(c.avgAmount)} de mitjana
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              {candidates.length > 0 && (
                <Button
                  onClick={handleMark}
                  disabled={isMarking || selectedKeys.size === 0}
                  className="w-full gap-2"
                >
                  {isMarking
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Repeat className="w-4 h-4" />}
                  Marcar seleccionats ({selectedKeys.size})
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
