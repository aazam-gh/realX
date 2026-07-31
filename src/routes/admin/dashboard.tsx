import { useState, type ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useQueries, useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  IconActivity,
  IconBuildingCommunity,
  IconBuildingStore,
  IconClipboardCheck,
  IconCurrencyRiyal,
  IconDatabase,
  IconReceipt,
  IconRefresh,
  IconShoppingBag,
  IconUsers,
  type Icon,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip as AppTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { STALE_TIME } from '@/lib/constants'
import {
  fetchAdminBigQueryDashboard,
  type AdminDashboardRange,
} from '@/lib/admin-bigquery-dashboard'
import { adminOverviewQueryOptions } from '@/lib/admin-dashboard-overview'

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
})

const QAR = new Intl.NumberFormat('en-QA', {
  style: 'currency',
  currency: 'QAR',
  maximumFractionDigits: 2,
})
const COUNT = new Intl.NumberFormat('en-QA', { maximumFractionDigits: 0 })

const RANGE_LABELS: Record<AdminDashboardRange, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6mo': 'Last 6 months',
}

const adminDashboardQueryOptions = (range: AdminDashboardRange) => queryOptions({
  queryKey: ['admin-bigquery-dashboard', range],
  queryFn: () => fetchAdminBigQueryDashboard(range),
  staleTime: STALE_TIME.MEDIUM,
  retry: 1,
  refetchOnWindowFocus: false,
})

function formatDate(value: string | number) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString('en-QA', { dateStyle: 'medium', timeStyle: 'short' })
}

function readableType(type: string) {
  return type === 'unspecified'
    ? 'Unspecified'
    : type.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function DashboardMetricCard({
  label,
  description,
  value,
  icon: Icon,
  href,
  loading,
  error,
  format = COUNT.format,
}: {
  label: string
  description: string
  value?: number
  icon: Icon
  href?: string
  loading: boolean
  error: boolean
  format?: (value: number) => string
}) {
  const content = (
    <Card className="gap-0 py-0 transition-colors hover:border-brand-green/50 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              <AppTooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} aria-label={`${label} definition`} className="cursor-help text-muted-foreground underline decoration-dotted underline-offset-2">?</span>
                </TooltipTrigger>
                <TooltipContent>{description}</TooltipContent>
              </AppTooltip>
            </div>
            {loading ? <Skeleton className="mt-3 h-8 w-28" /> : error ? (
              <p className="mt-3 text-sm font-medium text-destructive">Unavailable</p>
            ) : (
              <p className="mt-2 truncate font-heading text-2xl tabular-nums text-foreground" title={value === undefined ? undefined : format(value)}>
                {value === undefined ? '—' : format(value)}
              </p>
            )}
          </div>
          <span className="rounded-lg bg-brand-green/10 p-2.5 text-brand-green" aria-hidden="true"><Icon className="size-5" stroke={1.8} /></span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{href ? 'Open details' : description}</p>
      </CardContent>
    </Card>
  )

  return href ? <a href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</a> : content
}

function LoadingPanel({ className }: { className?: string }) {
  return <Card className={className}><CardContent className="space-y-4 p-6"><Skeleton className="h-5 w-40" /><Skeleton className="h-56 w-full" /></CardContent></Card>
}

function EmptyPanel({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center"><p className="font-medium">{title}</p><p className="max-w-sm text-sm text-muted-foreground">{detail}</p>{action}</div>
}

function AdminDashboard() {
  const [range, setRange] = useState<AdminDashboardRange>('6mo')
  const dashboardQuery = useQuery(adminDashboardQueryOptions(range))
  const [studentsQuery, vendorsQuery, onlineVendorsQuery, holdingGroupsQuery, verificationQuery] = useQueries({
    queries: [
      adminOverviewQueryOptions.students(),
      adminOverviewQueryOptions.vendors(),
      adminOverviewQueryOptions.onlineVendors(),
      adminOverviewQueryOptions.holdingGroups(),
      adminOverviewQueryOptions.pendingVerificationRequests(),
    ],
  })

  const dashboard = dashboardQuery.data
  const stats = dashboard?.stats
  const analyticsLoading = dashboardQuery.isLoading
  const analyticsError = dashboardQuery.isError
  const updatedAt = dashboardQuery.dataUpdatedAt ? formatDate(dashboardQuery.dataUpdatedAt) : null
  const exportFreshness = dashboard?.freshness ? formatDate(dashboard.freshness) : 'No exported transactions yet'

  return (
    <main className="min-h-full bg-muted/30">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">Admin operations</p>
            <h1 className="mt-1 font-heading text-2xl text-foreground sm:text-3xl">Operational overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A live view of RealX’s registered network and exported transaction performance.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={range} onValueChange={(value) => setRange(value as AdminDashboardRange)}>
              <SelectTrigger aria-label="Transaction date range" className="w-full bg-background sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RANGE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void dashboardQuery.refetch()} disabled={dashboardQuery.isFetching} className="gap-2">
              <IconRefresh className={dashboardQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} /> Refresh analytics
            </Button>
          </div>
        </header>

        <section aria-label="Data freshness" className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><IconDatabase className="size-4 text-brand-green" stroke={1.8} /><span>Transaction export through <strong className="font-medium text-foreground">{exportFreshness}</strong></span></div>
          {updatedAt && <span className="text-xs text-muted-foreground">Dashboard refreshed {updatedAt}</span>}
        </section>

        {analyticsError && (
          <section role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-medium text-foreground">Transaction analytics are unavailable.</p><p className="mt-1 text-muted-foreground">Network and verification metrics are still shown where their individual queries succeed.</p></div>
            <Button variant="outline" onClick={() => void dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>Try again</Button>
          </section>
        )}

        <section aria-label="Key performance indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard label="Total students" description="All student records in Firestore." value={studentsQuery.data} loading={studentsQuery.isLoading} error={studentsQuery.isError} icon={IconUsers} href="/admin/students" />
          <DashboardMetricCard label="Total vendors" description="All vendor records, including online vendors." value={vendorsQuery.data} loading={vendorsQuery.isLoading} error={vendorsQuery.isError} icon={IconBuildingStore} href="/admin/vendors" />
          <DashboardMetricCard label="Online vendors" description="Vendor records whose type is online." value={onlineVendorsQuery.data} loading={onlineVendorsQuery.isLoading} error={onlineVendorsQuery.isError} icon={IconShoppingBag} href="/admin/online-vendors" />
          <DashboardMetricCard label="Holding groups" description="Configured holding groups, including disabled groups." value={holdingGroupsQuery.data} loading={holdingGroupsQuery.isLoading} error={holdingGroupsQuery.isError} icon={IconBuildingCommunity} href="/admin/holding-groups" />
          <DashboardMetricCard label="Pending verification" description="Verification requests awaiting a decision." value={verificationQuery.data} loading={verificationQuery.isLoading} error={verificationQuery.isError} icon={IconClipboardCheck} href="/admin/verification-requests" />
          <DashboardMetricCard label="Total transactions" description="All non-online-redemption transaction rows in the export." value={stats?.transactions} loading={analyticsLoading} error={analyticsError} icon={IconReceipt} href="/admin/bigquery-transactions?page=1&pageSize=10" />
          <DashboardMetricCard label="Offer redemptions" description="Exported transactions whose type is offer." value={stats?.offerRedemptions} loading={analyticsLoading} error={analyticsError} icon={IconActivity} href="/admin/bigquery-transactions?page=1&pageSize=10" />
          <DashboardMetricCard label="Transaction value" description="Sum of final amount, with total amount used when final amount is absent." value={stats?.transactionValue} loading={analyticsLoading} error={analyticsError} icon={IconCurrencyRiyal} href="/admin/bigquery-transactions?page=1&pageSize=10" format={QAR.format} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
          {analyticsLoading ? <LoadingPanel /> : <Card>
            <CardHeader><CardTitle>Transaction trend</CardTitle><p className="text-sm text-muted-foreground">Transaction value and count for {RANGE_LABELS[range].toLowerCase()}.</p></CardHeader>
            <CardContent>{analyticsError ? <EmptyPanel title="Trend unavailable" detail="Retry the analytics request to load the selected range." /> : !dashboard?.transactionTrend.length ? <EmptyPanel title="No transactions in this range" detail="Transaction trend will appear after eligible transactions are exported." /> : (
              <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.transactionTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><defs><linearGradient id="transaction-value" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--brand-green)" stopOpacity={0.24} /><stop offset="95%" stopColor="var(--brand-green)" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} /><YAxis tickFormatter={(value) => `QAR ${COUNT.format(value)}`} tickLine={false} axisLine={false} width={72} /><Tooltip formatter={(value: number) => [QAR.format(value), 'Transaction value']} labelFormatter={(label) => `Period starting ${label}`} /><Area type="monotone" dataKey="value" stroke="var(--brand-green)" strokeWidth={2.5} fill="url(#transaction-value)" /></AreaChart></ResponsiveContainer></div>
            )}</CardContent>
          </Card>}

          {analyticsLoading ? <LoadingPanel /> : <Card>
            <CardHeader><CardTitle>Transaction breakdown</CardTitle><p className="text-sm text-muted-foreground">Exact transaction types in the selected period.</p></CardHeader>
            <CardContent className="space-y-3">{analyticsError ? <EmptyPanel title="Breakdown unavailable" detail="Retry to load transaction types." /> : !dashboard?.transactionBreakdown.length ? <EmptyPanel title="No transaction types yet" detail="Types appear when transactions are exported." /> : dashboard.transactionBreakdown.map((item) => <div key={item.type} className="rounded-lg border border-border bg-muted/30 p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{readableType(item.type)}</span><span className="font-mono text-sm tabular-nums">{COUNT.format(item.transactions)}</span></div><div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Transactions</span><span className="font-mono tabular-nums">{QAR.format(item.value)}</span></div></div>)}</CardContent>
          </Card>}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {analyticsLoading ? <LoadingPanel /> : <Card>
            <CardHeader><CardTitle>Vendor performance</CardTitle><p className="text-sm text-muted-foreground">Highest transaction value for {RANGE_LABELS[range].toLowerCase()}.</p></CardHeader>
            <CardContent>{analyticsError ? <EmptyPanel title="Vendor performance unavailable" detail="Retry to load the selected range." /> : !dashboard?.topVendors.length ? <EmptyPanel title="No vendor performance yet" detail="Vendor ranking will appear after transactions are exported." /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.topVendors} layout="vertical" margin={{ left: 4, right: 12 }}><XAxis type="number" tickFormatter={(value) => `QAR ${COUNT.format(value)}`} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tickFormatter={(value) => String(value).length > 18 ? `${String(value).slice(0, 18)}…` : value} /><Tooltip formatter={(value: number) => [QAR.format(value), 'Transaction value']} /><Bar dataKey="sales" name="Transaction value" fill="var(--brand-green)" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div>}</CardContent>
          </Card>}

          {analyticsLoading ? <LoadingPanel /> : <Card>
            <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Recent transaction activity</CardTitle><p className="mt-2 text-sm text-muted-foreground">Latest eligible transactions in the export.</p></div><Link to="/admin/bigquery-transactions" search={{ page: 1, pageSize: 10 }} className="shrink-0 text-sm font-medium text-brand-green hover:underline">View all</Link></CardHeader>
            <CardContent>{analyticsError ? <EmptyPanel title="Activity unavailable" detail="Retry to load recent transactions." /> : !dashboard?.recentActivity.length ? <EmptyPanel title="No recent activity" detail="Transactions will appear here after they are exported." /> : <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{dashboard.recentActivity.map((activity) => <div key={activity.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div className="min-w-0"><p className="truncate font-medium">{activity.vendorName}</p><p className="truncate text-xs text-muted-foreground">{activity.studentName} · {formatDate(activity.createdAt)}</p></div><div className="shrink-0 text-right"><p className="font-mono text-sm font-medium tabular-nums">{QAR.format(activity.amount)}</p><p className="text-xs text-muted-foreground">{activity.status}</p></div></div>)}</div>}</CardContent>
          </Card>}
        </section>
      </div>
    </main>
  )
}
