import type { AssignmentRule, Transaction } from "@/types/database"

export type CsvRow = Record<string, string | number | null | undefined>

export type DraftSplit = {
  persona_id: string
  import_degut: number
}

export type ImportDraft = {
  _id: string
  concepte: string
  data: number
  import_trs: number
  tipus: Transaction["tipus"]
  categoria_id: string
  esdeveniment_id: string | null
  event_tag_id: string | null
  compte_id: string
  compte_desti_id: string
  notes: string
  recurrent: boolean
  liquidacio_persona_id: string | null
  splits: DraftSplit[]
  _isDuplicate: boolean
  _excluded: boolean
  _expanded: boolean
  _expandedFocus: "splits" | "tag" | null
}

export type ColumnMapping = {
  data: string
  concepte: string
  import: string
}

export interface ImportCsvModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: { id: string; nom: string }[]
  categories: { id: string; nom: string; tipus: string }[]
  events: { id: string; nom: string }[]
  eventTags: { id: string; nom: string; color: string; tipus_esdeveniment: string }[]
  people: { id: string; nom: string }[]
  rules: AssignmentRule[]
}

export interface StepUploadProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export interface StepMappingProps {
  headers: string[]
  firstRow: CsvRow
  mapping: ColumnMapping
  setMapping: (m: ColumnMapping) => void
  selectedAccount: string
  setSelectedAccount: (id: string) => void
  accounts: { id: string; nom: string }[]
  rawDataLength: number
  fileName: string
  isProcessing: boolean
  onProcess: () => void
}

export interface StepReviewProps {
  drafts: ImportDraft[]
  accounts: { id: string; nom: string }[]
  categories: { id: string; nom: string; tipus: string }[]
  events: { id: string; nom: string }[]
  eventTags: { id: string; nom: string; color: string; tipus_esdeveniment: string }[]
  people: { id: string; nom: string }[]
  selectedAccount: string
  isSaving: boolean
  onUpdateDraft: (index: number, updates: Partial<ImportDraft>) => void
  onToggleExclude: (index: number) => void
  onToggleExpand: (index: number, focus?: ImportDraft["_expandedFocus"]) => void
  onBack: () => void
  onSave: () => void
}

export interface ImportStepHeaderProps {
  step: 1 | 2 | 3
}