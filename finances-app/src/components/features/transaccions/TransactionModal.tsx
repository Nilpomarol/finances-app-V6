import { useEffect, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

import { createTransaction, updateTransaction, getTransactionSplits } from "@/lib/db/queries/transactions"
import { getEventTags } from "@/lib/db/queries/event-tags"
import { useAuthStore } from "@/store/authStore"
import { useToast } from "@/hooks/use-toast"
import { now } from "@/lib/utils"

import { TipusToggle } from "./shared/TipusToggle"
import { CoreSection } from "./CoreSection"
import { AccountSection } from "./AccountSection"
import { SplitSection } from "./SplitSection"
import { LiquidacioSection } from "./LiquidacioSection"
import { AdvancedSection } from "./AdvancedSection"
import { TIPUS_CONFIG } from "./shared/tipusConfig"

import type { EventTag, TransactionWithRelations } from "@/types/database"
import type { TransactionData } from "@/lib/db/queries/transactions"

// ── Zod schema ────────────────────────────────────────────────────────────────
const formSchema = z.object({
  tipus: z.enum(["ingres", "despesa", "transferencia"]),
  concepte: z.string().min(2, "El concepte ha de tenir almenys 2 caràcters"),
  import_trs: z.coerce.number().positive("L'import ha de ser superior a 0"),
  data: z.coerce.number(),
  compte_id: z.string().optional().default(""),
  compte_desti_id: z.string().optional(),
  categoria_id: z.string().optional(),
  esdeveniment_id: z.string().optional().nullable(),
  event_tag_id: z.string().optional().nullable(),
  notes: z.string().optional(),
  recurrent: z.boolean().default(false),
  deutes: z.array(z.object({
    persona_id: z.string().min(1, "Selecciona una persona"),
    import_degut: z.coerce.number().positive("L'import ha de ser superior a 0"),
  })).optional().default([]),
  liquidacio_persona_id: z.string().optional().nullable(),
  pagat_per_id: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  const pagatPerAltri = data.pagat_per_id && data.pagat_per_id !== "none"
  if (!pagatPerAltri && !data.compte_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Has de seleccionar un compte", path: ["compte_id"] })
  }
  if (data.tipus === "transferencia") {
    if (!data.compte_desti_id)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El compte destí és obligatori", path: ["compte_desti_id"] })
    if (data.compte_id === data.compte_desti_id)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Els comptes no poden ser iguals", path: ["compte_desti_id"] })
  } else if (!data.categoria_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Has de seleccionar una categoria", path: ["categoria_id"] })
  }
  if (data.tipus === "despesa" && data.deutes && data.deutes.length > 0) {
    const totalDeutes = data.deutes.reduce((sum, d) => sum + d.import_degut, 0)
    if (totalDeutes > data.import_trs)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Els deutes no poden superar el cost total", path: ["import_trs"] })
  }
})

export type TransactionFormValues = z.infer<typeof formSchema>

const defaultValues: TransactionFormValues = {
  tipus: "despesa",
  concepte: "",
  import_trs: 0,
  data: now(),
  compte_id: "",
  compte_desti_id: "",
  categoria_id: "",
  esdeveniment_id: null,
  event_tag_id: null,
  notes: "",
  recurrent: false,
  deutes: [],
  liquidacio_persona_id: null,
  pagat_per_id: null,
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transactionToEdit?: TransactionWithRelations
  accounts: { id: string; nom: string; color?: string }[]
  categories: { id: string; nom: string; tipus: string }[]
  people?: { id: string; nom: string }[]
  events?: { id: string; nom: string; tipus: string }[]
  onSuccess?: () => void
  defaultEventId?: string | null
  defaultDate?: number
  initialValues?: Partial<TransactionFormValues>
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TransactionModal({
  isOpen, onClose, transactionToEdit, accounts, categories, people = [], events = [], onSuccess,
  defaultEventId, defaultDate, initialValues,
}: TransactionModalProps) {
  const { toast } = useToast()
  const user_id = useAuthStore((state) => state.userId)
  const [availableTags, setAvailableTags] = useState<EventTag[]>([])
  const [isLoadingSplits, setIsLoadingSplits] = useState(false)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema) as Resolver<TransactionFormValues>,
    defaultValues,
  })

  const currentTipus = form.watch("tipus")
  const currentImport = Number(form.watch("import_trs") ?? 0)
  const currentEventId = form.watch("esdeveniment_id")
  const currentPagatPerId = form.watch("pagat_per_id")

  // When "pagat per altri" is selected and no account is set, auto-pick the first one
  // (won't affect balances, but compte_id is required by the DB)
  useEffect(() => {
    if (currentPagatPerId && currentPagatPerId !== "none" && !form.getValues("compte_id") && accounts.length > 0) {
      form.setValue("compte_id", accounts[0].id)
    }
  }, [currentPagatPerId, accounts, form])
  useEffect(() => {
    async function loadTags() {
      if (!currentEventId || currentEventId === "none" || !user_id) {
        setAvailableTags((prev) => (prev.length === 0 ? prev : []))
        return
      }
      const selectedEvent = events.find((e) => e.id === currentEventId)
      if (selectedEvent) setAvailableTags(await getEventTags(user_id, selectedEvent.tipus))
    }
    loadTags()
  }, [currentEventId, events, user_id])

  // Reset event tag when event is cleared
  useEffect(() => {
    if (!currentEventId || currentEventId === "none") {
      if (form.getValues("event_tag_id") !== null) form.setValue("event_tag_id", null)
    }
  }, [currentEventId, form])

  // Populate form when editing
  useEffect(() => {
    if (transactionToEdit && isOpen) {
      form.reset({
        tipus: transactionToEdit.tipus,
        concepte: transactionToEdit.concepte,
        import_trs: transactionToEdit.import_trs,
        data: transactionToEdit.data,
        compte_id: transactionToEdit.compte_id ?? undefined,
        compte_desti_id: transactionToEdit.compte_desti_id || "",
        categoria_id: transactionToEdit.categoria_id || "",
        esdeveniment_id: transactionToEdit.esdeveniment_id || null,
        event_tag_id: transactionToEdit.event_tag_id || null,
        notes: transactionToEdit.notes || "",
        recurrent: Boolean(transactionToEdit.recurrent),
        deutes: [],
        liquidacio_persona_id: transactionToEdit.liquidacio_persona_id || null,
        pagat_per_id: transactionToEdit.pagat_per_id || null,
      })
      if (transactionToEdit.tipus === "despesa") {
        setIsLoadingSplits(true)
        getTransactionSplits(transactionToEdit.id).then((splits) => {
          if (splits.length > 0)
            form.setValue("deutes", splits.map((s) => ({ persona_id: s.persona_id, import_degut: s.import_degut })))
          setIsLoadingSplits(false)
        })
      }
    } else if (isOpen) {
      form.reset({
        ...defaultValues,
        data: defaultDate ?? now(),
        esdeveniment_id: defaultEventId ?? null,
        ...initialValues,
      })
      setAvailableTags([])
    }
  }, [transactionToEdit, isOpen, form])

  const onSubmit = async (values: TransactionFormValues) => {
    if (!user_id) return
    try {
      const pagatPerAltri = values.tipus === "despesa" && !!values.pagat_per_id && values.pagat_per_id !== "none"
      const finalValues: TransactionData = {
        concepte: values.concepte,
        data: values.data,
        import_trs: values.import_trs,
        tipus: values.tipus,
        compte_id: pagatPerAltri ? null : (values.compte_id || null),
        compte_desti_id: values.tipus === "transferencia" ? values.compte_desti_id || null : null,
        categoria_id: values.tipus === "transferencia" ? null : values.categoria_id || null,
        esdeveniment_id: values.esdeveniment_id === "none" ? null : values.esdeveniment_id ?? null,
        event_tag_id: values.event_tag_id === "none" ? null : values.event_tag_id ?? null,
        liquidacio_persona_id: values.liquidacio_persona_id === "none" ? null : values.liquidacio_persona_id,
        pagat_per_id: values.tipus === "despesa" ? (values.pagat_per_id === "none" ? null : values.pagat_per_id ?? null) : null,
        recurrent: values.recurrent ?? false,
        notes: values.notes ?? null,
        deutes: values.deutes ?? [],
      }
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, user_id, finalValues)
        toast({ title: "Transacció actualitzada" })
      } else {
        await createTransaction(user_id, finalValues)
        toast({ title: "Transacció creada" })
      }
      onSuccess?.()
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Error en desar" })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[440px] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl [&>button:last-of-type]:hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* ── Sticky header ── */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center justify-between mb-3">
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {transactionToEdit ? "Editar Moviment" : "Nou Moviment"}
                </DialogTitle>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Tancar"
                >
                  <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <FormField control={form.control} name="tipus" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TipusToggle value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            {/* ── Body ── */}
            <div className="px-6 py-5 space-y-3.5">
              <CoreSection />
              <AccountSection
                accounts={accounts}
                categories={categories}
                currentTipus={currentTipus}
                pagatPerId={currentPagatPerId}
              />
              {currentTipus === "despesa" && people.length > 0 && !isLoadingSplits && (
                <SplitSection people={people} currentImport={currentImport} />
              )}
              {currentTipus === "ingres" && people.length > 0 && (
                <LiquidacioSection people={people} />
              )}
              {currentTipus !== "transferencia" && (
                <AdvancedSection
                  events={events}
                  availableTags={availableTags}
                  currentEventId={currentEventId}
                  defaultOpen={!!defaultEventId}
                  people={people}
                  currentTipus={currentTipus}
                />
              )}

              <Button
                type="submit"
                className={cn("w-full h-11 font-semibold rounded-xl mt-2 transition-all", TIPUS_CONFIG[currentTipus].submitBg)}
              >
                {transactionToEdit ? "Guardar Canvis" : "Crear Transacció"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}