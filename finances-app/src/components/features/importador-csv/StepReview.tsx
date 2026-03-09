import { useRef, useEffect } from "react"
import { AlertTriangle, X, RotateCcw, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { formatEuros } from "@/lib/utils"
import type { ImportDraft, DraftSplit, StepReviewProps } from "./types"

export default function StepReview({
  drafts, accounts = [], categories = [], events = [], eventTags = [], people = [],
  selectedAccount, isSaving,
  onUpdateDraft, onToggleExclude, onToggleExpand, onBack, onSave,
}: StepReviewProps) {
  const duplicateCount = drafts.filter((d) => d._isDuplicate && !d._excluded).length
  const excludedCount  = drafts.filter((d) => d._excluded).length
  const toImportCount  = drafts.length - excludedCount

  return (
    <div className="space-y-4 h-full flex flex-col">

      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <p className="text-sm text-muted-foreground">
          Edita, assigna categories i exclou duplicats abans de guardar.
        </p>
        <div className="flex gap-2">
          <span className="bg-[#f43f5e]/10 text-[#f43f5e] px-3 py-1 rounded-full text-xs font-semibold">
            {toImportCount} moviments
          </span>
          {excludedCount > 0 && (
            <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
              {excludedCount} exclosos
            </span>
          )}
          {duplicateCount > 0 && (
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {duplicateCount} duplicats
            </span>
          )}
        </div>
      </div>

      {duplicateCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-xl flex gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">{duplicateCount} possibles duplicats detectats. </span>
            Les files marcades ja existeixen (mateixa data i import). Exclou-les o força la importació si són reals.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-border/60 min-h-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 w-8" />
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[115px]">Data</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Concepte</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[110px]">Tipus</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[155px]">Categoria</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[155px]">Esdeveniment</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-[110px]">Import</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {drafts.map((draft, index) => (
              <DraftRow
                key={draft._id}
                draft={draft}
                index={index}
                accounts={accounts}
                categories={categories}
                events={events}
                eventTags={eventTags}
                people={people}
                selectedAccount={selectedAccount}
                onUpdate={onUpdateDraft}
                onToggleExclude={onToggleExclude}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-2 shrink-0">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="flex-1 h-11 rounded-xl border border-border/60 bg-background hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
        >
          ← Tornar enrere
        </button>
        <button
          onClick={onSave}
          disabled={isSaving || toImportCount === 0}
          className="flex-[2] h-11 rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-md shadow-[#f43f5e]/20"
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardant...
            </span>
          ) : `Confirmar i Importar (${toImportCount})`}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DraftRow
// ─────────────────────────────────────────────────────────────────────────────

interface DraftRowProps {
  draft: ImportDraft
  index: number
  accounts: { id: string; nom: string }[]
  categories: { id: string; nom: string; tipus: string }[]
  events: { id: string; nom: string }[]
  eventTags: { id: string; nom: string; color: string; tipus_esdeveniment?: string }[]
  people: { id: string; nom: string }[]
  selectedAccount: string
  onUpdate: (index: number, updates: Partial<ImportDraft>) => void
  onToggleExclude: (index: number) => void
  onToggleExpand: (index: number, focus?: ImportDraft["_expandedFocus"]) => void
}

function DraftRow({
  draft, index,
  accounts = [], categories = [], events = [], eventTags = [], people = [],
  selectedAccount, onUpdate, onToggleExclude, onToggleExpand,
}: DraftRowProps) {
  const hasEvent   = !!draft.esdeveniment_id
  const safeSplits = draft.splits ?? []
  const hasSplits  = safeSplits.length > 0
  const splitTotal = safeSplits.reduce((a, s) => a + s.import_degut, 0)
  const splitBalanced = Math.abs(splitTotal - draft.import_trs) < 0.01

  const tagsForEvent = hasEvent
    ? eventTags.filter((t) => !t.tipus_esdeveniment || t.tipus_esdeveniment === draft.esdeveniment_id)
    : []

  // Refs for focus scrolling
  const splitsRef = useRef<HTMLDivElement>(null)
  const tagRef    = useRef<HTMLDivElement>(null)

  // When the panel opens with a focus hint, scroll that section into view
  useEffect(() => {
    if (!draft._expanded) return
    if (draft._expandedFocus === "splits" && splitsRef.current) {
      splitsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
    if (draft._expandedFocus === "tag" && tagRef.current) {
      tagRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [draft._expanded, draft._expandedFocus])

  const addSplit    = () => onUpdate(index, { splits: [...safeSplits, { persona_id: "", import_degut: 0 }] })
  const removeSplit = (si: number) => onUpdate(index, { splits: safeSplits.filter((_, i) => i !== si) })
  const updateSplit = (si: number, updates: Partial<DraftSplit>) =>
    onUpdate(index, { splits: safeSplits.map((s, i) => i === si ? { ...s, ...updates } : s) })

  const rowBg = draft._excluded
    ? "opacity-35 bg-muted/20"
    : draft._isDuplicate
    ? "bg-amber-50/60 dark:bg-amber-950/10"
    : "hover:bg-muted/20"

  return (
    <>
      {/* ── Main row ── */}
      <tr className={`transition-colors group ${rowBg}`}>

        {/* Exclude toggle */}
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => onToggleExclude(index)}
            title={draft._excluded ? "Incloure de nou" : "Excloure"}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all mx-auto
              ${draft._excluded
                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 opacity-100"
                : draft._isDuplicate
                ? "bg-amber-100 text-amber-600 hover:bg-amber-200 opacity-100"
                : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100"
              }`}
          >
            {draft._excluded ? <RotateCcw className="w-3 h-3" /> : <X className="w-3 h-3" />}
          </button>
        </td>

        {/* Date */}
        <td className="px-3 py-2">
          <input
            type="date"
            value={new Date(draft.data).toISOString().split("T")[0]}
            onChange={(e) => onUpdate(index, { data: new Date(e.target.value + "T12:00:00").getTime() })}
            disabled={draft._excluded}
            className="w-[105px] h-7 text-xs rounded-lg border border-border/50 bg-transparent px-2 text-foreground disabled:opacity-50 focus:outline-none focus:border-[#3b82f6]/50"
          />
        </td>

        {/* Concept */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {draft._isDuplicate && !draft._excluded && (
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            )}
            <Input
              value={draft.concepte}
              onChange={(e) => onUpdate(index, { concepte: e.target.value })}
              className="h-7 text-xs rounded-lg border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-border px-1.5 transition-colors"
              disabled={draft._excluded}
            />
          </div>
        </td>

        {/* Tipus */}
        <td className="px-3 py-2">
          <Select
            value={draft.tipus}
            onValueChange={(v) => onUpdate(index, {
              tipus: v as ImportDraft["tipus"],
              categoria_id: "",
              compte_desti_id: "",
            })}
            disabled={draft._excluded}
          >
            <SelectTrigger className="h-7 text-xs rounded-lg border-border/40 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="despesa">Despesa</SelectItem>
              <SelectItem value="ingres">Ingrés</SelectItem>
              <SelectItem value="transferencia">Transfer.</SelectItem>
            </SelectContent>
          </Select>
        </td>

        {/* Categoria / Compte destí */}
        <td className="px-3 py-2">
          {draft.tipus === "transferencia" ? (
            <Select
              value={draft.compte_desti_id || "none"}
              onValueChange={(v) => onUpdate(index, { compte_desti_id: v === "none" ? "" : v })}
              disabled={draft._excluded}
            >
              <SelectTrigger className={`h-7 text-xs rounded-lg ${!draft.compte_desti_id ? "border-red-300/60" : "border-border/40"}`}>
                <SelectValue placeholder="Compte destí..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Selecciona —</SelectItem>
                {accounts.filter((a) => a.id !== selectedAccount).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={draft.categoria_id || "none"}
              onValueChange={(v) => onUpdate(index, { categoria_id: v === "none" ? "" : v })}
              disabled={draft._excluded}
            >
              <SelectTrigger className={`h-7 text-xs rounded-lg ${!draft.categoria_id ? "border-amber-300/50" : "border-border/40"}`}>
                <SelectValue placeholder="Sense cat." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sense categoria</SelectItem>
                {categories.filter((c) => c.tipus === draft.tipus).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </td>

        {/* Esdeveniment — auto-opens expanded panel focused on tag when an event is picked */}
        <td className="px-3 py-2">
          <Select
            value={draft.esdeveniment_id || "none"}
            onValueChange={(v) => {
              const newEventId = v === "none" ? null : v
              onUpdate(index, { esdeveniment_id: newEventId, event_tag_id: null })
              // If an event was selected, open panel focused on the tag field
              if (newEventId && !draft._expanded) {
                onToggleExpand(index, "tag")
              }
            }}
            disabled={draft._excluded}
          >
            <SelectTrigger className="h-7 text-xs rounded-lg border-border/40">
              <SelectValue placeholder="Cap" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Cap</SelectItem>
              {events.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>{ev.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* Import + splits icon */}
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1.5">
            {/* Splits / share icon — always visible for despesa, opens panel focused on splits */}
            {draft.tipus === "despesa" && !draft._excluded && (
              <button
                onClick={() => onToggleExpand(index, "splits")}
                title="Dividir despesa"
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0
                  ${hasSplits
                    ? splitBalanced
                      ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-500"
                    : "bg-muted text-muted-foreground hover:bg-[#f43f5e]/10 hover:text-[#f43f5e] opacity-0 group-hover:opacity-100"
                  }`}
              >
                <Users className="w-3 h-3" />
              </button>
            )}

            <span className={`text-xs font-semibold tabular-nums
              ${draft.tipus === "ingres" ? "text-emerald-600 dark:text-emerald-400" : "text-[#f43f5e]"}`}>
              {draft.tipus === "despesa" || draft.tipus === "transferencia" ? "−" : "+"}
              {formatEuros(draft.import_trs)}
            </span>
          </div>
        </td>

        {/* Expand toggle */}
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => onToggleExpand(index)}
            disabled={draft._excluded}
            title={draft._expanded ? "Tancar detalls" : "Més detalls"}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all mx-auto bg-muted hover:bg-muted-foreground/20 text-muted-foreground disabled:opacity-30"
          >
            {draft._expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </td>
      </tr>

      {/* ── Expanded details row ── */}
      {draft._expanded && !draft._excluded && (
        <tr className={draft._isDuplicate ? "bg-amber-50/30 dark:bg-amber-950/5" : "bg-muted/10"}>
          <td colSpan={2} />
          <td colSpan={6} className="px-4 pb-4 pt-3">
            <div className="space-y-4">

              {/* Secondary fields: event tag + liquidació + notes + recurrent */}
              <div className="grid grid-cols-4 gap-3">

                {/* Event tag — only if event selected */}
                {hasEvent ? (
                  <div ref={tagRef} className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Etiqueta</p>
                    <Select
                      value={draft.event_tag_id || "none"}
                      onValueChange={(v) => onUpdate(index, { event_tag_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg border-border/50">
                        <SelectValue placeholder="Sense etiqueta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sense etiqueta</SelectItem>
                        {tagsForEvent.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tag.color }} />
                              {tag.nom}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div />
                )}

                {/* Liquidació — only for ingrés (return of a debt from a person) */}
                {draft.tipus === "ingres" ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Liquidació</p>
                    <Select
                      value={draft.liquidacio_persona_id || "none"}
                      onValueChange={(v) => onUpdate(index, { liquidacio_persona_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg border-border/50">
                        <SelectValue placeholder="Cap persona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Cap</SelectItem>
                        {people.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div />
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <Input
                    value={draft.notes}
                    onChange={(e) => onUpdate(index, { notes: e.target.value })}
                    placeholder="Afegeix una nota..."
                    className="h-8 text-xs rounded-lg border-border/50"
                  />
                </div>

                {/* Recurrent */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recurrent</p>
                  <button
                    onClick={() => onUpdate(index, { recurrent: !draft.recurrent })}
                    className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium border transition-colors w-full
                      ${draft.recurrent
                        ? "bg-[#3b82f6]/10 border-[#3b82f6]/40 text-[#3b82f6]"
                        : "bg-background border-border/50 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${draft.recurrent ? "text-[#3b82f6]" : "text-muted-foreground/40"}`} />
                    {draft.recurrent ? "Sí" : "No"}
                  </button>
                </div>
              </div>

              {/* Splits section — only for despesa, highlighted when focus=splits */}
              {draft.tipus === "despesa" && (
                <div
                  ref={splitsRef}
                  className="rounded-xl border border-border/50 overflow-hidden"
                >
                  {/* Section header */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Users className={`w-3.5 h-3.5 ${hasSplits ? "text-[#f43f5e]" : "text-muted-foreground"}`} />
                      <p className="text-xs font-semibold text-muted-foreground">Dividir despesa</p>
                      {hasSplits && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                          ${splitBalanced
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
                          }`}>
                          {formatEuros(splitTotal)} / {formatEuros(draft.import_trs)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={addSplit}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#f43f5e] hover:text-[#e11d48] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Afegir persona
                    </button>
                  </div>

                  {/* Split rows */}
                  {hasSplits ? (
                    safeSplits.map((split, si) => (
                      <div key={si} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/30 last:border-0 bg-background/60">
                        <Select
                          value={split.persona_id || "none"}
                          onValueChange={(v) => updateSplit(si, { persona_id: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="h-7 text-xs rounded-lg border-border/50 flex-1">
                            <SelectValue placeholder="Selecciona persona..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Selecciona —</SelectItem>
                            {people.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-muted-foreground font-medium">€</span>
                          <input
                            type="number"
                            value={split.import_degut || ""}
                            onChange={(e) => updateSplit(si, { import_degut: parseFloat(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="w-24 h-7 text-xs rounded-lg border border-border/50 bg-transparent px-2 focus:outline-none focus:border-[#3b82f6]/50 tabular-nums"
                          />
                        </div>

                        {safeSplits.length === 1 && (
                          <button
                            onClick={() => updateSplit(si, { import_degut: parseFloat((draft.import_trs / 2).toFixed(2)) })}
                            title="Assignar meitat"
                            className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border/40 hover:bg-muted transition-colors shrink-0"
                          >
                            ½
                          </button>
                        )}

                        <button
                          onClick={() => removeSplit(si)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-100 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground/50 bg-background/40">
                      Cap persona afegida — fes clic a «Afegir persona» per dividir aquesta despesa
                    </div>
                  )}
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  )
}