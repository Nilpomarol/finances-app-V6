import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import Papa from "papaparse"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/store/authStore"
import { createTransaction, checkDuplicates, suggestCategory } from "@/lib/db/queries/transactions"
import { now } from "@/lib/utils"

import ImportStepHeader from "./ImportStepHeader"
import StepUpload from "./StepUpload"
import StepMapping from "./StepMapping"
import StepReview from "./StepReview"
import type { CsvRow, ImportDraft, ColumnMapping, ImportCsvModalProps } from "./types"

function parseCsvDate(dateStr: string): number {
  if (!dateStr) return now()
  const parts = dateStr.split("/")
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime()
  }
  const d = new Date(dateStr).getTime()
  return isNaN(d) ? now() : d
}

export default function ImportCsvModal({
  isOpen, onClose, onSuccess,
  accounts, categories, events, eventTags, people, rules,
}: ImportCsvModalProps) {
  const { userId } = useAuthStore()
  const { toast }  = useToast()

  const [step,            setStep           ] = useState<1 | 2 | 3>(1)
  const [rawData,         setRawData        ] = useState<CsvRow[]>([])
  const [headers,         setHeaders        ] = useState<string[]>([])
  const [firstRow,        setFirstRow       ] = useState<CsvRow>({})
  const [mapping,         setMapping        ] = useState<ColumnMapping>({ data: "", concepte: "", import: "" })
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [fileName,        setFileName       ] = useState<string>("")
  const [drafts,          setDrafts         ] = useState<ImportDraft[]>([])
  const [isSaving,        setIsSaving       ] = useState(false)
  const [isProcessing,    setIsProcessing   ] = useState(false)

  // ── Reset ────────────────────────────────────────────────────────────────────

  const handleClose = () => {
    setStep(1)
    setRawData([])
    setHeaders([])
    setFirstRow({})
    setMapping({ data: "", concepte: "", import: "" })
    setSelectedAccount("")
    setFileName("")
    setDrafts([])
    onClose()
  }

  // ── Step 1: parse CSV ────────────────────────────────────────────────────────

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ variant: "destructive", title: "Error llegint l'arxiu CSV" })
          return
        }
        const detectedHeaders = results.meta.fields || []
        const rows = results.data as CsvRow[]
        setHeaders(detectedHeaders)
        setRawData(rows)
        setFirstRow(rows[0] ?? {})

        // Auto-detect column mapping
        const newMapping: ColumnMapping = { data: "", concepte: "", import: "" }
        detectedHeaders.forEach((h) => {
          const lower = h.toLowerCase()
          if (["data", "fecha", "date", "operación"].some((w) => lower.includes(w))          && !newMapping.data)     newMapping.data     = h
          if (["concepte", "concepto", "descripció", "description"].some((w) => lower.includes(w)) && !newMapping.concepte) newMapping.concepte = h
          if (["import", "importe", "amount", "quantitat", "valor"].some((w) => lower.includes(w)) && !newMapping.import)   newMapping.import   = h
        })
        setMapping(newMapping)
        setStep(2)
      },
    })
  }

  // ── Step 2: process mapping → build drafts ───────────────────────────────────

  const handleProcessMapping = async () => {
    if (!mapping.data || !mapping.concepte || !mapping.import) {
      toast({ variant: "destructive", title: "Falten columnes per mapejar" })
      return
    }
    if (!selectedAccount) {
      toast({ variant: "destructive", title: "Selecciona un compte de destí" })
      return
    }
    if (!userId) return

    setIsProcessing(true)
    const processed: ImportDraft[] = []

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      let amountStr = String(row[mapping.import] || "0")
      amountStr = amountStr.replace(/[^\d.,-]/g, "").replace(",", ".")
      const amount      = parseFloat(amountStr) || 0
      const tipus: ImportDraft["tipus"] = amount >= 0 ? "ingres" : "despesa"
      const concepteText = String(row[mapping.concepte] || "Sense concepte")
      const parsedDate   = parseCsvDate(String(row[mapping.data] ?? ""))

      // 1. Assignment rules
      let assignedCategoryId = ""
      for (const rule of rules) {
        if (concepteText.toLowerCase().includes(rule.paraula_clau.toLowerCase())) {
          assignedCategoryId = rule.categoria_id
          break
        }
      }

      // 2. History suggestion (fallback)
      if (!assignedCategoryId) {
        try {
          const suggested = await suggestCategory(userId, concepteText)
          if (suggested) assignedCategoryId = suggested
        } catch {}
      }

      // 3. Duplicate detection
      let isDuplicate = false
      try {
        const dupCheck = await checkDuplicates(userId, parsedDate, Math.abs(amount), concepteText)
        isDuplicate = dupCheck.isDuplicate
      } catch {}

      processed.push({
        _id:                  `draft-${i}`,
        concepte:             concepteText,
        data:                 parsedDate,
        import_trs:           Math.abs(amount),
        tipus,
        categoria_id:         assignedCategoryId,
        esdeveniment_id:      null,
        event_tag_id:         null,
        compte_id:            selectedAccount,
        compte_desti_id:      "",
        notes:                "",
        recurrent:            false,
        liquidacio_persona_id: null,
        splits:               [],
        _isDuplicate:         isDuplicate,
        _excluded:            false,
        _expanded:            false,
        _expandedFocus:       null,
      })
    }

    setDrafts(processed)
    setIsProcessing(false)
    setStep(3)
  }

  // ── Step 3: draft editing ────────────────────────────────────────────────────

  const handleUpdateDraft = (index: number, updates: Partial<ImportDraft>) => {
    setDrafts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const handleToggleExclude = (index: number) => {
    setDrafts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], _excluded: !next[index]._excluded }
      return next
    })
  }

  const handleToggleExpand = (index: number, focus: ImportDraft["_expandedFocus"] = null) => {
    setDrafts((prev) => {
      const next = [...prev]
      const current = next[index]
      // If already expanded with same focus, collapse. Otherwise open with new focus.
      const willCollapse = current._expanded && current._expandedFocus === focus
      next[index] = {
        ...current,
        _expanded: !willCollapse,
        _expandedFocus: willCollapse ? null : focus,
      }
      return next
    })
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!userId) return
    setIsSaving(true)
    const toSave = drafts.filter((d) => !d._excluded)
    try {
      for (const draft of toSave) {
        await createTransaction(userId, {
          concepte:              draft.concepte,
          data:                  draft.data,
          import_trs:            draft.import_trs,
          tipus:                 draft.tipus,
          compte_id:             draft.compte_id,
          compte_desti_id:       draft.tipus === "transferencia" ? draft.compte_desti_id : null,
          categoria_id:          draft.tipus !== "transferencia" ? draft.categoria_id || null : null,
          esdeveniment_id:       draft.esdeveniment_id || null,
          event_tag_id:          draft.event_tag_id || null,
          liquidacio_persona_id: draft.liquidacio_persona_id || null,
          recurrent:             draft.recurrent,
          notes:                 draft.notes || null,
          deutes:                draft.splits.filter((s) => s.persona_id && s.import_degut > 0),
        })
      }
      toast({ title: `${toSave.length} transaccions importades amb èxit!` })
      onSuccess()
    } catch {
      toast({ variant: "destructive", title: "Error durant la importació" })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[1100px] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-0">
        <ImportStepHeader step={step} onClose={handleClose} />

        <div className="flex-1 overflow-y-auto bg-background px-6 py-5">
          {step === 1 && (
            <StepUpload onFileUpload={handleFileUpload} />
          )}

          {step === 2 && (
            <StepMapping
              headers={headers}
              firstRow={firstRow}
              mapping={mapping}
              setMapping={setMapping}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              accounts={accounts}
              rawDataLength={rawData.length}
              fileName={fileName}
              isProcessing={isProcessing}
              onProcess={handleProcessMapping}
            />
          )}

          {step === 3 && (
            <StepReview
              drafts={drafts}
              accounts={accounts}
              categories={categories}
              events={events}
              eventTags={eventTags}
              people={people}
              selectedAccount={selectedAccount}
              isSaving={isSaving}
              onUpdateDraft={handleUpdateDraft}
              onToggleExclude={handleToggleExclude}
              onToggleExpand={handleToggleExpand}
              onBack={() => setStep(2)}
              onSave={handleSave}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}