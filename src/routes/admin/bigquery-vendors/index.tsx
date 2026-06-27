import { createFileRoute } from '@tanstack/react-router'
import { httpsCallable } from 'firebase/functions'
import { z } from 'zod'
import { functions } from '@/firebase/config'
import type { Vendor } from '@/queries'

const sortSchema = z.enum(['name_asc', 'name_desc', 'category_asc', 'category_desc'])

const searchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
    search: z.string().optional().catch(undefined),
    vendorType: z.enum(['all', 'in_store', 'online']).optional().catch(undefined),
    xcard: z.enum(['all', 'enabled', 'disabled']).optional().catch(undefined),
    sort: sortSchema.optional().catch(undefined),
    cursor: z.string().optional().catch(undefined),
    history: z.string().optional().catch(undefined),
})

export type BigQueryVendorSearch = z.infer<typeof searchSchema>
export type BigQueryVendorSort = z.infer<typeof sortSchema>

export interface BigQueryVendorResult {
    vendors: Vendor[]
    nextCursor: string | null
    query: {
        durationMs: number
        bytesProcessed: number
        bytesBilled: number
        cacheHit: boolean
    }
    freshness: string | null
}

export async function fetchBigQueryVendors(
    pageSize: number,
    search?: string,
    vendorType?: 'all' | 'in_store' | 'online',
    xcard?: 'all' | 'enabled' | 'disabled',
    sort?: BigQueryVendorSort,
    cursor?: string,
) {
    const request: {
        pageSize: number
        search?: string
        vendorType?: 'all' | 'in_store' | 'online'
        xcard?: 'all' | 'enabled' | 'disabled'
        sort?: BigQueryVendorSort
        cursor?: string
    } = { pageSize }

    if (search) request.search = search
    if (vendorType) request.vendorType = vendorType
    if (xcard) request.xcard = xcard
    if (sort) request.sort = sort
    if (cursor) request.cursor = cursor

    const callable = httpsCallable<
        {
            pageSize: number
            search?: string
            vendorType?: 'all' | 'in_store' | 'online'
            xcard?: 'all' | 'enabled' | 'disabled'
            sort?: BigQueryVendorSort
            cursor?: string
        },
        BigQueryVendorResult
    >(functions, 'listAdminBigQueryVendors')

    const result = await callable(request)
    return result.data
}

export const Route = createFileRoute('/admin/bigquery-vendors/')({
    validateSearch: (search) => searchSchema.parse(search),
    loaderDeps: ({ search: { pageSize, search, vendorType, xcard, sort, cursor } }) => ({
        pageSize,
        search,
        vendorType,
        xcard,
        sort,
        cursor,
    }),
    loader: async ({ context: { queryClient }, deps: { pageSize, search, vendorType, xcard, sort, cursor } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['bigquery-vendors-list', pageSize, search, vendorType, xcard, sort, cursor],
            queryFn: () => fetchBigQueryVendors(pageSize, search, vendorType, xcard, sort, cursor),
        })
    },
})