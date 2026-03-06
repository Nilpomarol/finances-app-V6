import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { createPerson, updatePerson } from "@/lib/db/queries/people"
import type { Person } from "@/types/database"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner" // o useToast segons el que utilitzis

const personSchema = z.object({
  nom: z.string().min(2, "El nom ha de tenir almenys 2 caràcters").max(50),
})

type PersonFormValues = z.infer<typeof personSchema>

interface PersonModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  person?: Person
}

export default function PersonModal({ open, onClose, onSuccess, person }: PersonModalProps) {
  const { userId } = useAuthStore()
  const isEditing = !!person

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: { nom: "" },
  })

  useEffect(() => {
    if (person && open) {
      form.reset({ nom: person.nom })
    } else if (open) {
      form.reset({ nom: "" })
    }
  }, [person, open, form])

  const onSubmit = async (values: PersonFormValues) => {
    if (!userId) return
    try {
      if (isEditing && person) {
        await updatePerson(person.id, userId, values.nom)
        toast.success("Contacte actualitzat")
      } else {
        await createPerson(userId, values.nom)
        toast.success("Contacte afegit correctament")
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Error al guardar la persona")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contacte" : "Nou Contacte"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nom" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Maria, Joan, Pis..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel·lar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Guardar" : "Afegir"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}