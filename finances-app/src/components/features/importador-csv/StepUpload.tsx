import { UploadCloud } from "lucide-react"
import type { StepUploadProps } from "./types"

export default function StepUpload({ onFileUpload }: StepUploadProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
      <label className="group cursor-pointer w-full max-w-md">
        <input type="file" accept=".csv" onChange={onFileUpload} className="sr-only" />
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-2xl p-14 flex flex-col items-center gap-4 text-center transition-all duration-200 hover:border-[#f43f5e]/50 hover:bg-[#f43f5e]/5 group-hover:scale-[1.01]">
          <div className="w-16 h-16 rounded-2xl bg-[#f43f5e]/10 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-[#f43f5e]" />
          </div>
          <div>
            <p className="text-base font-semibold mb-1">Puja l'extracte del teu banc</p>
            <p className="text-sm text-muted-foreground">
              Arrossega un fitxer .csv o fes clic per seleccionar-lo
            </p>
          </div>
          <div className="mt-2 px-5 py-2 rounded-xl bg-[#f43f5e] text-white text-sm font-medium shadow-md shadow-[#f43f5e]/20 group-hover:bg-[#e11d48] transition-colors">
            Seleccionar Arxiu
          </div>
        </div>
      </label>
    </div>
  )
}