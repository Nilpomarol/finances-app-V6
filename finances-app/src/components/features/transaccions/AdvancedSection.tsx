import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, RefreshCw, UserCheck } from "lucide-react"
import { ColorDot } from "@/components/shared/ColorDot"
import { cn } from "@/lib/utils"
import { Section, FieldLabel, Divider } from "./shared/FormPrimitives"
import type { EventTag } from "@/types/database"

interface AdvancedSectionProps {
  events: { id: string; nom: string; tipus: string }[]
  availableTags: EventTag[]
  currentEventId: string | null | undefined
  defaultOpen?: boolean
  people?: { id: string; nom: string }[]
  currentTipus?: "ingres" | "despesa" | "transferencia"
}

export function AdvancedSection({ events, availableTags, currentEventId, defaultOpen = false, people = [], currentTipus }: AdvancedSectionProps) {
  const form = useFormContext()
  const [showAdvanced, setShowAdvanced] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full py-1"
      >
        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showAdvanced ? "Amagar opcions addicionals" : "Mostrar opcions addicionals"}
      </button>

      {showAdvanced && (
        <Section className="mt-2">
          {/* Esdeveniment + etiqueta */}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="esdeveniment_id" render={({ field }) => (
              <FormItem className="space-y-1">
                <FieldLabel>Esdeveniment</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus:ring-0 [&>svg]:ml-1">
                      <SelectValue placeholder="Cap..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Cap</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>{event.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {currentEventId && currentEventId !== "none" && (
              <FormField control={form.control} name="event_tag_id" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FieldLabel>Etiqueta</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus:ring-0 [&>svg]:ml-1">
                        <SelectValue placeholder="Sense..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sense etiqueta</SelectItem>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <ColorDot color={tag.color} />
                            {tag.nom}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}
          </div>

          <Divider />

          {/* Notes */}
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="space-y-1">
              <FieldLabel>Notes</FieldLabel>
              <FormControl>
                <textarea
                  rows={2}
                  placeholder="Afegeix una nota..."
                  className="w-full resize-none border-0 bg-transparent shadow-none p-0 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )} />

          <Divider />

          {/* Recurrent toggle */}
          <FormField control={form.control} name="recurrent" render={({ field }) => (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subscripció / Recurrent</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  field.value ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200",
                    field.value ? "translate-x-4.5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          )} />

          {/* Pagat per algú altre — only for expenses */}
          {currentTipus === "despesa" && people.length > 0 && (
            <>
              <Divider />
              <FormField control={form.control} name="pagat_per_id" render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-violet-500" />
                    <FieldLabel>Pagat per algú altre</FieldLabel>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus:ring-0 [&>svg]:ml-1">
                        <SelectValue placeholder="Ho he pagat jo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ho he pagat jo</SelectItem>
                      {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    No afectarà el saldo del teu compte. Quedarà com a deute teu.
                  </p>
                </FormItem>
              )} />
            </>
          )}
        </Section>
      )}
    </div>
  )
}