import { useEffect } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { createAccount, updateAccount } from "@/lib/db/queries/accounts"
import type { Account } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const accountSchema = z.object({
  nom: z.string().min(1, "El nom és obligatori").max(50),
  tipus: z.enum(["banc", "estalvi", "efectiu", "inversio"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal invàlid"),
  logo: z.string().max(50).optional().default(""),
  saldo: z.coerce.number(),
})

type AccountFormValues = {
  nom: string
  tipus: "banc" | "estalvi" | "efectiu" | "inversio"
  color: string
  logo: string
  saldo: number
}

const defaultValues: AccountFormValues = {
  nom: "",
  tipus: "banc",
  color: "#6366f1",
  logo: "",
  saldo: 0,
}

const TIPUS_OPTIONS = [
  { value: "banc", label: "Banc" },
  { value: "estalvi", label: "Estalvis" },
  { value: "efectiu", label: "Efectiu" },
  { value: "inversio", label: "Inversió" },
]

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
]

interface AccountModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  account?: Account // si és undefined, és creació
}

export default function AccountModal({
  open,
  onClose,
  onSuccess,
  account,
}: AccountModalProps) {
  const { userId } = useAuthStore()
  const isEditing = !!account

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema) as Resolver<AccountFormValues>,
    defaultValues,
  })

  // Pre-emplena el formulari en mode edició
  useEffect(() => {
    if (account) {
      form.reset({
        nom: account.nom,
        tipus: account.tipus,
        color: account.color,
        logo: account.logo ?? "",
        saldo: account.saldo,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [account, form, open])

  const onSubmit = async (values: AccountFormValues) => {
    if (!userId) return
    try {
      if (isEditing && account) {
        await updateAccount(account.id, userId, values)
        toast.success("Compte actualitzat")
      } else {
        await createAccount(userId, {
          ...values,
          logo: values.logo ?? "",
          saldo: values.saldo,
        })
        toast.success("Compte creat")
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Error al guardar el compte")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar compte" : "Nou compte"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nom */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: La Caixa, Efectiu..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipus */}
            <FormField
              control={form.control}
              name="tipus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipus</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Saldo inicial */}
            <FormField
              control={form.control}
              name="saldo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditing ? "Saldo actual" : "Saldo inicial"}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pr-8"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        €
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className="w-7 h-7 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                field.value === color ? "#000" : "transparent",
                              transform:
                                field.value === color ? "scale(1.2)" : "scale(1)",
                            }}
                          />
                        ))}
                      </div>
                      <Input
                        type="color"
                        className="h-9 w-full cursor-pointer"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel·lar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}