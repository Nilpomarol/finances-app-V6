import { useFormContext, useFieldArray } from "react-hook-form"
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

  const totalDeutes = fields.reduce((acc, curr) => acc + (Number((curr as any).import_degut) || 0), 0)
  const myPart = currentImport - totalDeutes

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
          {fields.map((item, index) => (
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
                      type="number"
                      step="0.01"
                      className="h-9 text-sm"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      onBlur={field.onBlur}
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
          ))}

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