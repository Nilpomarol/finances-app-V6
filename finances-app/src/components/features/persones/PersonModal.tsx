import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { createPerson, updatePerson } from "@/lib/db/queries/people"
import type { Person } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Loader2, X, UserRound } from "lucide-react"
import { toast } from "sonner"

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

  const nomValue = form.watch("nom")

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {nomValue.length >= 1 ? (
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {nomValue.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              ) : (
                <UserRound className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? "Editar contacte" : "Nou contacte"}
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* Nom field */}
            <div className="mx-5 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem className="px-4 pt-3 pb-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Nom
                    </p>
                    <FormControl>
                      <input
                        placeholder="Ex: Maria, Joan, Pis..."
                        className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <div className="px-5 pb-5">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-12 text-base font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Guardar canvis" : "Afegir contacte"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}