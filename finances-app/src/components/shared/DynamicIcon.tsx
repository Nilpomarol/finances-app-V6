import { icons } from "lucide-react"
import type { LucideProps } from "lucide-react"

interface DynamicIconProps extends LucideProps {
  name: string
}

export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") as keyof typeof icons

  const Icon = icons[iconName]

  if (!Icon) {
    const Fallback = icons["Tag"]
    return <Fallback {...props} />
  }

  return <Icon {...props} />
}