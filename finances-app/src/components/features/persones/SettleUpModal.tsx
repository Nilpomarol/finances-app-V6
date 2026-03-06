import { useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { createTransaction } from "@/lib/db/queries/transactions"
import { Account, Person } from "@/types/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { now } from "@/lib/utils"

interface SettleUpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  person: Person & { balance: number }
  accounts: Account[]
}

export default function SettleUpModal({ isOpen, onClose, onSuccess, person, accounts }: SettleUpModalProps) {
  const { userId } = useAuthStore()
  const [targetAccountId, setTargetAccountId] = useState("")
  const [amount, setAmount] = useState(Math.abs(person.balance))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSettle = async () => {
    if (!userId || !targetAccountId || amount <= 0) return
    setIsSubmitting(true)

    try {
      await createTransaction(userId, {
        tipus: 'ingres',
        concepte: `Liquidació: ${person.nom}`,
        import_trs: amount,
        data: now(),
        compte_id: targetAccountId,
        liquidacio_persona_id: person.id, // Enllaç clau per al càlcul de deutes
        recurrent: false,
        notes: `Retorn de deute acumulat`
      })

      toast.success(`S'ha registrat el retorn de ${amount.toFixed(2)}€`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error("Error al registrar la liquidació")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Liquidació amb {person.nom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Import que et torna</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>A quin compte reps els diners?</Label>
            <Select onValueChange={setTargetAccountId} value={targetAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecciona compte..." /></SelectTrigger>
              <SelectContent>
                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel·lar</Button>
          <Button onClick={handleSettle} disabled={isSubmitting || !targetAccountId}>
            Confirmar Liquidació
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}