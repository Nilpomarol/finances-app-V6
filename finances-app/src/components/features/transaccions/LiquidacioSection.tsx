import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users } from "lucide-react"
import { Section, FieldLabel } from "./shared/FormPrimitives"

interface LiquidacioSectionProps {
  people: { id: string; nom: string }[]
}

export function LiquidacioSection({ people }: LiquidacioSectionProps) {
  const form = useFormContext()

  return (
    <Section>
      <div className="flex items-center gap-2 mb-0.5">
        <Users className="w-3.5 h-3.5 text-emerald-500" />
        <FieldLabel>Retorn de deute</FieldLabel>
      </div>
      <FormField control={form.control} name="liquidacio_persona_id" render={({ field }) => (
        <FormItem className="space-y-0">
          <Select onValueChange={field.onChange} value={field.value || "none"}>
            <FormControl>
              <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus:ring-0">
                <SelectValue placeholder="Selecciona qui et torna els diners..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">No és una liquidació</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        Restarà l'import del saldo que aquesta persona et deu.
      </p>
    </Section>
  )
}