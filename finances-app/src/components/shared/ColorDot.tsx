import { cn } from "@/lib/utils"

interface ColorDotProps {
  color: string
  size?: "xs" | "sm" | "md"
  className?: string
}

const SIZE_MAP = {
  xs: "w-[5px] h-[5px]",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
}

export function ColorDot({ color, size = "sm", className }: ColorDotProps) {
  return (
    <div
      className={cn("rounded-full shrink-0", SIZE_MAP[size], className)}
      style={{ backgroundColor: color }}
    />
  )
}