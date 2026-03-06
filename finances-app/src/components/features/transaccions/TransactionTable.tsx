import { useState } from "react"
import type { Transaction, TransactionWithRelations } from "@/types/database"
import { formatEuros, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import CategoryIcon from "@/components/shared/CategoryIcon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react"

const TIPUS_CONFIG: Record<
  Transaction["tipus"],
  { icon: React.ElementType; className: string; sign: string }
> = {
  ingres: { icon: TrendingUp, className: "text-green-600", sign: "+" },
  despesa: { icon: TrendingDown, className: "text-red-500", sign: "-" },
  transferencia: { icon: ArrowLeftRight, className: "text-blue-500", sign: "" },
}

export interface TransactionTableProps {
  transactions: TransactionWithRelations[]
  isLoading?: boolean
  onEdit?: (tx: TransactionWithRelations) => void
  onDelete?: (tx: TransactionWithRelations) => void
  // Paginació opcional
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  // Columnes opcionals a mostrar
  showAccount?: boolean
  showCategory?: boolean
  showEvent?: boolean
}

const PAGE_SIZE_SKELETON = 5

export default function TransactionTable({
  transactions,
  isLoading = false,
  onEdit,
  onDelete,
  page = 0,
  totalPages = 1,
  onPageChange,
  showAccount = true,
  showCategory = true,
  showEvent = false,
}: TransactionTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepte</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
              {showAccount && <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Compte</th>}
              {showCategory && <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Categoria</th>}
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Import</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PAGE_SIZE_SKELETON }).map((_, i) => (
              <tr key={i} className="border-b last:border-0 animate-pulse">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                    <div className="h-4 bg-muted rounded w-36" />
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="h-4 bg-muted rounded w-20" />
                </td>
                {showAccount && (
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="h-4 bg-muted rounded w-24" />
                  </td>
                )}
                {showCategory && (
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="h-4 bg-muted rounded w-20" />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="h-4 bg-muted rounded w-16 ml-auto" />
                </td>
                <td className="px-4 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ArrowUpDown className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold">Cap transacció trobada</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Prova a canviar els filtres o crea una nova transacció
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Concepte
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Data
                </th>
                {showAccount && (
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Compte
                  </th>
                )}
                {showCategory && (
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Categoria
                  </th>
                )}
                {showEvent && (
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Esdeveniment
                  </th>
                )}
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Import
                </th>
                {(onEdit || onDelete) && <th className="w-20" />}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const { icon: Icon, className, sign } = TIPUS_CONFIG[tx.tipus]

                return (
                  <tr
                    key={tx.id}
                    className="border-b last:border-0 hover:bg-muted/40 transition-colors group"
                  >
                    {/* Concepte + icona */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {tx.categoria_id && tx.categoria_icona ? (
                          <CategoryIcon
                            icona={tx.categoria_icona}
                            color={tx.categoria_color ?? "#6366f1"}
                            size="sm"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Icon className={cn("w-3.5 h-3.5", className)} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">
                            {tx.concepte}
                          </p>
                          {/* En mòbil mostrem data i compte aquí */}
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                            {formatDate(tx.data)}
                            {tx.compte_nom && ` · ${tx.compte_nom}`}
                          </div>
                          {tx.recurrent && (
                            <Badge variant="secondary" className="text-xs mt-0.5">
                              Recurrent
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {formatDate(tx.data)}
                    </td>

                    {/* Compte */}
                    {showAccount && (
                      <td className="px-4 py-3 hidden md:table-cell">
                        {tx.compte_nom ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: tx.compte_color ?? "#6366f1" }}
                            />
                            <span className="text-sm truncate max-w-[120px]">
                              {tx.compte_nom}
                              {tx.tipus === "transferencia" && tx.compte_desti_nom && (
                                <span className="text-muted-foreground">
                                  {" → "}
                                  {tx.compte_desti_nom}
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* Categoria */}
                    {showCategory && (
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {tx.categoria_nom ? (
                          <span className="text-sm">{tx.categoria_nom}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Sense categoria
                          </span>
                        )}
                      </td>
                    )}

                    {/* Esdeveniment */}
                    {showEvent && (
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {tx.esdeveniment_nom ? (
                          <Badge variant="outline" className="text-xs">
                            {tx.esdeveniment_nom}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* Import */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          tx.tipus === "ingres" && "text-green-600",
                          tx.tipus === "despesa" && "text-red-500",
                          tx.tipus === "transferencia" && "text-blue-500"
                        )}
                      >
                        {sign}
                        {formatEuros(tx.import_trs)}
                      </span>
                    </td>

                    {/* Accions */}
                    {(onEdit || onDelete) && (
                      <td className="px-3 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onEdit(tx)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:text-destructive"
                              onClick={() => onDelete(tx)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginació */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Pàgina {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}