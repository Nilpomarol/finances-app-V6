export const ICON_OPTIONS = [
  // General
  { value: "tag", label: "General" },
  { value: "box", label: "Caixa" },
  { value: "more-horizontal", label: "Altres" },
  { value: "star", label: "Especial" },
  { value: "smile", label: "Personal" },
  // Finances
  { value: "banknote", label: "Efectiu" },
  { value: "credit-card", label: "Targeta" },
  { value: "wallet", label: "Cartera" },
  { value: "piggy-bank", label: "Estalvis" },
  { value: "trending-up", label: "Inversions" },
  { value: "landmark", label: "Banc" },
  { value: "euro", label: "Euro" },
  { value: "coins", label: "Monedes" },
  // Alimentació
  { value: "shopping-cart", label: "Supermercat" },
  { value: "shopping-bag", label: "Compres" },
  { value: "utensils", label: "Restaurants" },
  { value: "coffee", label: "Cafè" },
  { value: "pizza", label: "Pizza" },
  { value: "beer", label: "Cervesa" },
  { value: "wine", label: "Vi" },
  { value: "cake", label: "Pastisseria" },
  // Transport
  { value: "car", label: "Cotxe" },
  { value: "bus", label: "Autobús" },
  { value: "train", label: "Transport públic" },
  { value: "bike", label: "Bicicleta" },
  { value: "plane", label: "Avió" },
  { value: "fuel", label: "Gasolina" },
  { value: "anchor", label: "Nàutica" },
  { value: "map-pin", label: "Ubicació" },
  // Llar
  { value: "home", label: "Llar" },
  { value: "bed", label: "Habitació" },
  { value: "zap", label: "Electricitat" },
  { value: "droplets", label: "Aigua" },
  { value: "wifi", label: "Internet" },
  { value: "phone", label: "Telèfon" },
  { value: "hammer", label: "Bricolatge" },
  { value: "wrench", label: "Reparacions" },
  // Tecnologia
  { value: "smartphone", label: "Mòbil" },
  { value: "laptop", label: "Ordinador" },
  { value: "tv", label: "Televisió" },
  { value: "gamepad-2", label: "Videojocs" },
  { value: "headphones", label: "Auriculars" },
  { value: "camera", label: "Càmera" },
  // Oci
  { value: "music", label: "Música" },
  { value: "film", label: "Cinema" },
  { value: "ticket", label: "Entrades" },
  // Salut
  { value: "activity", label: "Activitat" },
  { value: "heart", label: "Salut" },
  { value: "heart-pulse", label: "Cardio" },
  { value: "stethoscope", label: "Metge" },
  { value: "pill", label: "Farmàcia" },
  { value: "scissors", label: "Perruqueria" },
  { value: "dumbbell", label: "Gimnàs" },
  // Persones
  { value: "briefcase", label: "Feina" },
  { value: "users", label: "Família" },
  { value: "baby", label: "Fills" },
  { value: "paw-print", label: "Mascotes" },
  // Educació i cultura
  { value: "graduation-cap", label: "Educació" },
  { value: "book", label: "Llibres" },
  // Estil de vida
  { value: "shirt", label: "Roba" },
  { value: "gift", label: "Regal" },
  { value: "sun", label: "Vacances" },
  { value: "moon", label: "Nit" },
] as const

export type IconValue = typeof ICON_OPTIONS[number]["value"]