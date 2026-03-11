import { useState } from "react"
import TransactionTable from "@/components/features/transaccions/TransactionTable"
import type { TransactionWithRelations } from "@/types/database"

const PAGE_SIZE = 25

interface Props {
  transactions: TransactionWithRelations[]
}

export function MovimentsTab({ transactions }: Props) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

  // Sort by date descending
  const sorted = [...transactions].sort((a, b) => b.data - a.data)
  const paginatedSorted = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <TransactionTable
      transactions={paginatedSorted}
      page={page}
      totalPages={totalPages}
      totalCount={transactions.length}
      onPageChange={setPage}
      showAccount
      showCategory
    />
  )
}
