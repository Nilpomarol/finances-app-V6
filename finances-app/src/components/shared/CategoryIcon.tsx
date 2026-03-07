import { fallbackIcon, iconMap } from "@/lib/iconMap"

interface CategoryIconProps {
  icona: string
  color: string
  size?: "sm" | "md" | "lg"
}

const SIZE_MAP = {
  sm: { container: "w-7 h-7", icon: "w-3.5 h-3.5" },
  md: { container: "w-9 h-9", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
}

export default function CategoryIcon({ icona, color, size = "md" }: CategoryIconProps) {
  const IconComponent = iconMap[icona] ?? fallbackIcon
  const { container, icon } = SIZE_MAP[size]

  return (
    <div
      className={`${container} rounded-full flex items-center justify-center shrink-0`}
      style={{ backgroundColor: color + "20" }}
    >
      <IconComponent className={icon} style={{ color }} />
    </div>
  )
}