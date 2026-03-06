import { useState } from "react"
import type { Account } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Loader2 } from "lucide-react"

type DeleteOption = "cancel" | "delete-all" | "unlink" | "transfer"

interface DeleteAccountModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (option: DeleteOption, targetAccountId?: string) => Promise<void>
  account: Account
  otherAccounts: Account[]
}

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Eliminar '{account.nom}'</DialogTitle>
              <DialogDescription>
                Aquest compte té transaccions associades. Què vols fer amb elles?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {[
            {
              value: "unlink" as DeleteOption,
              label: "Desvincular les transaccions",
              description: "Les transaccions es mantenen però sense compte assignat",
            },
            {
              value: "transfer" as DeleteOption,
              label: "Moure a un altre compte",
              description: "Totes les transaccions es mouen al compte seleccionat",
            },
            {
              value: "delete-all" as DeleteOption,
              label: "Eliminar-ho tot",
              description: "S'eliminen el compte i totes les seves transaccions",
              destructive: true,
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedOption(option.value)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedOption === option.value
                  ? option.destructive
                    ? "border-destructive bg-destructive/5"
                    : "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <p className={`text-sm font-medium ${option.destructive ? "text-destructive" : ""}`}>
                {option.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {option.description}
              </p>
            </button>
          ))}

          {/* Selector de compte destí per a l'opció "transfer" */}
          {selectedOption === "transfer" && (
            <div className="pt-1">
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el compte destí..." />
                </SelectTrigger>
                <SelectContent>
                  {otherAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel·lar
          </Button>
          <Button
            variant={selectedOption === "delete-all" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (selectedOption === "transfer" && !targetAccountId)
            }
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}