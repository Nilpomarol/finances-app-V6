import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCheck } from "lucide-react"
import { Section, FieldLabel } from "./shared/FormPrimitives"

interface PagatPerAltriSectionProps {
  people: { id: string; nom: string }[]
}

export function PagatPerAltriSection({ people }: PagatPerAltriSectionProps) {
  const form = useFormContext()

  return (
    <Section>
      <div className="flex items-center gap-2 mb-0.5">
        <UserCheck className="w-3.5 h-3.5 text-violet-500" />
        <FieldLabel>Pagat per algú altre</FieldLabel>
      </div>
      <FormField control={form.control} name="pagat_per_id" render={({ field }) => (
        <FormItem className="space-y-0">
          <Select onValueChange={field.onChange} value={field.value || "none"}>
            <FormControl>
              <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus:ring-0">
                <SelectValue placeholder="Selecciona qui ha pagat..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">Ho he pagat jo</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormItem>
      )} />
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        No afectarà el saldo del teu compte. Quedarà com a deute teu envers aquesta persona.
      </p>
    </Section>
  )
}
