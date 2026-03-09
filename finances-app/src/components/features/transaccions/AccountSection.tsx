import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Section, FieldLabel } from "./shared/FormPrimitives"

interface AccountSectionProps {
  accounts: { id: string; nom: string; color?: string }[]
  categories: { id: string; nom: string; tipus: string }[]
  currentTipus: "ingres" | "despesa" | "transferencia"
}

const selectTriggerClass =
  "border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus:ring-0 [&>svg]:ml-1"

export function AccountSection({ accounts, categories, currentTipus }: AccountSectionProps) {
  const form = useFormContext()

  const filteredCategories = categories.filter((c) =>
    currentTipus === "transferencia" ? true : c.tipus === currentTipus
  )

  if (currentTipus === "transferencia") {
    return (
      <Section>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="compte_id" render={({ field }) => (
            <FormItem className="space-y-1">
              <FieldLabel>Origen</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Compte..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="compte_desti_id" render={({ field }) => (
            <FormItem className="space-y-1">
              <FieldLabel>Destí</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Compte..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </Section>
    )
  }

  return (
    <Section>
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="compte_id" render={({ field }) => (
          <FormItem className="space-y-1">
            <FieldLabel>Compte</FieldLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="categoria_id" render={({ field }) => (
          <FormItem className="space-y-1">
            <FieldLabel>Categoria</FieldLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Classifica..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {filteredCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </Section>
  )
}