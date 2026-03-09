import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import type { Account, TransactionWithRelations } from "@/types/database"
import EntityTransactionsModal from "@/components/shared/EntityTransactionsModal"
import type { EntityTransactionsEntity } from "@/components/shared/EntityTransactionsModal"
import { formatEuros } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, ChevronRight, Users, Pin, Check } from "lucide-react"

interface Kpis {
  patrimoni: number
  ingressos: number
  despeses: number
  fluxNet: number
}

interface DashboardMobileProps {
  accounts: Account[]
  transactions: TransactionWithRelations[]
  kpis: Kpis
  nomMesActual: string
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  banc: "Banc",
  estalvi: "Estalvis",
  efectiu: "Efectiu",
  inversio: "Inversió",
}

export function DashboardMobile({ accounts, transactions, kpis, nomMesActual }: DashboardMobileProps) {
  const navigate = useNavigate()
  const [txEntity, setTxEntity] = useState<EntityTransactionsEntity | null>(null)

  const [pinnedId, setPinnedId] = useState<string | null>(() => {
    try { return localStorage.getItem("dashboard_pinned_account") } catch { return null }
  })
  const [showPinMenu, setShowPinMenu] = useState(false)

  const heroAccount = accounts.find(a => a.id === pinnedId) ?? accounts[0] ?? null
  const sortedAccounts = heroAccount
    ? [heroAccount, ...accounts.filter(a => a.id !== heroAccount.id)]
    : accounts

  const handlePin = (id: string) => {
    setPinnedId(id)
    setShowPinMenu(false)
    try { localStorage.setItem("dashboard_pinned_account", id) } catch {}
  }

  const handleTxClick = (tx: TransactionWithRelations) => {
    if (tx.esdeveniment_id) navigate(`/esdeveniments/${tx.esdeveniment_id}`)
    else navigate("/transaccions")
  }

  const recentTxs = transactions.slice(0, 10)
  const fluxPositive = kpis.fluxNet >= 0
  const fluxPct = kpis.ingressos > 0
    ? Math.min(100, (Math.abs(kpis.despeses) / kpis.ingressos) * 100)
    : 100

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "linear-gradient(to bottom, #0e1a2e 0px, #0e1a2e 200px, #f8fafc 340px)" }}>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — dark, immersive
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative px-6 pt-8 pb-20"
        style={{ background: "linear-gradient(170deg, #080f1a 0%, #0f1f35 60%, #0e1a2e 100%)" }}
      >
        {/* Decorative bg — overflow contained here so the dropdown isn't clipped */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          {heroAccount && (
            <div
              className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl transition-colors duration-1000"
              style={{ backgroundColor: heroAccount.color, opacity: 0.12 }}
            />
          )}
        </div>

        {/* Top row: account selector */}
        <div className="relative flex items-center justify-between mb-8">
          {/* Account name pill — tap to change pinned */}
          <button
            onClick={() => setShowPinMenu(v => !v)}
            className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.08] rounded-full pl-3 pr-3.5 py-1.5 transition-colors"
          >
            {heroAccount && (
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: heroAccount.color }}
              />
            )}
            <span className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">
              {heroAccount?.nom ?? "Selecciona compte"}
            </span>
            <ChevronRight className={cn(
              "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
              showPinMenu ? "rotate-90" : ""
            )} />
          </button>

          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">
            {ACCOUNT_TYPE_LABELS[heroAccount?.tipus ?? ""] ?? ""}
          </span>
        </div>

        {/* Pin menu dropdown — fixed so it's never clipped by any ancestor */}
        {showPinMenu && (
          <>
            {/* Backdrop to close on tap outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPinMenu(false)}
            />
            <div
              className="fixed left-4 right-4 top-24 z-50 rounded-2xl overflow-hidden border border-white/10"
              style={{
                background: "rgba(15,25,40,0.97)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
              }}
            >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-4 pt-3.5 pb-2">
              Compte principal
            </p>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => handlePin(acc.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors text-left"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: acc.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{acc.nom}</p>
                  <p className="text-[11px] text-slate-500">{formatEuros(acc.saldo)}</p>
                </div>
                {acc.id === pinnedId && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </button>
            ))}
            <div className="h-2" />
            </div>
          </>
        )}

        {/* Balance */}
        <button
          onClick={() => {
            if (heroAccount) setTxEntity({ type: "account", id: heroAccount.id, name: heroAccount.nom, color: heroAccount.color })
          }}
          className="text-left w-full active:opacity-75 transition-opacity"
        >
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            Saldo actual
          </p>
          <p className="text-[3.4rem] font-bold text-white tabular-nums tracking-tight leading-none">
            {formatEuros(heroAccount?.saldo ?? kpis.patrimoni)}
          </p>
          {heroAccount && kpis.patrimoni > 0 && (
            <p className="text-xs text-slate-600 mt-2 tabular-nums">
              {Math.round((heroAccount.saldo / kpis.patrimoni) * 100)}% del patrimoni total
            </p>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FLOATING CARD — summary
      ══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 -mt-[72px] relative z-10">
        <div
          className="rounded-3xl bg-white dark:bg-slate-900 overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)" }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-50 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Resum del mes</span>
            <span className="text-[11px] font-semibold text-slate-400">{nomMesActual}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 divide-x divide-slate-50 dark:divide-slate-800">
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ingressos</span>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
                {formatEuros(kpis.ingressos)}
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-3 h-3 text-rose-600" />
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Despeses</span>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
                {formatEuros(kpis.despeses)}
              </p>
            </div>
          </div>

          {/* Flux net */}
          <div className="px-5 pb-5 pt-3 border-t border-slate-50 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-400">Flux Net</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                fluxPositive ? "text-emerald-600" : "text-rose-500"
              )}>
                {kpis.fluxNet > 0 ? "+" : ""}{formatEuros(kpis.fluxNet)}
              </span>
            </div>
            {/* Spend bar — shows despeses vs ingressos */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${fluxPct}%`,
                  background: fluxPositive
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #f97316, #fb923c)"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ACCOUNTS GRID
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-7 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Comptes</h2>
          <Link
            to="/comptes"
            className="text-xs font-semibold text-slate-400 flex items-center gap-0.5 hover:text-slate-700 transition-colors"
          >
            Gestionar <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sortedAccounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setTxEntity({ type: "account", id: acc.id, name: acc.nom, color: acc.color })}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-4 text-left active:scale-[0.97] transition-transform relative overflow-hidden"
              style={{ boxShadow: "0 1px 6px rgba(15,23,42,0.06)" }}
            >
              {/* Top color strip */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ backgroundColor: acc.color }}
              />
              <p className="text-[11px] font-semibold text-slate-400 truncate mb-1 mt-1">{acc.nom}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-tight truncate">
                {formatEuros(acc.saldo)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                {ACCOUNT_TYPE_LABELS[acc.tipus] ?? acc.tipus}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TRANSACTIONS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-7 px-4 pb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Activitat</h2>
          <Link
            to="/transaccions"
            className="text-xs font-semibold text-slate-400 flex items-center gap-0.5 hover:text-slate-700 transition-colors"
          >
            Veure tot <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTxs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Cap moviment aquest mes</p>
            <p className="text-xs text-slate-400 mt-1">Les transaccions apareixeran aquí</p>
          </div>
        ) : (
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            style={{ boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }}
          >
            {recentTxs.map((tx, idx) => {
              const isShared = (tx.total_deutes || 0) > 0 && tx.tipus === "despesa"
              const myRealCost = isShared ? tx.import_trs - (tx.total_deutes || 0) : tx.import_trs
              const txDate = new Date(tx.data)
              const day = new Intl.DateTimeFormat("ca-ES", { day: "2-digit" }).format(txDate)
              const mon = new Intl.DateTimeFormat("ca-ES", { month: "short" }).format(txDate)
              const letter = tx.concepte?.trim()?.[0]?.toUpperCase() ?? "?"

              return (
                <div
                  key={tx.id}
                  className={cn(
                    "flex items-center gap-3.5 px-5 py-3.5 active:bg-slate-50 cursor-pointer transition-colors",
                    idx < recentTxs.length - 1 ? "border-b border-slate-50 dark:border-slate-800" : ""
                  )}
                  onClick={() => handleTxClick(tx)}
                >
                  {/* Avatar — dark circle, category color ring */}
                  <div className="relative shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-slate-100"
                      style={{ backgroundColor: "#1e293b" }}
                    >
                      {letter}
                    </div>
                    {/* Category color dot */}
                    {tx.categoria_color && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: tx.categoria_color }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">
                      {tx.concepte}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {day} {mon}
                      {tx.categoria_nom && (
                        <span className="text-slate-300"> · {tx.categoria_nom}</span>
                      )}
                      {isShared && (
                        <span className="inline-flex items-center ml-1">
                          <Users className="w-3 h-3 text-sky-400" />
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right">
                    {isShared ? (
                      <>
                        <p className="text-sm font-bold text-rose-500 tabular-nums">
                          −{formatEuros(myRealCost)}
                        </p>
                        <p className="text-[11px] text-slate-300 line-through tabular-nums">
                          {formatEuros(tx.import_trs)}
                        </p>
                      </>
                    ) : (
                      <p className={cn(
                        "text-sm font-bold tabular-nums",
                        tx.tipus === "ingres" ? "text-emerald-600" :
                        tx.tipus === "despesa" ? "text-slate-800" : "text-sky-600"
                      )}>
                        {tx.tipus === "ingres" ? "+" : tx.tipus === "despesa" ? "−" : ""}
                        {formatEuros(tx.import_trs)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <EntityTransactionsModal
        isOpen={!!txEntity}
        onClose={() => setTxEntity(null)}
        entity={txEntity}
      />
    </div>
  )
}