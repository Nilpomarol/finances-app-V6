// ============================================================
// TIPUS DE LA BASE DE DADES — Finances App
// Reflecteix exactament l'esquema SQL de Turso
// ============================================================

export interface User {
  id: string
  nom: string
  pin: string
  data_modificacio: number
  eliminat: boolean
}

export interface Account {
  id: string
  user_id: string
  nom: string
  tipus: "banc" | "estalvi" | "efectiu" | "inversio"
  logo: string
  color: string
  saldo: number
  data_modificacio: number
  eliminat: boolean
}

export interface Category {
  id: string
  user_id: string
  nom: string
  tipus: "despesa" | "ingres"
  pressupost_mensual: number | null
  color: string
  icona: string
  es_fix: boolean
  data_modificacio: number
  eliminat: boolean
}

export interface Person {
  id: string
  user_id: string
  nom: string
  saldo_caixejat: number | null
  amagat: boolean
  data_modificacio: number
  eliminat: boolean
}

export interface Event {
  id: string
  user_id: string
  nom: string
  tipus: string
  data_inici: number
  data_fi: number
  data_modificacio: number
  eliminat: boolean
}

export interface EventTag {
  id: string
  user_id: string
  tipus_esdeveniment: string
  nom: string
  color: string
  icona: string
  data_modificacio: number
  eliminat: boolean
}

export interface Transaction {
  id: string
  user_id: string
  concepte: string
  data: number
  import_trs: number
  notes: string | null
  compte_id: string | null
  compte_desti_id: string | null
  categoria_id: string | null
  esdeveniment_id: string | null
  event_tag_id: string | null
  tipus: "ingres" | "despesa" | "transferencia"
  recurrent: boolean
  liquidacio_persona_id: string | null
  pagat_per_id: string | null
  data_modificacio: number
  eliminat: boolean
}

export interface RecurringTemplate {
  id: string
  user_id: string
  concepte: string
  import_trs: number
  user_import: number | null
  compte_id: string | null
  categoria_id: string | null
  tipus: "ingres" | "despesa"
  dia_del_mes: number
  notes: string | null
  pagat_per_id: string | null
  darrer_mes_gestionat: string | null
  data_inici: number | null
  data_modificacio: number
  eliminat: boolean
}

export interface RecurringSkip {
  id: string
  template_id: string
  user_id: string
  year: number
  month: number
  data_modificacio: number
  eliminat: boolean
}

export interface TransactionSplit {
  id: string
  transaccio_id: string
  persona_id: string
  import_degut: number
  data_modificacio: number
  eliminat: boolean
}

export interface AssignmentRule {
  id: string
  user_id: string
  paraula_clau: string
  categoria_id: string
  data_modificacio: number
  eliminat: boolean
}

// ============================================================
// TIPUS AUXILIARS (per a la UI)
// ============================================================

// Transacció amb les relacions ja resoltes (joins)
export interface TransactionWithRelations extends Transaction {
  compte_nom?: string
  compte_color?: string
  compte_desti_nom?: string
  categoria_nom?: string
  categoria_color?: string
  categoria_icona?: string
  categoria_es_fix?: boolean
  esdeveniment_nom?: string
  event_tag_nom?: string
  event_tag_color?: string
  persona_nom?: string
  pagat_per_nom?: string | null
  total_deutes?: number
}

// Resultat d'agrupació per categoria (per al dashboard)
export interface CategorySummary {
  categoria_id: string | null
  nom: string
  color: string
  icona: string
  total: number
  pressupost_mensual: number | null
  percentatge_consumit: number | null
}

// KPIs del dashboard
export interface DashboardKpis {
  patrimoni_total: number
  ingressos_mes: number
  despeses_mes: number
  flux_net: number
}