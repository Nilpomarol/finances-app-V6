import { UploadCloud, Table2, SlidersHorizontal, X } from "lucide-react"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ImportStepHeaderProps } from "./types"

const STEPS = [
  { num: 1 as const, label: "Pujar CSV",       sub: "Selecciona l'arxiu",    Icon: UploadCloud        },
  { num: 2 as const, label: "Mapejar",          sub: "Assigna les columnes",  Icon: Table2             },
  { num: 3 as const, label: "Revisar i Editar", sub: "Confirma els moviments",Icon: SlidersHorizontal  },
]

export default function ImportStepHeader({ step, onClose }: ImportStepHeaderProps & { onClose: () => void }) {
  return (
    <div className="bg-slate-50 dark:bg-[#0f1628] text-slate-900 dark:text-white px-8 pt-5 pb-6 shrink-0 border-b border-slate-200 dark:border-transparent">
      {/* Top row: title + close button */}
      <div className="flex items-center justify-between mb-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight text-slate-500 dark:text-white/70">
            Importar CSV
          </DialogTitle>
        </DialogHeader>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
          aria-label="Tancar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step track — centred, takes full width */}
      <div className="flex items-center justify-center">
        {STEPS.map((s, i) => {
          const isActive    = step === s.num
          const isCompleted = step > s.num
          const isDimmed    = step < s.num

          return (
            <div key={s.num} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2.5 w-36">
                {/* Icon circle */}
                <div className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                  ${isActive    ? "bg-[#f43f5e] shadow-lg shadow-[#f43f5e]/40 scale-110" : ""}
                  ${isCompleted ? "bg-slate-200 dark:bg-white/10"  : ""}
                  ${isDimmed    ? "bg-slate-100 dark:bg-white/5"   : ""}
                `}>
                  {isCompleted ? (
                    /* Checkmark for completed */
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" className="text-[#f43f5e]" stroke="#f43f5e" />
                    </svg>
                  ) : (
                    <s.Icon className={`w-6 h-6 transition-colors ${isActive ? "text-white" : "text-slate-400 dark:text-white/30"}`} />
                  )}
                </div>

                {/* Label + sub */}
                <div className="text-center">
                  <p className={`text-sm font-semibold leading-tight transition-colors
                    ${isActive    ? "text-slate-900 dark:text-white"           : ""}
                    ${isCompleted ? "text-slate-400 dark:text-white/50"        : ""}
                    ${isDimmed    ? "text-slate-300 dark:text-white/25"        : ""}
                  `}>
                    {s.label}
                  </p>
                  <p className={`text-[11px] mt-0.5 transition-colors
                    ${isActive    ? "text-slate-500 dark:text-white/55"        : ""}
                    ${isCompleted ? "text-slate-400 dark:text-white/30"        : ""}
                    ${isDimmed    ? "text-slate-300 dark:text-white/15"        : ""}
                  `}>
                    {s.sub}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="w-20 mx-2 mb-8 flex items-center">
                  <div className="relative w-full h-px">
                    {/* Base track */}
                    <div className="absolute inset-0 bg-slate-200 dark:bg-white/10 rounded-full" />
                    {/* Filled portion */}
                    <div
                      className="absolute inset-y-0 left-0 bg-[#f43f5e]/60 rounded-full transition-all duration-500"
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}