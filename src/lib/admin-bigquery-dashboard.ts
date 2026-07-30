import { httpsCallable } from 'firebase/functions'
import { z } from 'zod'
import { functions } from '@/firebase/config'

const dashboardResponseSchema = z.object({
  stats: z.object({
    transactingStudents: z.number().nonnegative(),
    transactingVendors: z.number().nonnegative(),
    offerRedemptions: z.number().nonnegative(),
    transactions: z.number().nonnegative(),
  }),
  monthlyRevenue: z.array(z.object({
    month: z.string(),
    amount: z.number(),
  })),
  topVendors: z.array(z.object({
    name: z.string(),
    sales: z.number(),
  })),
  recentActivity: z.array(z.object({
    id: z.string(),
    studentName: z.string(),
    vendorName: z.string(),
    amount: z.number(),
    createdAt: z.string(),
    status: z.string(),
  })),
  freshness: z.string().nullable(),
  query: z.object({
    durationMs: z.number().nonnegative(),
    bytesProcessed: z.number().nonnegative(),
    bytesBilled: z.number().nonnegative(),
    cacheHit: z.boolean(),
  }),
})

export type AdminBigQueryDashboard = z.infer<typeof dashboardResponseSchema>

export async function fetchAdminBigQueryDashboard() {
  const callable = httpsCallable<Record<string, never>, unknown>(
    functions,
    'getAdminBigQueryDashboard',
  )
  const result = await callable({})
  return dashboardResponseSchema.parse(result.data)
}
