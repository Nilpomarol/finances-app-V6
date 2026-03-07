import { useEffect, useState } from "react"
import { useForm, useFieldArray, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"

import { createTransaction, updateTransaction, getTransactionSplits } from "@/lib/db/queries/transactions"
import { getEventTags } from "@/lib/db/queries/event-tags" // NOU: Importem la query de tags
import { useAuthStore } from "@/store/authStore"
import { now } from "@/lib/utils"
import type { EventTag, TransactionWithRelations } from "@/types/database"
import type { TransactionData } from "@/lib/db/queries/transactions"

// 1. Esquema de validació actualitzat incloent esdeveniment_id i event_tag_id
const formSchema = z.object({
  tipus: z.enum(['ingres', 'despesa', 'transferencia']),
  concepte: z.string().min(2, "El concepte ha de tenir almenys 2 caràcters"),
  import_trs: z.coerce.number().positive("L'import ha de ser superior a 0"),
  data: z.coerce.number(),
  compte_id: z.string().min(1, "Has de seleccionar un compte"),
  compte_desti_id: z.string().optional(),
  categoria_id: z.string().optional(),
  esdeveniment_id: z.string().optional().nullable(),
  event_tag_id: z.string().optional().nullable(), // NOU: Camp per a l'etiqueta
  notes: z.string().optional(),
  recurrent: z.boolean().default(false),
  deutes: z.array(z.object({
    persona_id: z.string().min(1, "Selecciona una persona"),
    import_degut: z.coerce.number().positive("L'import ha de ser superior a 0")
  })).optional().default([]),
  liquidacio_persona_id: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.tipus === 'transferencia') {
    if (!data.compte_desti_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El compte destí és obligatori", path: ["compte_desti_id"] });
    }
    if (data.compte_id === data.compte_desti_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Els comptes no poden ser iguals", path: ["compte_desti_id"] });
    }
  } else if (!data.categoria_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Has de seleccionar una categoria", path: ["categoria_id"] });
  }

  if (data.tipus === 'despesa' && data.deutes && data.deutes.length > 0) {
    const totalDeutes = data.deutes.reduce((sum, d) => sum + d.import_degut, 0)
    if (totalDeutes > data.import_trs) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Els deutes no poden superar el cost total", path: ["import_trs"] });
    }
  }
});

type TransactionFormValues = {
  tipus: "ingres" | "despesa" | "transferencia"
  concepte: string
  import_trs: number
  data: number
  compte_id: string
  compte_desti_id?: string
  categoria_id?: string
  esdeveniment_id?: string | null
  event_tag_id?: string | null
  notes?: string
  recurrent: boolean
  deutes: { persona_id: string; import_degut: number }[]
  liquidacio_persona_id?: string | null
}

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
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: TransactionWithRelations;
  accounts: { id: string, nom: string }[];
  categories: { id: string, nom: string, tipus: string }[];
  people?: { id: string, nom: string }[]; 
  events?: { id: string, nom: string, tipus: string }[]; // NOU: Afegit 'tipus' a events
  onSuccess?: () => void;
}

export default function TransactionModal({ 
  isOpen, onClose, transactionToEdit, accounts, categories, people = [], events = [], onSuccess 
}: TransactionModalProps) {
  
  const { toast } = useToast()
  const user_id = useAuthStore(state => state.userId)
  const [isLoadingSplits, setIsLoadingSplits] = useState(false)
  
  // NOU: Estat per guardar les etiquetes de l'esdeveniment seleccionat
  const [availableTags, setAvailableTags] = useState<EventTag[]>([])

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema) as Resolver<TransactionFormValues>,
    defaultValues,
  })

  const { fields: deutesFields, append: addDeute, remove: removeDeute } = useFieldArray({
    control: form.control,
    name: "deutes"
  })

  const currentTipus = form.watch("tipus")
  const currentImport = Number(form.watch("import_trs") ?? 0)
  const currentEventId = form.watch("esdeveniment_id") // NOU: Vigilem quin event està seleccionat

  // NOU: Efecte per carregar els tags quan canvia l'esdeveniment
  useEffect(() => {
    async function loadTags() {
      if (!currentEventId || currentEventId === "none" || !user_id) {
        // SOLUCIÓ: Només actualitzem l'estat si no està ja buit. 
        // Això evita el bucle infinit quan events = [] genera nous renders.
        setAvailableTags(prev => prev.length === 0 ? prev : [])
        return
      }

      const selectedEvent = events.find(e => e.id === currentEventId)
      if (selectedEvent) {
        // Carreguem només els tags que pertanyen al tipus d'aquest esdeveniment
        const tags = await getEventTags(user_id, selectedEvent.tipus)
        setAvailableTags(tags)
      }
    }
    loadTags()
  }, [currentEventId, events, user_id])

  // Quan l'event canvia (si es treu manualment), resetejem l'etiqueta
  useEffect(() => {
    if (!currentEventId || currentEventId === "none") {
      // SOLUCIÓ: Només canviem el valor si no és null per evitar renders innecessaris de React Hook Form
      if (form.getValues("event_tag_id") !== null) {
        form.setValue("event_tag_id", null)
      }
    }
  }, [currentEventId, form])

  useEffect(() => {
    if (transactionToEdit && isOpen) {
      form.reset({
        tipus: transactionToEdit.tipus, concepte: transactionToEdit.concepte,
        import_trs: transactionToEdit.import_trs, data: transactionToEdit.data,
        compte_id: transactionToEdit.compte_id, compte_desti_id: transactionToEdit.compte_desti_id || '',
        categoria_id: transactionToEdit.categoria_id || '', 
        esdeveniment_id: transactionToEdit.esdeveniment_id || null,
        event_tag_id: transactionToEdit.event_tag_id || null, // Carreguem l'etiqueta
        notes: transactionToEdit.notes || '',
        recurrent: transactionToEdit.recurrent, deutes: [],
        liquidacio_persona_id: transactionToEdit.liquidacio_persona_id || null
      })
      
      if (transactionToEdit.tipus === 'despesa') {
        setIsLoadingSplits(true)
        getTransactionSplits(transactionToEdit.id).then(splits => {
          if (splits.length > 0) {
            form.setValue("deutes", splits.map(s => ({
              persona_id: s.persona_id,
              import_degut: s.import_degut
            })))
          }
          setIsLoadingSplits(false)
        })
      }
    } else if (isOpen) {
      form.reset({ ...defaultValues, data: now() })
      setAvailableTags([]) // Resetejem tags al crear un de nou
    }
  }, [transactionToEdit, isOpen, form])

  const onSubmit = async (values: TransactionFormValues) => {
    if (!user_id) return;
    try {
      // Ajustem valors opcionals i sentinelles de UI abans de desar.
      const finalValues: TransactionData = {
        concepte: values.concepte,
        data: values.data,
        import_trs: values.import_trs,
        tipus: values.tipus,
        compte_id: values.compte_id,
        compte_desti_id:
          values.tipus === "transferencia"
            ? values.compte_desti_id || null
            : null,
        categoria_id:
          values.tipus === "transferencia"
            ? null
            : values.categoria_id || null,
        esdeveniment_id:
          values.esdeveniment_id === "none" ? null : values.esdeveniment_id ?? null,
        event_tag_id:
          values.event_tag_id === "none" ? null : values.event_tag_id ?? null,
        liquidacio_persona_id: values.liquidacio_persona_id === "none" ? null : values.liquidacio_persona_id,
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
    } catch (error) {
      toast({ variant: "destructive", title: "Error en desar" })
    }
  }

  const filteredCategories = (categories || []).filter(c => 
    currentTipus === 'transferencia' ? true : c.tipus === currentTipus
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transactionToEdit ? "Editar Moviment" : "Nou Moviment"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField control={form.control} name="tipus" render={({ field }) => (
              <FormItem><FormLabel>Tipus de Moviment</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="ingres">Ingrés</SelectItem>
                    <SelectItem value="transferencia">Transferència</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="concepte" render={({ field }) => (
              <FormItem><FormLabel>Concepte</FormLabel>
                <FormControl><Input placeholder="Ex: Supermercat, Sopar..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-4">
              <FormField control={form.control} name="import_trs" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>Import (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="compte_id" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>{currentTipus === 'transferencia' ? 'Origen' : 'Compte'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(accounts || []).map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {currentTipus === 'transferencia' && (
              <FormField control={form.control} name="compte_desti_id" render={({ field }) => (
                <FormItem><FormLabel>Compte Destí</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Compte destí..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(accounts || []).map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {currentTipus !== 'transferencia' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="categoria_id" render={({ field }) => (
                    <FormItem><FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Classifica..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(filteredCategories || []).map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Selecció d'esdeveniment (Fase 3) */}
                  <FormField control={form.control} name="esdeveniment_id" render={({ field }) => (
                    <FormItem><FormLabel>Esdeveniment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Cap esdeveniment</SelectItem>
                          {(events || []).map(event => <SelectItem key={event.id} value={event.id}>{event.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* NOU: Selector d'etiquetes (Només es mostra si hi ha un event actiu) */}
                {currentEventId && currentEventId !== "none" && (
                  <FormField control={form.control} name="event_tag_id" render={({ field }) => (
                    <FormItem><FormLabel>Etiqueta (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sense etiqueta..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sense etiqueta</SelectItem>
                          {availableTags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                {tag.nom}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
              </>
            )}

            {/* SECCIÓ DIVIDIR DESPESA (Fase 2) */}
            {currentTipus === 'despesa' && people.length > 0 && !isLoadingSplits && (
              <div className="space-y-3 pt-3 mt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Han de pagar una part?</p>
                  <Button 
                    type="button" variant="outline" size="sm" 
                    onClick={() => {
                      const autoImport = deutesFields.length === 0 ? Number((currentImport / 2).toFixed(2)) : 0
                      addDeute({ persona_id: "", import_degut: autoImport })
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Dividir
                  </Button>
                </div>

                {deutesFields.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-end bg-muted/40 p-2 rounded-md">
                    <FormField control={form.control} name={`deutes.${index}.persona_id`} render={({ field }) => (
                      <FormItem className="flex-1"><FormLabel className="text-xs">Qui et deu?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Contacte" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {people.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name={`deutes.${index}.import_degut`} render={({ field }) => (
                      <FormItem className="w-24"><FormLabel className="text-xs">Import</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-9"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                    
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeDeute(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {deutesFields.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    La teva part real: <span className="font-semibold">
                      {(currentImport - deutesFields.reduce((acc, curr) => acc + (Number(curr.import_degut) || 0), 0)).toFixed(2)}€
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* SECCIÓ LIQUIDACIÓ DE DEUTE (Settle Up - Fase 2) */}
            {currentTipus === 'ingres' && people.length > 0 && (
              <FormField control={form.control} name="liquidacio_persona_id" render={({ field }) => (
                <FormItem className="bg-green-50/50 p-3 rounded-lg border border-green-100 mt-4">
                  <FormLabel className="text-green-800 font-semibold">És un retorn de deute?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecciona qui et torna els diners..." /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No és una liquidació</SelectItem>
                      {people.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-green-700 mt-1">
                    Això restarà l'import del saldo que aquesta persona et deu.
                  </p>
                </FormItem>
              )} />
            )}

            <Button type="submit" className="w-full mt-6">
              {transactionToEdit ? "Guardar Canvis" : "Crear Transacció"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}