import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/authstore"
import { createEventTag } from "@/lib/db/queries/event-tags"
import { useToast } from "@/hooks/use-toast"
import { Tag, Plane, Bed, Utensils, Ticket, Camera, Map, Coffee, ShoppingBag, Car } from "lucide-react"

// Llistat d'icones disponibles per triar
const ICON_OPTIONS = [
  { value: "Tag", label: "Etiqueta", icon: Tag },
  { value: "Plane", label: "Avió", icon: Plane },
  { value: "Car", label: "Cotxe", icon: Car },
  { value: "Bed", label: "Allotjament", icon: Bed },
  { value: "Utensils", label: "Menjar", icon: Utensils },
  { value: "Coffee", label: "Cafè/Beguda", icon: Coffee },
  { value: "Ticket", label: "Tiquet/Activitat", icon: Ticket },
  { value: "Camera", label: "Turisme", icon: Camera },
  { value: "Map", label: "Mapa/Ruta", icon: Map },
  { value: "ShoppingBag", label: "Compres", icon: ShoppingBag },
]

const tagSchema = z.object({
  nom: z.string().min(2, "El nom és massa curt"),
  tipus_esdeveniment: z.string().min(1, "Selecciona un tipus d'esdeveniment"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color invàlid"),
  icona: z.string().min(1, "Selecciona una icona"),
})

type TagFormValues = z.infer<typeof tagSchema>

export default function EventTagModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const { userId } = useAuthStore()
  const { toast } = useToast()
  
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { 
      nom: "", 
      tipus_esdeveniment: "viatge", 
      color: "#3b82f6", // Blau per defecte
      icona: "Tag"
    }
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({ nom: "", tipus_esdeveniment: "viatge", color: "#3b82f6", icona: "Tag" })
    }
  }, [isOpen, form])

  const onSubmit = async (values: TagFormValues) => {
    if (!userId) return
    try {
      await createEventTag(userId, values)
      toast({ title: "Etiqueta creada correctament" })
      onSuccess()
      onClose()
    } catch (e) { 
      toast({ variant: "destructive", title: "Error al crear l'etiqueta" }) 
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Nova Etiqueta (Tag)</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField control={form.control} name="nom" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l'etiqueta</FormLabel>
                <FormControl><Input placeholder="Ex: Transport, Sopars..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="tipus_esdeveniment" render={({ field }) => (
              <FormItem>
                <FormLabel>Per a quin tipus d'esdeveniment?</FormLabel>
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
              <FormField control={form.control} name="icona" render={({ field }) => (
                <FormItem>
                  <FormLabel>Icona</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => {
                        const IconComponent = opt.icon
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4" /> {opt.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                      <Input type="text" className="uppercase font-mono text-sm" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full mt-4">Crear Etiqueta</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}