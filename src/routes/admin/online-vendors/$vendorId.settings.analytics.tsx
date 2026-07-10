import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
    collection,
    documentId,
    getCountFromServer,
    getDocs,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, MousePointerClick, Users } from 'lucide-react'
import { useState } from 'react'
import { db } from '@/firebase/config'
import { vendorQueryOptions } from '@/queries'

type RangeDays = 7 | 30 | 90

const qatarDateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
}).format(date)

const analyticsQueryOptions = (vendorId: string, rangeDays: RangeDays) => ({
    queryKey: ['online-vendor-analytics', vendorId, rangeDays],
    queryFn: async () => {
        const end = new Date()
        const start = new Date(end.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000)
        const startKey = qatarDateKey(start)
        const endKey = qatarDateKey(end)
        const analyticsRef = collection(db, 'onlineVendorAnalytics', vendorId, 'days')
        const usersRef = collection(db, 'onlineVendorAnalytics', vendorId, 'users')

        const [daysSnapshot, uniqueUsersSnapshot] = await Promise.all([
            getDocs(query(
                analyticsRef,
                where(documentId(), '>=', startKey),
                where(documentId(), '<=', endKey),
                orderBy(documentId()),
            )),
            getCountFromServer(query(
                usersRef,
                where('latestClick', '>=', Timestamp.fromDate(new Date(`${startKey}T00:00:00+03:00`))),
            )),
        ])

        const clicksByDate = new Map(daysSnapshot.docs.map((doc) => [doc.id, Number(doc.data().clicks || 0)]))
        const trend = Array.from({ length: rangeDays }, (_, index) => {
            const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000)
            const dateKey = qatarDateKey(date)
            return { date: dateKey, label: dateKey.slice(5), clicks: clicksByDate.get(dateKey) || 0 }
        })

        return {
            clicks: trend.reduce((sum, day) => sum + day.clicks, 0),
            uniqueUsers: uniqueUsersSnapshot.data().count,
            trend,
        }
    },
})

export const Route = createFileRoute('/admin/online-vendors/$vendorId/settings/analytics')({
    component: OnlineVendorAnalytics,
    loader: async ({ context: { queryClient }, params: { vendorId } }) => {
        const vendor = await queryClient.ensureQueryData(vendorQueryOptions(vendorId))
        if (vendor.vendorType !== 'online') {
            throw redirect({ to: '/admin/vendors/$vendorId/settings', params: { vendorId } })
        }
    },
})

function OnlineVendorAnalytics() {
    const { vendorId } = Route.useParams()
    const [rangeDays, setRangeDays] = useState<RangeDays>(30)
    const { data, isLoading, error } = useQuery(analyticsQueryOptions(vendorId, rangeDays))

    return (
        <div className="space-y-6 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Store visit analytics</h2>
                    <p className="text-sm text-muted-foreground">Qualified outbound clicks only; no purchase or redemption is implied.</p>
                </div>
                <div className="inline-flex rounded-lg bg-muted p-1 self-start">
                    {([7, 30, 90] as RangeDays[]).map((days) => (
                        <button
                            key={days}
                            type="button"
                            onClick={() => setRangeDays(days)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${rangeDays === days ? 'bg-white text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {days} days
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Analytics could not be loaded. Confirm the signed-in account has the admin claim and try again.
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <MetricCard
                            icon={<MousePointerClick className="h-5 w-5" />}
                            label="Outbound clicks"
                            value={isLoading ? '—' : (data?.clicks || 0).toLocaleString()}
                        />
                        <MetricCard
                            icon={<Users className="h-5 w-5" />}
                            label="Unique eligible users"
                            value={isLoading ? '—' : (data?.uniqueUsers || 0).toLocaleString()}
                        />
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-brand-green" />
                            <h3 className="font-semibold">Daily clicks</h3>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.trend || []} margin={{ left: -20, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={(label) => `Date: ${label}`} />
                                    <Bar dataKey="clicks" name="Clicks" fill="#16a34a" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-brand-green">{icon}</div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        </div>
    )
}
