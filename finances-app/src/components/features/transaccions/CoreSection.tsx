import { useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Section, FieldLabel, Divider } from "./shared/FormPrimitives"

export function CoreSection() {
  const form = useFormContext()

  const dateValue = form.watch("data")
    ? new Date(form.watch("data")).toISOString().split("T")[0]
    : ""

  return (
    <Section>
      <FormField control={form.control} name="concepte" render={({ field }) => (
        <FormItem className="space-y-1">
          <FieldLabel>Concepte</FieldLabel>
          <FormControl>
            <Input
              placeholder="Ex: Supermercat, Sopar..."
              className="border-0 bg-transparent shadow-none p-0 h-auto text-base font-semibold placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-0"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <Divider />

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="import_trs" render={({ field }) => (
          <FormItem className="space-y-1">
            <FieldLabel>Import</FieldLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">€</span>
                <Input
                  type="number"
                  step="0.01"
                  className="border-0 bg-transparent shadow-none pl-5 pr-0 h-auto text-base font-semibold focus-visible:ring-0"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="data" render={({ field }) => (
          <FormItem className="space-y-1">
            <FieldLabel>Data</FieldLabel>
            <FormControl>
              <Input
                type="date"
                className="border-0 bg-transparent shadow-none p-0 h-auto text-sm font-medium focus-visible:ring-0"
                value={dateValue}
                onChange={(e) => {
                  const d = new Date(e.target.value)
                  field.onChange(isNaN(d.getTime()) ? field.value : d.getTime())
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </Section>
  )
}