import { httpsCallable } from 'firebase/functions'
import { z } from 'zod'
import { functions } from '@/firebase/config'

const dashboardResponseSchema = z.object({
  stats: z.object({
    transactingStudents: z.number().nonnegative(),
    transactingVendors: z.number().nonnegative(),
    offerRedemptions: z.number().nonnegative(),
    transactions: z.number().nonnegative(),
    transactionValue: z.number().nonnegative(),
  }),
  transactionTrend: z.array(z.object({
    label: z.string(),
    transactions: z.number().nonnegative(),
    value: z.number().nonnegative(),
  })),
  transactionBreakdown: z.array(z.object({
    type: z.string(),
    transactions: z.number().nonnegative(),
    value: z.number().nonnegative(),
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
export const adminDashboardRangeSchema = z.enum(['30d', '90d', '6mo'])
export type AdminDashboardRange = z.infer<typeof adminDashboardRangeSchema>

export async function fetchAdminBigQueryDashboard(range: AdminDashboardRange) {
  const callable = httpsCallable<{ range: AdminDashboardRange }, unknown>(
    functions,
    'getAdminBigQueryDashboard',
  )
  const result = await callable({ range })
  return dashboardResponseSchema.parse(result.data)
}
