import { getAccounts } from "./db/queries/accounts"
import { getCategories } from "./db/queries/categories"
import { getTransactions } from "./db/queries/transactions"

export async function exportUserData(userId: string): Promise<void> {
  try {
    // 1. Obtenim totes les dades en paral·lel
    // NOTA: Posem un limit molt alt a getTransactions per assegurar-nos que les agafa totes, no només la primera pàgina.
    const [accounts, categories, transactions] = await Promise.all([
      getAccounts(userId),
      getCategories(userId),
      getTransactions({ userId, limit: 1000000, offset: 0 }) 
    ])

    // 2. Construïm l'objecte de backup estructurat
    const backupData = {
      version: 1, // Ens servirà per al futur quan vulguem fer la funció d'importar
      exportDate: new Date().toISOString(),
      data: {
        accounts,
        categories,
        transactions
      }
    }

    // 3. Convertim a JSON (amb indentació de 2 espais perquè sigui llegible per humans)
    const jsonString = JSON.stringify(backupData, null, 2)
    
    // 4. Truc del navegador: Creem un arxiu "virtual" i el descarreguem
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement("a")
    a.href = url
    
    // Generem un nom de fitxer amb la data d'avui (ex: finances_backup_2026-03-05.json)
    const today = new Date().toISOString().split('T')[0]
    a.download = `finances_backup_${today}.json`
    
    document.body.appendChild(a)
    a.click()
    
    // 5. Netegem la memòria del navegador
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error("Error exportant les dades:", error)
    throw error
  }
}