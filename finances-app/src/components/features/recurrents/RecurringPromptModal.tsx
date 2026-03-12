import { useState } from "react"
import { RefreshCw, Trash2, SkipForward, Plus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ColorDot } from "@/components/shared/ColorDot"
import { createTransaction } from "@/lib/db/queries/transactions"
import {
  markRecurringTemplateHandled,
  eliminateRecurringTemplate,
} from "@/lib/db/queries/recurring-templates"
import type { RecurringTemplate, Account, Category } from "@/types/database"

interface TemplateItemEdit {
  concepte: string
  import_trs: string
  data: string
  notes: string
}

interface TemplateRowProps {
  template: RecurringTemplate
  accounts: Account[]
  categories: Category[]
  userId: string
  onDone: (templateId: string) => void
}

function todayInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function TemplateRow({ template, accounts, categories, userId, onDone }: TemplateRowProps) {
  const [edit, setEdit] = useState<TemplateItemEdit>({
    concepte: template.concepte,
    import_trs: String(template.import_trs),
    data: todayInputValue(),
    notes: template.notes ?? "",
  })
  const [loading, setLoading] = useState<"afegir" | "saltar" | "eliminar" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const category = categories.find(c => c.id === template.categoria_id)
  const account = accounts.find(a => a.id === template.compte_id)

  async function handleAfegir() {
    const amount = parseFloat(edit.import_trs.replace(",", "."))
    if (isNaN(amount) || amount <= 0) {
      setError("Import invàlid")
      return
    }
    setLoading("afegir")
    setError(null)
    try {
      await createTransaction(userId, {
        concepte: edit.concepte.trim() || template.concepte,
        import_trs: amount,
        data: new Date(edit.data).getTime(),
        notes: edit.notes.trim() || null,
        compte_id: template.compte_id,
        categoria_id: template.categoria_id,
        tipus: template.tipus,
        pagat_per_id: template.pagat_per_id,
        recurrent: true,
      })
      await markRecurringTemplateHandled(template.id, userId)
      window.dispatchEvent(new CustomEvent("finances:refresc"))
      onDone(template.id)
    } catch {
      setError("Error en crear la transacció")
      setLoading(null)
    }
  }

  async function handleSaltar() {
    setLoading("saltar")
    try {
      await markRecurringTemplateHandled(template.id, userId)
      onDone(template.id)
    } catch {
      setError("Error en saltar")
      setLoading(null)
    }
  }

  async function handleEliminar() {
    setLoading("eliminar")
    try {
      await eliminateRecurringTemplate(template.id, userId)
      onDone(template.id)
    } catch {
      setError("Error en eliminar")
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Category + account info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {category && <ColorDot color={category.color} />}
        <span>{category?.nom ?? "Sense categoria"}</span>
        {account && <><span>·</span><span>{account.nom}</span></>}
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
          template.tipus === "despesa"
            ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}>
          {template.tipus}
        </span>
      </div>

      {/* Editable fields */}
      <div className="space-y-2">
        <input
          type="text"
          value={edit.concepte}
          onChange={e => setEdit(v => ({ ...v, concepte: e.target.value }))}
          disabled={isLoading}
          className="w-full text-sm font-medium bg-transparent border-b border-muted focus:border-primary focus:outline-none py-0.5 disabled:opacity-50"
          placeholder="Concepte"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Import</label>
            <input
              type="text"
              inputMode="decimal"
              value={edit.import_trs}
              onChange={e => setEdit(v => ({ ...v, import_trs: e.target.value }))}
              disabled={isLoading}
              className="w-full text-sm font-mono bg-transparent border-b border-muted focus:border-primary focus:outline-none py-0.5 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Data</label>
            <input
              type="date"
              value={edit.data}
              onChange={e => setEdit(v => ({ ...v, data: e.target.value }))}
              disabled={isLoading}
              className="w-full text-sm bg-transparent border-b border-muted focus:border-primary focus:outline-none py-0.5 disabled:opacity-50"
            />
          </div>
        </div>
        <input
          type="text"
          value={edit.notes}
          onChange={e => setEdit(v => ({ ...v, notes: e.target.value }))}
          disabled={isLoading}
          className="w-full text-xs text-muted-foreground bg-transparent border-b border-muted focus:border-primary focus:outline-none py-0.5 disabled:opacity-50"
          placeholder="Notes (opcional)"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          size="sm"
          onClick={handleAfegir}
          disabled={isLoading}
          className="gap-1.5"
        >
          {loading === "afegir" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Afegir
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaltar}
          disabled={isLoading}
          className="gap-1.5"
        >
          {loading === "saltar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5" />}
          Saltar mes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEliminar}
          disabled={isLoading}
          className="gap-1.5 text-destructive hover:text-destructive ml-auto"
        >
          {loading === "eliminar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Eliminar recurrent
        </Button>
      </div>
    </div>
  )
}

interface RecurringPromptModalProps {
  isOpen: boolean
  templates: RecurringTemplate[]
  accounts: Account[]
  categories: Category[]
  userId: string
  onRemoveTemplate: (templateId: string) => void
  onClose: () => void
}

export function RecurringPromptModal({
  isOpen,
  templates,
  accounts,
  categories,
  userId,
  onRemoveTemplate,
  onClose,
}: RecurringPromptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-500" />
            Recurrents pendents aquest mes
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Revisa i confirma els pagaments periòdics. Pots editar els detalls abans d'afegir.
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {templates.map(template => (
            <TemplateRow
              key={template.id}
              template={template}
              accounts={accounts}
              categories={categories}
              userId={userId}
              onDone={onRemoveTemplate}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
