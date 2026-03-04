// Tipatge complet de l'esquema de la base de dades
// S'emplenarà a la tasca 0.5

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

export interface Transaction {
  id: string
  user_id: string
  concepte: string
  data: number
  import_trs: number
  notes: string | null
  compte_id: string
  compte_desti_id: string | null
  categoria_id: string | null
  esdeveniment_id: string | null
  event_tag_id: string | null
  tipus: "ingres" | "despesa" | "transferencia"
  recurrent: boolean
  liquidacio_persona_id: string | null
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