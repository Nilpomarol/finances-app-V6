import { useEffect, useState, useRef } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { createAccount, updateAccount } from "@/lib/db/queries/accounts"
import type { Account } from "@/types/database"
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
import { Loader2, Banknote, PiggyBank, Wallet, BarChart3, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  { value: "banc",     label: "Banc",     icon: <Banknote className="w-4 h-4" /> },
  { value: "estalvi",  label: "Estalvis", icon: <PiggyBank className="w-4 h-4" /> },
  { value: "efectiu",  label: "Efectiu",  icon: <Wallet className="w-4 h-4" /> },
  { value: "inversio", label: "Inversió", icon: <BarChart3 className="w-4 h-4" /> },
] as const

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#64748b",
]

const TIPUS_ACTIVE_STYLE: Record<string, { bg: string; text: string }> = {
  banc:     { bg: "bg-blue-500",   text: "text-white" },
  estalvi:  { bg: "bg-green-500",  text: "text-white" },
  efectiu:  { bg: "bg-amber-500",  text: "text-white" },
  inversio: { bg: "bg-purple-500", text: "text-white" },
}

interface AccountModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  account?: Account
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

  const [saldoStr, setSaldoStr] = useState<string>("")
  const isEditingSaldo = useRef(false)

  const formSaldo = form.watch("saldo")
  useEffect(() => {
    if (!isEditingSaldo.current) {
      setSaldoStr(formSaldo ? String(formSaldo) : "")
    }
  }, [formSaldo])

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
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 [&>button]:hidden rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {isEditing ? "Editar compte" : "Nou compte"}
          </DialogTitle>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* Tipus switcher */}
            <FormField
              control={form.control}
              name="tipus"
              render={({ field }) => (
                <div className="px-5 pb-4">
                  <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {TIPUS_OPTIONS.map((opt) => {
                      const active = field.value === opt.value
                      const style = TIPUS_ACTIVE_STYLE[opt.value]
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-semibold transition-all",
                            active
                              ? `${style.bg} ${style.text} shadow-sm`
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          )}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            />

            {/* Form fields */}
            <div className="mx-5 mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/50">

              {/* Nom */}
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
                        placeholder="Ex: La Caixa, Efectiu..."
                        className="w-full bg-transparent text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Saldo */}
              <FormField
                control={form.control}
                name="saldo"
                render={({ field }) => (
                  <FormItem className="px-4 pt-3 pb-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {isEditing ? "Saldo actual" : "Saldo inicial"}
                    </p>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-sm text-slate-400 dark:text-slate-500 font-medium">€</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          className="w-full bg-transparent text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-none"
                          value={saldoStr}
                          onFocus={() => {
                            isEditingSaldo.current = true
                            if (!saldoStr || saldoStr === "0") setSaldoStr("")
                          }}
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".")
                            if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                              setSaldoStr(raw)
                              const num = parseFloat(raw)
                              field.onChange(isNaN(num) ? 0 : num)
                            }
                          }}
                          onBlur={() => {
                            isEditingSaldo.current = false
                            const num = parseFloat(saldoStr)
                            if (isNaN(num)) {
                              setSaldoStr("")
                              field.onChange(0)
                            } else {
                              setSaldoStr(String(num))
                              field.onChange(num)
                            }
                            field.onBlur()
                          }}
                          name={field.name}
                          ref={field.ref}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <div className="mx-5 mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 pt-3 pb-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Color
                  </p>
                  <div className="flex flex-wrap gap-3 items-center">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className="w-8 h-8 rounded-full transition-all focus:outline-none shrink-0"
                        style={{
                          backgroundColor: color,
                          boxShadow: field.value === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
                          transform: field.value === color ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}
                    <label
                      className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors shrink-0 overflow-hidden relative"
                      title="Color personalitzat"
                    >
                      <input
                        type="color"
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-bold pointer-events-none">+</span>
                    </label>
                    <div
                      className="ml-auto w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                      style={{ backgroundColor: field.value }}
                    />
                  </div>
                </div>
              )}
            />

            {/* Submit */}
            <div className="px-5 pb-5">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-12 text-base font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Guardar canvis" : "Crear compte"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}