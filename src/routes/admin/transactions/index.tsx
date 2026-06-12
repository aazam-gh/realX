import { createFileRoute } from '@tanstack/react-router'
import { httpsCallable } from 'firebase/functions'
import { z } from 'zod'
import { functions } from '@/firebase/config'

const sortSchema = z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc', 'vendor_asc', 'vendor_desc'])

const transactionsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
    vendorName: z.string().optional().catch(undefined),
    sort: sortSchema.optional().catch(undefined),
    cursor: z.string().optional().catch(undefined),
    history: z.string().optional().catch(undefined),
})

export type TransactionSearch = z.infer<typeof transactionsSearchSchema>
type SortOption = z.infer<typeof sortSchema>

export interface Transaction {
    id: string
    date: string
    rawDate?: string | null
    transactionId: string
    vendorName: string
    totalAmountNum?: number
    totalAmount: string
    type: string
    cashbackAmount?: number
    creatorCashbackAmount?: number
    creatorCode?: string | null
    creatorCodeOwnerId?: string | null
    creatorUid?: string | null
    discountAmount?: number
    discountCode?: string | null
    discountType?: string | null
    discountValue?: number
    finalAmount?: number
    purchaseUrl?: string | null
    offerId?: string | null
    pin?: string | null
    userId?: string | null
    vendorId?: string | null
    redemptionCardAmount?: number
    remainingAmount?: number
}

interface BigQueryTransactionResult {
    transactions: Transaction[]
    nextCursor: string | null
    query: {
        durationMs: number
        bytesProcessed: number
        bytesBilled: number
        cacheHit: boolean
    }
    freshness: string | null
}

export async function fetchTransactions(
    pageSize: number,
    vendorName?: string,
    sort?: SortOption,
    cursor?: string,
) {
    const request: {
        pageSize: number
        vendorName?: string
        sort?: SortOption
        cursor?: string
    } = { pageSize }

    if (vendorName) request.vendorName = vendorName
    if (sort) request.sort = sort
    if (cursor) request.cursor = cursor

    const callable = httpsCallable<
        { pageSize: number; vendorName?: string; sort?: SortOption; cursor?: string },
        BigQueryTransactionResult
    >(functions, 'listAdminBigQueryTransactions')

    const result = await callable(request)

    return {
        ...result.data,
        transactions: result.data.transactions.map((transaction) => {
            const date = transaction.rawDate ? new Date(transaction.rawDate) : null
            const totalAmountNum = transaction.totalAmountNum || 0

            return {
                ...transaction,
                date: date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Unknown Date',
                totalAmount: `QAR ${totalAmountNum}`,
                cashbackAmount: transaction.cashbackAmount ?? undefined,
                creatorCashbackAmount: transaction.creatorCashbackAmount ?? undefined,
                discountAmount: transaction.discountAmount ?? undefined,
                discountValue: transaction.discountValue ?? undefined,
                finalAmount: transaction.finalAmount ?? undefined,
                redemptionCardAmount: transaction.redemptionCardAmount ?? undefined,
                remainingAmount: transaction.remainingAmount ?? undefined,
            }
        }),
    }
}

export const Route = createFileRoute('/admin/transactions/')({
    validateSearch: (search) => transactionsSearchSchema.parse(search),
    loaderDeps: ({ search: { pageSize, vendorName, sort, cursor } }) => ({ pageSize, vendorName, sort, cursor }),
    loader: async ({ context: { queryClient }, deps: { pageSize, vendorName, sort, cursor } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['transactions-list', pageSize, vendorName, sort, cursor],
            queryFn: () => fetchTransactions(pageSize, vendorName, sort, cursor),
        })
    },
})
