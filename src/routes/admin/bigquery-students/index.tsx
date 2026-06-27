import { createFileRoute } from '@tanstack/react-router'
import { httpsCallable } from 'firebase/functions'
import { z } from 'zod'
import { functions } from '@/firebase/config'

const sortSchema = z.enum(['name_asc', 'name_desc', 'student_id_asc', 'student_id_desc'])

const searchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
    search: z.string().optional().catch(undefined),
    sort: sortSchema.optional().catch(undefined),
    cursor: z.string().optional().catch(undefined),
    history: z.string().optional().catch(undefined),
})

export type BigQueryStudentSearch = z.infer<typeof searchSchema>
export type BigQueryStudentSort = z.infer<typeof sortSchema>

export interface BigQueryStudent {
    id: string
    firstName: string
    lastName: string
    fullName: string
    email: string | null
    studentId: string | null
    gender: string | null
    dob: string | null
    role: string
}

export interface BigQueryStudentResult {
    students: BigQueryStudent[]
    nextCursor: string | null
    query: {
        durationMs: number
        bytesProcessed: number
        bytesBilled: number
        cacheHit: boolean
    }
    freshness: string | null
}

export async function fetchBigQueryStudents(
    pageSize: number,
    search?: string,
    sort?: BigQueryStudentSort,
    cursor?: string,
) {
    const request: {
        pageSize: number
        search?: string
        sort?: BigQueryStudentSort
        cursor?: string
    } = { pageSize }

    if (search) request.search = search
    if (sort) request.sort = sort
    if (cursor) request.cursor = cursor

    const callable = httpsCallable<
        { pageSize: number; search?: string; sort?: BigQueryStudentSort; cursor?: string },
        BigQueryStudentResult
    >(functions, 'listAdminBigQueryStudents')

    const result = await callable(request)
    return result.data
}

export const Route = createFileRoute('/admin/bigquery-students/')({
    validateSearch: (search) => searchSchema.parse(search),
    loaderDeps: ({ search: { pageSize, search, sort, cursor } }) => ({
        pageSize,
        search,
        sort,
        cursor,
    }),
    loader: async ({ context: { queryClient }, deps: { pageSize, search, sort, cursor } }) => {
        await queryClient.ensureQueryData({
            queryKey: ['bigquery-students-list', pageSize, search, sort, cursor],
            queryFn: () => fetchBigQueryStudents(pageSize, search, sort, cursor),
        })
    },
})
