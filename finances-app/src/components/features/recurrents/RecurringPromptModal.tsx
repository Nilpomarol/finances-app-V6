import { useState } from "react"
import { RefreshCw, Trash2, SkipForward, Plus, Loader2, X, ChevronDown, ChevronUp } from "lucide-react"
import { createTransaction } from "@/lib/db/queries/transactions"
import {
  markRecurringTemplateHandled,
  eliminateRecurringTemplate,
} from "@/lib/db/queries/recurring-templates"
import { cn, formatEuros } from "@/lib/utils"
import { iconMap, fallbackIcon } from "@/lib/iconMap"
import type { RecurringTemplate, Account, Category } from "@/types/database"

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayInputValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplateRowProps {
  template: RecurringTemplate
  accounts: Account[]
  categories: Category[]
  userId: string
  onDone: (templateId: string) => void
}

function TemplateRow({ template, accounts, categories, userId, onDone }: TemplateRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [concepte, setConcepte] = useState(template.concepte)
  const [importStr, setImportStr] = useState(String(template.user_import ?? template.import_trs))
  const [dataStr, setDataStr] = useState(todayInputValue())
  const [notes, setNotes] = useState(template.notes ?? "")
  const [loading, setLoading] = useState<"afegir" | "saltar" | "eliminar" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const category = categories.find(c => c.id === template.categoria_id)
  const account = accounts.find(a => a.id === template.compte_id)
  const IconComponent = category ? (iconMap[category.icona] ?? fallbackIcon) : fallbackIcon
  const accentColor = category?.color ?? "#94a3b8"
  const isDespesa = template.tipus === "despesa"
  const isLoading = loading !== null

  async function handleAfegir() {
    const amount = parseFloat(importStr.replace(",", "."))
    if (isNaN(amount) || amount <= 0) { setError("Import invàlid"); return }
    setLoading("afegir")
    setError(null)
    try {
      await createTransaction(userId, {
        concepte: concepte.trim() || template.concepte,
        import_trs: amount,
        data: new Date(dataStr).getTime(),
        notes: notes.trim() || null,
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
      const today = new Date()
      await eliminateRecurringTemplate(template.id, userId, today.getFullYear(), today.getMonth())
      onDone(template.id)
    } catch {
      setError("Error en eliminar")
      setLoading(null)
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all",
        isLoading && "opacity-60 pointer-events-none"
      )}
    >
      {/* Color header strip */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor }}
      />

      {/* Main row */}
      <div className="px-4 pt-3 pb-3">
        {/* Category + type badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <IconComponent className="w-4 h-4 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{template.concepte}</p>
            <p className="text-xs text-muted-foreground truncate">
              {category?.nom ?? "Sense categoria"}
              {account ? ` · ${account.nom}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-base font-bold font-mono",
              isDespesa ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"
            )}>
              {isDespesa ? "-" : "+"}{formatEuros(parseFloat(importStr.replace(",", ".")) || (template.user_import ?? template.import_trs))}
            </span>
          </div>
        </div>

        {/* Expand/collapse edit fields */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Tancar edició" : `Data: ${dataStr} · Editar detalls`}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2.5 border-t pt-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Concepte</label>
              <input
                type="text"
                value={concepte}
                onChange={e => setConcepte(e.target.value)}
                className="mt-0.5 w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Concepte"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Import (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={importStr}
                  onChange={e => setImportStr(e.target.value)}
                  className="mt-0.5 w-full text-sm font-mono bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Data</label>
                <input
                  type="date"
                  value={dataStr}
                  onChange={e => setDataStr(e.target.value)}
                  className="mt-0.5 w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-0.5 w-full text-xs bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Notes opcionals"
              />
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 border-t divide-x">
        <button
          onClick={handleSaltar}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
        >
          {loading === "saltar"
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <SkipForward className="w-3.5 h-3.5" />
          }
          Saltar
        </button>
        <button
          onClick={handleAfegir}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
        >
          {loading === "afegir"
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Plus className="w-3.5 h-3.5" />
          }
          Afegir
        </button>
        <button
          onClick={handleEliminar}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
        >
          {loading === "eliminar"
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
          Eliminar
        </button>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4.5 h-4.5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Recurrents pendents</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {templates.length} pagament{templates.length !== 1 ? "s" : ""} per confirmar aquest mes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable template list */}
        <div className="overflow-y-auto p-4 space-y-3">
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
      </div>
    </div>
  )
}
