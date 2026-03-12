import { useFormContext, useFieldArray } from "react-hook-form"
import { useState, useEffect, useRef } from "react"
import { FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Section, FieldLabel } from "./shared/FormPrimitives"

interface SplitSectionProps {
  people: { id: string; nom: string }[]
  currentImport: number
}

export function SplitSection({ people, currentImport }: SplitSectionProps) {
  const form = useFormContext()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "deutes" })
  const [amountStrs, setAmountStrs] = useState<Record<string, string>>({})
  const isEditing = useRef<Record<string, boolean>>({})

  const deuteValues = form.watch("deutes")
  useEffect(() => {
    setAmountStrs(prev => {
      const next = { ...prev }
      fields.forEach((f, i) => {
        if (!isEditing.current[f.id]) {
          const val = deuteValues?.[i]?.import_degut
          next[f.id] = val ? String(val) : ""
        }
      })
      return next
    })
  }, [deuteValues, fields])

  const totalDeutes = fields.reduce((acc, curr) => acc + (Number((curr as any).import_degut) || 0), 0)
  const myPart = currentImport - totalDeutes

  const applyPreset = (mode: "full" | "equal") => {
    if (!fields.length || !currentImport) return
    const perPerson = mode === "full"
      ? currentImport / fields.length
      : currentImport / (fields.length + 1)
    const rounded = Math.round(perPerson * 100) / 100
    const newStrs: Record<string, string> = {}
    fields.forEach((f, i) => {
      isEditing.current[f.id] = false
      newStrs[f.id] = String(rounded)
      form.setValue(`deutes.${i}.import_degut`, rounded)
    })
    setAmountStrs(prev => ({ ...prev, ...newStrs }))
  }

  return (
    <Section>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-amber-500" />
          <FieldLabel>Dividir despesa</FieldLabel>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
          onClick={() => {
            const autoImport = fields.length === 0 ? Number((currentImport / 2).toFixed(2)) : 0
            append({ persona_id: "", import_degut: autoImport })
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Afegir
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("full")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => applyPreset("equal")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Iguals
            </button>
          </div>
          {fields.map((item, index) => {
            const str = amountStrs[item.id] ?? ""
            return (
            <div key={item.id} className="flex gap-2 items-end">
              <FormField control={form.control} name={`deutes.${index}.persona_id`} render={({ field }) => (
                <FormItem className="flex-1 space-y-1">
                  {index === 0 && <FieldLabel>Qui et deu?</FieldLabel>}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Contacte..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name={`deutes.${index}.import_degut`} render={({ field }) => (
                <FormItem className="w-24 space-y-1">
                  {index === 0 && <FieldLabel>Import</FieldLabel>}
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-9 text-sm"
                      value={str}
                      onFocus={() => {
                        isEditing.current[item.id] = true
                        if (!str || str === "0") setAmountStrs(prev => ({ ...prev, [item.id]: "" }))
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(",", ".")
                        if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                          setAmountStrs(prev => ({ ...prev, [item.id]: raw }))
                          const num = parseFloat(raw)
                          field.onChange(isNaN(num) ? 0 : num)
                        }
                      }}
                      onBlur={() => {
                        isEditing.current[item.id] = false
                        const num = parseFloat(str)
                        if (isNaN(num)) {
                          setAmountStrs(prev => ({ ...prev, [item.id]: "" }))
                          field.onChange(0)
                        } else {
                          setAmountStrs(prev => ({ ...prev, [item.id]: String(num) }))
                          field.onChange(num)
                        }
                        field.onBlur()
                      }}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                </FormItem>
              )} />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg shrink-0"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )
          })}

          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400">La teva part real</span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              myPart < 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-200"
            )}>
              {myPart.toFixed(2)}€
            </span>
          </div>
        </div>
      )}
    </Section>
  )
}