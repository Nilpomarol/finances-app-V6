import type { LucideProps } from "lucide-react"
import { fallbackIcon, iconMap } from "@/lib/iconMap"

interface DynamicIconProps extends LucideProps {
  name: string
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = iconMap[name] ?? fallbackIcon

  return <Icon {...props} />
}