import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, queryOptions } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Users, Store, TrendingUp, Tag, Bell, Search, ShoppingBag, Database, RefreshCw } from 'lucide-react'
import { STALE_TIME } from '@/lib/constants'
import { fetchAdminBigQueryDashboard } from '@/lib/admin-bigquery-dashboard'

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
})

// --- Query options ---

const adminDashboardQueryOptions = () => queryOptions({
  queryKey: ['admin-bigquery-dashboard'],
  queryFn: fetchAdminBigQueryDashboard,
  staleTime: STALE_TIME.MEDIUM,
  retry: 1,
  refetchOnWindowFocus: false,
})

// --- Components ---

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-md">
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name === 'amount' || p.name === 'sales'
            ? `QAR ${(p.value ?? 0).toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  )
}

function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: dashboard,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery(adminDashboardQueryOptions())

  const stats = dashboard?.stats
  const activity = dashboard?.recentActivity || []
  const revenueData = dashboard?.monthlyRevenue || []
  const vendorStats = dashboard?.topVendors || []
  const transactionsByType = [
    { name: 'Offer', value: stats?.offerRedemptions || 0 },
    { name: 'Other', value: Math.max(0, (stats?.transactions || 0) - (stats?.offerRedemptions || 0)) },
  ]

  const statCards = [
    { label: 'Transacting Students', value: stats?.transactingStudents, icon: Users },
    { label: 'Transacting Vendors', value: stats?.transactingVendors, icon: Store },
    { label: 'Offer Redemptions', value: stats?.offerRedemptions, icon: Tag },
    { label: 'Total Transactions', value: stats?.transactions, icon: TrendingUp },
  ]

  const freshnessDate = dashboard?.freshness ? new Date(dashboard.freshness) : null
  const freshnessLabel = freshnessDate && !Number.isNaN(freshnessDate.getTime())
    ? freshnessDate.toLocaleString()
    : 'No exported transactions yet'

  const recentTxns = activity
    .filter(txn =>
      txn.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.vendorName.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .slice(0, 15)

  return (
    <div className="flex-1 overflow-y-auto bg-white font-sans">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white sticky top-0 z-20 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold m-0 text-slate-900">
              Dashboard <span className="text-brand-green">Overview</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Production analytics powered by the BigQuery transaction export.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-brand-green transition-colors">
              <Search size={16} className="text-slate-400" />
              <input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium flex-1 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button className="relative bg-transparent border-none cursor-pointer p-2 hover:bg-slate-50 rounded-full transition-colors">
              <Bell size={20} className="text-slate-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-brand-green" />
            <span>
              {isLoading ? 'Loading BigQuery analytics…' : `BigQuery data through ${freshnessLabel}`}
            </span>
          </div>
          {dashboard && (
            <span className="text-slate-400">
              Query {dashboard.query.durationMs} ms · {dashboard.query.cacheHit ? 'cache hit' : 'cache miss'}
            </span>
          )}
        </div>

        {isError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Dashboard analytics could not be loaded.</p>
              <p className="mt-1 text-xs text-red-700">
                {error instanceof Error ? error.message : 'Please try again.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-brand-green hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-slate-500 font-bold mb-2 uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-black m-0 text-slate-900">
                    {typeof value === 'number' ? value.toLocaleString() : '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                  <Icon size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold">
                <span className="text-slate-400 font-medium ml-0.5">All exported history</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Revenue Chart */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h3 className="m-0 font-bold text-lg text-slate-900">Redemption Value Trend</h3>
                <p className="text-xs text-slate-500 m-0">Final transaction value in QAR</p>
              </div>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-brand-green" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Revenue</span>
              </div>
            </div>
            <div className="h-70 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18B852" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#18B852" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-5} fontWeight={600} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#18B852"
                    strokeWidth={3}
                    fill="url(#revGrad)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction Mix */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="m-0 font-bold text-lg text-slate-900">Transaction Mix</h3>
            <p className="text-xs text-slate-500 mb-6">Offer redemptions and other transaction types</p>
            <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-10">
              <div className="h-55 w-full max-w-55 relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                  <span className="text-2xl font-black text-slate-900">{stats?.transactions.toLocaleString() || '—'}</span>
                </div>
                {(stats?.transactions || 0) > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={transactionsByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {transactionsByType.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#18B852' : '#f1f5f9'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex flex-col gap-3 w-full md:max-w-50">
                {transactionsByType.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-brand-green' : 'bg-slate-300'}`} />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Vendors */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
            <h3 className="m-0 font-bold text-lg text-slate-900">Performance by Vendor</h3>
            <p className="text-xs text-slate-500 mb-8">Last 30 days by final transaction value (QAR)</p>
            {vendorStats.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} fontWeight={600} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="sales" fill="#18B852" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 py-16 italic font-medium">No sales data recorded yet</p>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="m-0 font-bold text-lg text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-500 mt-1">Latest redemptions exported to BigQuery</p>
              </div>
              <Link
                to="/admin/bigquery-transactions"
                search={{ page: 1, pageSize: 10 }}
                className="bg-emerald-50 text-brand-green text-[10px] uppercase font-black px-3 py-1.5 rounded-lg hover:bg-brand-green hover:text-white transition-all tracking-widest"
              >
                Full Log
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 max-h-70 overflow-y-auto pr-1 overflow-x-hidden">
              {recentTxns.length > 0 ? (
                recentTxns.map(txn => (
                  <div key={txn.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-brand-green shadow-sm group-hover:bg-brand-green group-hover:text-white group-hover:border-brand-green transition-all">
                        <ShoppingBag size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="truncate m-0 text-sm font-black text-slate-900">{txn.studentName}</p>
                        <p className="truncate m-0 text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                          {txn.vendorName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-6">
                      <p className="m-0 text-sm font-black text-slate-900">QAR {(txn.amount || 0).toFixed(0)}</p>
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md mt-1.5 inline-block tracking-widest ${
                        txn.status === 'completed' ? 'bg-emerald-100 text-brand-green' : 'bg-red-100 text-primary'
                      }`}>
                        {txn.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Waiting for activity...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
