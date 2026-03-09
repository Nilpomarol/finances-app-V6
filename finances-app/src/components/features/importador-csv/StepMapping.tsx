import { FileText, ArrowDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { StepMappingProps, ColumnMapping } from "./types"

const APP_FIELDS = [
  { value: "data",      label: "📅 Data"     },
  { value: "concepte",  label: "📝 Concepte" },
  { value: "import",    label: "💶 Import"   },
  { value: "_ignore",   label: "— Ignorar"   },
]

// Which app field is mapped to this CSV column (if any)
function getMappedField(header: string, mapping: ColumnMapping): string {
  if (mapping.data === header)     return "data"
  if (mapping.concepte === header) return "concepte"
  if (mapping.import === header)   return "import"
  return "_ignore"
}

function setMappedField(
  header: string,
  newField: string,
  mapping: ColumnMapping,
  setMapping: (m: ColumnMapping) => void
) {
  // Clear whichever key previously held this app field
  const cleared = { ...mapping }
  if (cleared.data     === header) cleared.data     = ""
  if (cleared.concepte === header) cleared.concepte = ""
  if (cleared.import   === header) cleared.import   = ""

  // Also clear if this app field was already assigned to another column
  if (newField === "data"     && cleared.data     ) cleared.data     = ""
  if (newField === "concepte" && cleared.concepte ) cleared.concepte = ""
  if (newField === "import"   && cleared.import   ) cleared.import   = ""

  if (newField !== "_ignore") {
    (cleared as any)[newField] = header
  }
  setMapping(cleared)
}

export default function StepMapping({
  headers,
  firstRow,
  mapping,
  setMapping,
  selectedAccount,
  setSelectedAccount,
  accounts,
  rawDataLength,
  fileName,
  isProcessing,
  onProcess,
}: StepMappingProps) {
  const allMapped = !!mapping.data && !!mapping.concepte && !!mapping.import && !!selectedAccount

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* File info pill */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {fileName || "Fitxer carregat"}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">
            {rawDataLength} files detectades
          </p>
        </div>
      </div>

      {/* CSV preview + mapping */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vista prèvia — assigna cada columna
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Primera fila del teu CSV. Indica quina columna correspon a cada camp.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-0 min-w-max p-4 pb-5">
            {headers.map((header) => {
              const currentField = getMappedField(header, mapping)
              const isMapped     = currentField !== "_ignore"
              const cellValue    = String(firstRow[header] ?? "—")

              return (
                <div
                  key={header}
                  className={`flex flex-col items-stretch min-w-[160px] max-w-[200px] mx-1.5 rounded-xl border transition-all
                    ${isMapped
                      ? "border-[#3b82f6]/40 bg-[#3b82f6]/5 shadow-sm"
                      : "border-border/40 bg-muted/20 opacity-60"
                    }`}
                >
                  {/* Dropdown */}
                  <div className="px-3 pt-3 pb-2">
                    <Select
                      value={currentField}
                      onValueChange={(v) => setMappedField(header, v, mapping, setMapping)}
                    >
                      <SelectTrigger
                        className={`h-8 text-xs rounded-lg font-medium
                          ${isMapped
                            ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]"
                            : "border-border/50 text-muted-foreground"
                          }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center py-1">
                    <ArrowDown className={`w-3.5 h-3.5 ${isMapped ? "text-[#3b82f6]/60" : "text-muted-foreground/30"}`} />
                  </div>

                  {/* CSV header label */}
                  <div className="px-3 pb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                      {header}
                    </p>
                  </div>

                  {/* Sample cell value */}
                  <div className={`mx-3 mb-3 px-2.5 py-2 rounded-lg text-xs font-mono truncate
                    ${isMapped
                      ? "bg-background border border-[#3b82f6]/20 text-foreground"
                      : "bg-muted/40 border border-border/30 text-muted-foreground"
                    }`}
                    title={cellValue}
                  >
                    {cellValue}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Required fields status */}
        <div className="px-4 py-3 border-t bg-muted/20 flex items-center gap-3 flex-wrap">
          {(["data", "concepte", "import"] as const).map((field) => {
            const mapped = !!mapping[field]
            const labels = { data: "Data", concepte: "Concepte", import: "Import" }
            return (
              <div key={field} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
                ${mapped ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                         : "bg-muted text-muted-foreground"}`}>
                <span>{mapped ? "✓" : "○"}</span>
                <span>{labels[field]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Account selection */}
      <div className="rounded-2xl border bg-card p-4 space-y-2.5">
        <div>
          <p className="text-sm font-semibold">Compte bancari d'origen</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A quin compte s'apliquen aquestes transaccions?
          </p>
        </div>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="h-10 rounded-xl border-[#f43f5e]/40 focus:ring-[#f43f5e]/20">
            <SelectValue placeholder="Selecciona el compte..." />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        onClick={onProcess}
        disabled={isProcessing || !allMapped}
        className="w-full h-11 rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-md shadow-[#f43f5e]/20"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processant i detectant duplicats...
          </span>
        ) : "Processar Dades →"}
      </button>
    </div>
  )
}