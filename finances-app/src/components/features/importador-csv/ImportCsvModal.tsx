import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { UploadCloud, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react"
import Papa from "papaparse"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/store/authStore"
import { createTransaction, checkDuplicates, suggestCategory } from "@/lib/db/queries/transactions"
import { now, formatEuros } from "@/lib/utils"
import type { AssignmentRule, Transaction } from "@/types/database"

type CsvRow = Record<string, string | number | null | undefined>

type ImportDraft = {
  _id: string
  concepte: string
  data: number
  import_trs: number
  tipus: Transaction["tipus"]
  categoria_id: string
  esdeveniment_id: string | null
  compte_id: string
  compte_desti_id: string
  notes: string
  _isDuplicate: boolean
  _excluded: boolean
}

interface ImportCsvModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: { id: string, nom: string }[]
  categories: { id: string, nom: string, tipus: string }[]
  events: { id: string, nom: string }[]
  rules: AssignmentRule[]
}

function parseCsvDate(dateStr: string): number {
  if (!dateStr) return now()
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime()
  }
  const d = new Date(dateStr).getTime()
  return isNaN(d) ? now() : d
}

export default function ImportCsvModal({
  isOpen, onClose, onSuccess, accounts, categories, events, rules
}: ImportCsvModalProps) {
  const { userId } = useAuthStore()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rawData, setRawData] = useState<CsvRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState({ data: '', concepte: '', import: '' })
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [drafts, setDrafts] = useState<ImportDraft[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClose = () => {
    setStep(1)
    setRawData([])
    setHeaders([])
    setMapping({ data: '', concepte: '', import: '' })
    setSelectedAccount('')
    setDrafts([])
    onClose()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ variant: "destructive", title: "Error llegint l'arxiu CSV" })
          return
        }
        const detectedHeaders = results.meta.fields || []
        setHeaders(detectedHeaders)
        setRawData(results.data as CsvRow[])

        const newMapping = { data: '', concepte: '', import: '' }
        detectedHeaders.forEach(h => {
          const lower = h.toLowerCase()
          if (['data', 'fecha', 'date', 'operación'].some(w => lower.includes(w)) && !newMapping.data) newMapping.data = h
          if (['concepte', 'concepto', 'descripció', 'description'].some(w => lower.includes(w)) && !newMapping.concepte) newMapping.concepte = h
          if (['import', 'importe', 'amount', 'quantitat', 'valor'].some(w => lower.includes(w)) && !newMapping.import) newMapping.import = h
        })
        setMapping(newMapping)
        setStep(2)
      },
    })
  }

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
    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index]
      let amountStr = String(row[mapping.import] || '0')
      amountStr = amountStr.replace(/[^\d.,-]/g, '').replace(',', '.')
      const amount = parseFloat(amountStr) || 0
      const tipus: ImportDraft["tipus"] = amount >= 0 ? 'ingres' : 'despesa'
      const concepte = row[mapping.concepte] || 'Sense concepte'
      const concepteText = String(concepte)
      const concepteLower = concepteText.toLowerCase()
      const parsedDate = parseCsvDate(String(row[mapping.data] ?? ""))

      // 1. Motor de Regles d'Assignació
      let assignedCategoryId = ''
      if (rules.length > 0) {
        for (const rule of rules) {
          if (concepteLower.includes(rule.paraula_clau.toLowerCase())) {
            assignedCategoryId = rule.categoria_id
            break
          }
        }
      }

      // 2. Suggeriment per Historial (si no hi ha regla)
      if (!assignedCategoryId) {
        try {
          const suggested = await suggestCategory(userId, concepteText)
          if (suggested) {
            assignedCategoryId = suggested
          }
        } catch (e) {
          // Silenci - no bloqueja l'import si falla el suggeriment
        }
      }

      // 3. Detecció de Duplicats
      let isDuplicate = false
      try {
        const dupCheck = await checkDuplicates(userId, parsedDate, Math.abs(amount), concepteText)
        isDuplicate = dupCheck.isDuplicate
      } catch (e) {
        // Silenci - no bloqueja l'import si falla la detecció
      }

      processed.push({
        _id: `draft-${index}`,
        concepte: concepteText,
        data: parsedDate,
        import_trs: Math.abs(amount),
        tipus: tipus,
        categoria_id: assignedCategoryId,
        esdeveniment_id: null,
        compte_id: selectedAccount,
        compte_desti_id: '',
        notes: "Importat des de CSV",
        _isDuplicate: isDuplicate,
        _excluded: false,
      })
    }

    setDrafts(processed)
    setIsProcessing(false)
    setStep(3)
  }

  const updateDraft = (index: number, updates: Partial<ImportDraft>) => {
    const newDrafts = [...drafts]
    newDrafts[index] = { ...newDrafts[index], ...updates }
    setDrafts(newDrafts)
  }

  const toggleExclude = (index: number) => {
    const newDrafts = [...drafts]
    newDrafts[index] = { ...newDrafts[index], _excluded: !newDrafts[index]._excluded }
    setDrafts(newDrafts)
  }

  const handleSave = async () => {
    if (!userId) return
    setIsSaving(true)
    const toSave = drafts.filter(d => !d._excluded)
    try {
      for (const draft of toSave) {
        await createTransaction(userId, {
          concepte: draft.concepte,
          data: draft.data,
          import_trs: draft.import_trs,
          tipus: draft.tipus,
          compte_id: draft.compte_id,
          compte_desti_id: draft.tipus === 'transferencia' ? draft.compte_desti_id : null,
          categoria_id: draft.tipus !== 'transferencia' ? (draft.categoria_id || null) : null,
          esdeveniment_id: draft.esdeveniment_id || null,
          event_tag_id: null,
          liquidacio_persona_id: null,
          recurrent: false,
          notes: draft.notes ?? null,
        })
      }
      toast({ title: `${toSave.length} transaccions importades amb èxit!` })
      onSuccess()
    } catch (e) {
      toast({ variant: "destructive", title: "Error durant la importació" })
    } finally {
      setIsSaving(false)
    }
  }

  const duplicateCount = drafts.filter(d => d._isDuplicate && !d._excluded).length
  const excludedCount = drafts.filter(d => d._excluded).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Transaccions (Pas {step} de 3)</DialogTitle>
          <div className="flex items-center justify-between mt-4 mb-2 text-sm font-medium text-muted-foreground">
            <span className={step >= 1 ? "text-primary font-bold" : ""}>1. Pujar CSV</span>
            <ArrowRight className="w-4 h-4" />
            <span className={step >= 2 ? "text-primary font-bold" : ""}>2. Mapejar Columnes</span>
            <ArrowRight className="w-4 h-4" />
            <span className={step === 3 ? "text-primary font-bold" : ""}>3. Revisar i Editar</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 pr-2">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 border-2 border-dashed rounded-lg p-12 bg-muted/20">
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-semibold">Puja l'extracte del teu banc</p>
                <div className="relative inline-block mt-4">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Button type="button">Seleccionar Arxiu</Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex gap-3 text-sm dark:bg-blue-950 dark:text-blue-200">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>Hem detectat {rawData.length} files. Revisa que les columnes coincideixin.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-card">
                <div>
                  <p className="text-sm font-medium mb-1">Columna Data</p>
                  <Select value={mapping.data} onValueChange={(v) => setMapping({ ...mapping, data: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Columna Concepte</p>
                  <Select value={mapping.concepte} onValueChange={(v) => setMapping({ ...mapping, concepte: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Columna Import</p>
                  <Select value={mapping.import} onValueChange={(v) => setMapping({ ...mapping, import: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="pt-4 mt-2 border-t col-span-1 sm:col-span-3">
                  <p className="text-sm font-bold mb-1">A quin compte bancari s'apliquen?</p>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="border-primary"><SelectValue placeholder="Selecciona el compte..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleProcessMapping} className="w-full" disabled={isProcessing}>
                {isProcessing ? "Processant i detectant duplicats..." : "Processar Dades"}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">Pots editar, assignar categories i excloure duplicats abans de guardar.</p>
                <div className="flex gap-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {drafts.length - excludedCount} moviments
                  </span>
                  {duplicateCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {duplicateCount} possibles duplicats
                    </span>
                  )}
                </div>
              </div>

              {duplicateCount > 0 && (
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex gap-3 text-sm dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-medium">S'han detectat {duplicateCount} possibles duplicats</p>
                    <p className="text-xs mt-1 opacity-80">
                      Les files marcades en groc ja existeixen a la base de dades (mateixa data i import o concepte).
                      Pots excloure-les clicant el botó ✕ o forçar la seva importació si són transaccions reals.
                    </p>
                  </div>
                </div>
              )}

              <div className="border rounded-md max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-center font-medium w-10"></th>
                      <th className="p-2 text-left font-medium w-24">Data</th>
                      <th className="p-2 text-left font-medium">Concepte</th>
                      <th className="p-2 text-left font-medium w-32">Tipus</th>
                      <th className="p-2 text-left font-medium w-48">Categoria / Compte Destí</th>
                      <th className="p-2 text-left font-medium w-40">Esdeveniment</th>
                      <th className="p-2 text-right font-medium w-24">Import</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((draft, index) => (
                      <tr
                        key={draft._id}
                        className={`border-t transition-colors ${
                          draft._excluded
                            ? 'opacity-40 bg-muted/50 line-through'
                            : draft._isDuplicate
                              ? 'bg-amber-50/50 dark:bg-amber-950/20'
                              : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="p-2 text-center">
                          {draft._isDuplicate && (
                            <button
                              onClick={() => toggleExclude(index)}
                              className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
                                draft._excluded
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                              title={draft._excluded ? "Incloure de nou" : "Excloure duplicat"}
                            >
                              {draft._excluded ? '↩' : '✕'}
                            </button>
                          )}
                          {!draft._isDuplicate && !draft._excluded && (
                            <button
                              onClick={() => toggleExclude(index)}
                              className="text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                              title="Excloure"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(draft.data).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {draft._isDuplicate && !draft._excluded && (
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                            <Input
                              value={draft.concepte}
                              onChange={(e) => updateDraft(index, { concepte: e.target.value })}
                              className="h-8 text-xs"
                              disabled={draft._excluded}
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <Select value={draft.tipus} onValueChange={(v) => updateDraft(index, { tipus: v as ImportDraft["tipus"], categoria_id: '', compte_desti_id: '' })} disabled={draft._excluded}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="despesa">Despesa</SelectItem>
                              <SelectItem value="ingres">Ingrés</SelectItem>
                              <SelectItem value="transferencia">Transfer.</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          {draft.tipus === 'transferencia' ? (
                            <Select value={draft.compte_desti_id || "none"} onValueChange={(v) => updateDraft(index, { compte_desti_id: v === "none" ? "" : v })} disabled={draft._excluded}>
                              <SelectTrigger className={`h-8 text-xs ${!draft.compte_desti_id ? 'border-red-300' : ''}`}>
                                <SelectValue placeholder="Compte destí..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Selecciona --</SelectItem>
                                {accounts.filter(a => a.id !== selectedAccount).map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select value={draft.categoria_id || "none"} onValueChange={(v) => updateDraft(index, { categoria_id: v === "none" ? "" : v })} disabled={draft._excluded}>
                              <SelectTrigger className={`h-8 text-xs ${!draft.categoria_id ? 'border-amber-300' : ''}`}>
                                <SelectValue placeholder="Sense cat." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sense categoria</SelectItem>
                                {categories.filter(c => c.tipus === draft.tipus).map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="p-2">
                          <Select value={draft.esdeveniment_id || "none"} onValueChange={(v) => updateDraft(index, { esdeveniment_id: v === "none" ? null : v })} disabled={draft._excluded}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Cap viatge" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Cap viatge</SelectItem>
                              {events.map(ev => (
                                <SelectItem key={ev.id} value={ev.id}>{ev.nom}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className={`p-2 text-right font-medium ${draft.tipus === 'ingres' ? 'text-green-600' : 'text-red-500'}`}>
                          {draft.tipus === 'despesa' || draft.tipus === 'transferencia' ? '-' : '+'}{formatEuros(draft.import_trs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={isSaving}>
                  Tornar enrere
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Guardant a la BD..." : `Confirmar i Importar (${drafts.length - excludedCount})`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
