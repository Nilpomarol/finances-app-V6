import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getPersonHistory, type PersonHistoryItem } from "@/lib/db/queries/people"
import { useAuthStore } from "@/store/authStore"
import type { Person } from "@/types/database"
import { formatDate, formatEuros } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

interface PersonHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  person: (Person & { balance: number }) | null
}

export default function PersonHistoryModal({ isOpen, onClose, person }: PersonHistoryModalProps) {
  const { userId } = useAuthStore()
  const [history, setHistory] = useState<PersonHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && person && userId) {
      setIsLoading(true)
      getPersonHistory(person.id, userId).then((data) => {
        setHistory(data)
        setIsLoading(false)
      })
    }
  }, [isOpen, person, userId])

  if (!person) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Historial amb {person.nom}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Saldo actual: <span className={`font-bold ${person.balance > 0 ? "text-green-600" : person.balance < 0 ? "text-red-500" : ""}`}>
              {formatEuros(person.balance)}
            </span>
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-2">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregant historial...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No hi ha moviments amb aquesta persona.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-full shrink-0 ${item.tipus === 'deute' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {item.tipus === 'deute' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.concepte}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.data)} • {item.tipus === 'deute' ? 'Deute generat' : 'Liquidació'}</p>
                  </div>
                </div>
                <div className={`font-semibold shrink-0 ${item.tipus === 'deute' ? 'text-red-600' : 'text-green-600'}`}>
                  {item.tipus === 'deute' ? '+' : '-'}{formatEuros(item.import)}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}