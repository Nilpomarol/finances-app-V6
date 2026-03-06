import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/authStore"
import { createEvent } from "@/lib/db/queries/events"
import { useToast } from "@/hooks/use-toast"

const eventSchema = z.object({
  nom: z.string().min(2, "El nom és massa curt"),
  tipus: z.string().min(1, "Selecciona un tipus"),
  data_inici_str: z.string().min(1, "La data d'inici és obligatòria"),
  data_fi_str: z.string().min(1, "La data de fi és obligatòria"),
}).superRefine((data, ctx) => {
  if (new Date(data.data_fi_str) < new Date(data.data_inici_str)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La data de fi no pot ser anterior a la d'inici",
      path: ["data_fi_str"]
    })
  }
})

type EventFormValues = z.infer<typeof eventSchema>

export default function EventModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const { userId } = useAuthStore()
  const { toast } = useToast()
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { 
      nom: "", 
      tipus: "viatge", 
      data_inici_str: new Date().toISOString().split('T')[0],
      data_fi_str: new Date().toISOString().split('T')[0]
    }
  })

  // Reseteja el formulari cada vegada que s'obre el modal
  useEffect(() => {
    if (isOpen) {
      form.reset({
        nom: "", 
        tipus: "viatge", 
        data_inici_str: new Date().toISOString().split('T')[0],
        data_fi_str: new Date().toISOString().split('T')[0]
      })
    }
  }, [isOpen, form])

  const onSubmit = async (values: EventFormValues) => {
    if (!userId) return
    try {
      // Convertim els strings a timestamp numèric per a libSQL
      const data_inici = new Date(values.data_inici_str).getTime()
      const data_fi = new Date(values.data_fi_str).getTime()
      
      await createEvent(userId, { 
        nom: values.nom,
        tipus: values.tipus,
        data_inici,
        data_fi
      })
      
      toast({ title: "Esdeveniment creat correctament" })
      onSuccess()
      onClose()
    } catch (e) { 
      toast({ variant: "destructive", title: "Error al guardar a la base de dades" }) 
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Nou Esdeveniment</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nom" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl><Input placeholder="Ex: Viatge a Roma" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="tipus" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipus</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="viatge">Viatge</SelectItem>
                    <SelectItem value="celebracio">Celebració</SelectItem>
                    <SelectItem value="altre">Altre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
              
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_inici_str" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data inici</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="data_fi_str" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data fi</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full mt-4">Crear Esdeveniment</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}