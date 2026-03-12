import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Anchor, RefreshCw, AlertCircle, TrendingUp, Shuffle } from "lucide-react"
import { formatEuros, formatDate } from "@/lib/utils"
import { ColorDot } from "@/components/shared/ColorDot"
import { useFilterStore } from "@/store/filterStore"
import type { TransactionWithRelations } from "@/types/database"

interface Props {
  transactions: TransactionWithRelations[]
  totalDespeses: number
}

export function RecurrentsTab({ transactions, totalDespeses }: Props) {
  const { periodeMode, yearDisplayMode } = useFilterStore()

  // Number of months with data — used for monthly average in year mode
  const activeMonths = useMemo(() => {
    if (periodeMode !== "any") return 1
    const months = new Set(transactions.map(t => {
      const d = new Date(Number(t.data))
      return `${d.getFullYear()}-${d.getMonth()}`
    }))
    return months.size > 0 ? months.size : 1
  }, [transactions, periodeMode])

  const divisor = periodeMode === "any" && yearDisplayMode === "mitja" ? activeMonths : 1
  const isMitja = divisor > 1

  // ── Fixed-category transactions ─────────────────────────────────────────────
  const fixesDespeses = transactions.filter(
    t => t.categoria_es_fix && t.tipus === "despesa",
  )
  const fixesIngressos = transactions.filter(
    t => t.categoria_es_fix && t.tipus === "ingres",
  )
  const variablesDespeses = transactions.filter(
    t => !t.categoria_es_fix && t.tipus === "despesa",
  )
  const totalFixesDespeses = fixesDespeses.reduce(
    (s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0,
  )
  const totalFixesIngressos = fixesIngressos.reduce(
    (s, t) => s + t.import_trs, 0,
  )
  const totalVariablesDespeses = variablesDespeses.reduce(
    (s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0,
  )
  const pctFix = totalDespeses > 0 ? (totalFixesDespeses / totalDespeses) * 100 : 0
  const pctVariable = totalDespeses > 0 ? (totalVariablesDespeses / totalDespeses) * 100 : 0

  // ── Subscriptions (recurrent flag) ──────────────────────────────────────────
  const subscripcions = transactions.filter(t => t.recurrent && t.tipus === "despesa")
  const totalSubscripcions = subscripcions.reduce(
    (s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0,
  )

  // ── Group helpers ────────────────────────────────────────────────────────────
  function groupByCategory(txs: TransactionWithRelations[]) {
    const map: Record<string, { nom: string; color: string; items: TransactionWithRelations[] }> = {}
    for (const t of txs) {
      const key = t.categoria_nom ?? "Sense categoria"
      if (!map[key]) map[key] = { nom: key, color: t.categoria_color ?? "#ccc", items: [] }
      map[key].items.push(t)
    }
    return Object.values(map).sort((a, b) => {
      const sumA = a.items.reduce((s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0)
      const sumB = b.items.reduce((s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0)
      return sumB - sumA
    })
  }

  const groupsFixesDespeses = groupByCategory(fixesDespeses)
  const groupsVariablesDespeses = groupByCategory(variablesDespeses)
  const groupsSubscripcions = groupByCategory(subscripcions)

  return (
    <div className="space-y-8">
      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Anchor className="w-4 h-4" />
              Despeses Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
              {formatEuros(totalFixesDespeses / divisor)}
              {isMitja && <span className="text-base font-normal ml-1 opacity-60">/mes</span>}
            </div>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
              {fixesDespeses.length} moviment{fixesDespeses.length !== 1 ? "s" : ""} en categories fixes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <TrendingUp className="w-4 h-4" />
              Ingressos Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatEuros(totalFixesIngressos / divisor)}
              {isMitja && <span className="text-base font-normal ml-1 opacity-60">/mes</span>}
            </div>
            <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
              {fixesIngressos.length} moviment{fixesIngressos.length !== 1 ? "s" : ""} en categories fixes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              Pes Despeses Fixes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pctFix.toFixed(1)}%</div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(pctFix, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatEuros(totalFixesDespeses / divisor)} de {formatEuros(totalDespeses / divisor)}{isMitja ? "/mes" : " totals"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Fixes vs Variables comparative ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Fixes vs Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stacked bar */}
          <div className="space-y-1.5">
            <div className="flex h-5 rounded-full overflow-hidden bg-muted">
              {totalDespeses > 0 && (
                <>
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${pctFix}%` }}
                    title={`Fixes: ${pctFix.toFixed(1)}%`}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${pctVariable}%` }}
                    title={`Variables: ${pctVariable.toFixed(1)}%`}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                Fixes {pctFix.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                Variables {pctVariable.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Side-by-side detail */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Anchor className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Fixes</span>
              </div>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                {formatEuros(totalFixesDespeses / divisor)}{isMitja && <span className="text-sm font-normal opacity-60">/mes</span>}
              </p>
              <p className="text-[11px] text-indigo-400 mt-0.5">
                {fixesDespeses.length} moviment{fixesDespeses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Variables</span>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                {formatEuros(totalVariablesDespeses / divisor)}{isMitja && <span className="text-sm font-normal opacity-60">/mes</span>}
              </p>
              <p className="text-[11px] text-amber-400 mt-0.5">
                {variablesDespeses.length} moviment{variablesDespeses.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Category breakdown split */}
          {(groupsFixesDespeses.length > 0 || groupsVariablesDespeses.length > 0) && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t">
              {/* Fixed categories */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Per categoria fixa</p>
                {groupsFixesDespeses.map(g => {
                  const gTotal = g.items.reduce((s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0)
                  const pct = totalFixesDespeses > 0 ? (gTotal / totalFixesDespeses) * 100 : 0
                  return (
                    <div key={g.nom} className="space-y-0.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <ColorDot color={g.color} />
                          <span className="truncate text-muted-foreground">{g.nom}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-1">
                          {formatEuros(gTotal / divisor)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Variable categories */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Per categoria variable</p>
                {groupsVariablesDespeses.map(g => {
                  const gTotal = g.items.reduce((s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0)
                  const pct = totalVariablesDespeses > 0 ? (gTotal / totalVariablesDespeses) * 100 : 0
                  return (
                    <div key={g.nom} className="space-y-0.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <ColorDot color={g.color} />
                          <span className="truncate text-muted-foreground">{g.nom}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-1">
                          {formatEuros(gTotal / divisor)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Fixed expense categories ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Despeses de Categories Fixes
          </h3>
        </div>

        {fixesDespeses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
            Cap despesa en categories fixes en aquest període.
            <br />
            <span className="text-xs">Marca categories com a &quot;Fixa&quot; per veure-les aquí.</span>
          </p>
        ) : (
          <div className="space-y-3">
            {groupsFixesDespeses.map(group => {
              const groupTotal = group.items.reduce(
                (s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0,
              )
              return (
                <Card key={group.nom}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ColorDot color={group.color} />
                        {group.nom}
                      </div>
                      <span className="font-mono text-base">{formatEuros(groupTotal / divisor)}{isMitja && <span className="text-xs font-normal opacity-60 ml-0.5">/mes</span>}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.items.map(t => (
                        <div
                          key={t.id}
                          className="flex justify-between items-center text-sm border-b last:border-0 pb-2 last:pb-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground truncate">{t.concepte}</span>
                            {!!t.recurrent && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                                <RefreshCw className="w-2.5 h-2.5" />
                                Subscripció
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-xs text-muted-foreground tabular-nums">{formatDate(t.data)}</span>
                            <span className="font-mono font-medium">
                              {formatEuros(t.import_trs - (t.total_deutes ?? 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Subscriptions / recurring ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Subscripcions / Pagaments Periòdics
            </h3>
          </div>
          {subscripcions.length > 0 && (
            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
              {formatEuros(totalSubscripcions / divisor)}{isMitja && <span className="text-xs font-normal opacity-60 ml-0.5">/mes</span>}
            </span>
          )}
        </div>

        {subscripcions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
            Cap transacció marcada com a &quot;recurrent&quot; en aquest període.
            <br />
            <span className="text-xs">Marca subscripcions (Netflix, Spotify...) com a recurrents al crear-les.</span>
          </p>
        ) : (
          <div className="space-y-3">
            {groupsSubscripcions.map(group => {
              const groupTotal = group.items.reduce(
                (s, t) => s + t.import_trs - (t.total_deutes ?? 0), 0,
              )
              return (
                <Card key={group.nom}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ColorDot color={group.color} />
                        {group.nom}
                      </div>
                      <span className="font-mono text-base">{formatEuros(groupTotal / divisor)}{isMitja && <span className="text-xs font-normal opacity-60 ml-0.5">/mes</span>}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.items.map(t => (
                        <div
                          key={t.id}
                          className="flex justify-between items-center text-sm border-b last:border-0 pb-2 last:pb-0"
                        >
                          <span className="text-muted-foreground">{t.concepte}</span>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-xs text-muted-foreground tabular-nums">{formatDate(t.data)}</span>
                            <span className="font-mono font-medium">
                              {formatEuros(t.import_trs - (t.total_deutes ?? 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
