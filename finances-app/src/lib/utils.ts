import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from "uuid"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Genera un UUID v4 per a nous registres */
export function generateId(): string {
  return uuidv4()
}

/** Retorna el timestamp actual en mil·lisegons (per a data_modificacio) */
export function now(): number {
  return Date.now()
}

/** Formata un número com a euros */
export function formatEuros(amount: number): string {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

/** Formata una data (timestamp ms) com a string llegible */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp))
}

/** Retorna l'inici i fi del mes actual com a timestamps */
export function getCurrentMonthRange(): { start: number; end: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  return { start, end }
}