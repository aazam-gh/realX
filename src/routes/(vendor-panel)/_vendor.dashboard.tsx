import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BadgePercent,
  Clock3,
  Loader2,
  Palette,
  ReceiptText,
  RotateCcw,
  Save,
  Sparkles,
  Store,
  TicketCheck,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth'
import { Button } from '@/components/ui/button'
import { db } from '@/firebase/config'
import {
  vendorChartDataQueryOptions,
  vendorQueryOptions,
  vendorStatsQueryOptions,
  type ChartRange,
} from '@/queries'
import {
  DEFAULT_VENDOR_DASHBOARD_THEME,
  VENDOR_DASHBOARD_PALETTES,
  vendorDashboardThemeQueryOptions,
  type VendorDashboardTheme,
} from '@/lib/vendor-dashboard-theme'

export const Route = createFileRoute('/(vendor-panel)/_vendor/dashboard')({
  component: VendorDashboard,
})

const currencyFormatter = new Intl.NumberFormat('en-QA', {
  style: 'currency',
  currency: 'QAR',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(Number(value || 0))
}

function withAlpha(hex: string, opacity: number) {
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${alpha}`
}

function contrastText(hex: string) {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 155 ? '#0F172A' : '#FFFFFF'
}

function formatChartDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-QA', {
    month: 'short',
    day: 'numeric',
  })
}

function themesMatch(first: VendorDashboardTheme, second: VendorDashboardTheme) {
  return (
    first.primaryColor === second.primaryColor &&
    first.accentColor === second.accentColor &&
    first.backgroundColor === second.backgroundColor &&
    first.cardColor === second.cardColor &&
    first.chartColor === second.chartColor
  )
}

function VendorDashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const vendorId = user?.uid || ''
  const [range, setRange] = useState<ChartRange>('7d')
  const [draftTheme, setDraftTheme] = useState<VendorDashboardTheme>(
    DEFAULT_VENDOR_DASHBOARD_THEME,
  )
  const [savedTheme, setSavedTheme] = useState<VendorDashboardTheme>(
    DEFAULT_VENDOR_DASHBOARD_THEME,
  )

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    ...vendorQueryOptions(vendorId),
    enabled: Boolean(vendorId),
  })
  const { data: stats, isLoading: statsLoading } = useQuery({
    ...vendorStatsQueryOptions(vendorId),
    enabled: Boolean(vendorId),
  })
  const { data: chartData = [], isLoading: chartLoading } = useQuery({
    ...vendorChartDataQueryOptions(vendorId, range),
    enabled: Boolean(vendorId),
  })
  const { data: storedTheme, isLoading: themeLoading } = useQuery(
    vendorDashboardThemeQueryOptions(vendorId),
  )

  useEffect(() => {
    if (!storedTheme) return
    setDraftTheme(storedTheme)
    setSavedTheme(storedTheme)
  }, [storedTheme])

  const saveThemeMutation = useMutation({
    mutationFn: async (theme: VendorDashboardTheme) => {
      if (!vendorId) throw new Error('Vendor account is not available.')

      await setDoc(
        doc(db, 'vendorDashboardThemes', vendorId),
        {
          ...theme,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      return theme
    },
    onSuccess: (theme) => {
      queryClient.setQueryData(['vendor-dashboard-theme', vendorId], theme)
      setSavedTheme(theme)
      setDraftTheme(theme)
      toast.success('Dashboard style saved', {
        description: 'Your vendor dashboard now uses the selected colors.',
      })
    },
    onError: (error) => {
      toast.error('Could not save dashboard style', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      })
    },
  })

  const hasUnsavedChanges = useMemo(
    () => !themesMatch(draftTheme, savedTheme),
    [draftTheme, savedTheme],
  )

  const isLoading = vendorLoading || statsLoading || chartLoading || themeLoading
  const primaryTextColor = contrastText(draftTheme.primaryColor)
  const cardBorderColor = withAlpha(draftTheme.primaryColor, 0.14)
  const hasRevenueData = chartData.some((point) => Number(point.revenue) > 0)

  const statCards = [
    {
      label: 'Total revenue',
      value: formatCurrency(stats?.totalRevenue),
      helper: 'From completed redemptions',
      icon: WalletCards,
    },
    {
      label: 'Total redemptions',
      value: String(stats?.totalRedemptions || 0),
      helper: 'Across all transactions',
      icon: ReceiptText,
    },
    {
      label: 'Active offers',
      value: String(stats?.activeOffers || 0),
      helper: 'Currently visible to students',
      icon: TicketCheck,
    },
    {
      label: 'Pending transactions',
      value: String(stats?.pendingTransactions || 0),
      helper: `${formatCurrency(stats?.totalDiscount)} total discounts`,
      icon: Clock3,
    },
  ]

  if (isLoading) {
    return (
      <div
        className="flex min-h-[calc(100vh-var(--header-height))] items-center justify-center"
        style={{ backgroundColor: DEFAULT_VENDOR_DASHBOARD_THEME.backgroundColor }}
      >
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          <span className="text-sm font-medium text-slate-600">
            Preparing your dashboard...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-[calc(100vh-var(--header-height))] p-4 transition-colors duration-300 md:p-6 lg:p-8"
      style={{ backgroundColor: draftTheme.backgroundColor }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className="relative overflow-hidden rounded-3xl border p-6 shadow-sm md:p-8"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(draftTheme.primaryColor, 0.18)}, ${withAlpha(draftTheme.accentColor, 0.11)} 55%, ${draftTheme.cardColor})`,
            borderColor: cardBorderColor,
          }}
        >
          <div
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
            style={{ backgroundColor: withAlpha(draftTheme.accentColor, 0.22) }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  borderColor: withAlpha(draftTheme.primaryColor, 0.25),
                  backgroundColor: withAlpha(draftTheme.cardColor, 0.72),
                  color: draftTheme.primaryColor,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Vendor workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Welcome back, {vendor?.name || user?.displayName || 'Vendor'}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Track performance, manage your offers, and personalize the workspace to match your brand.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/campaign"
                className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                style={{
                  backgroundColor: draftTheme.primaryColor,
                  color: primaryTextColor,
                }}
              >
                Manage offers
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/profile"
                className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
                style={{
                  backgroundColor: draftTheme.cardColor,
                  borderColor: cardBorderColor,
                }}
              >
                View profile
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, helper, icon: Icon }) => (
            <article
              key={label}
              className="rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                backgroundColor: draftTheme.cardColor,
                borderColor: cardBorderColor,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    {value}
                  </p>
                </div>
                <div
                  className="rounded-xl p-2.5"
                  style={{
                    backgroundColor: withAlpha(draftTheme.primaryColor, 0.1),
                    color: draftTheme.primaryColor,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">{helper}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          <article
            className="rounded-3xl border p-5 shadow-sm md:p-6"
            style={{
              backgroundColor: draftTheme.cardColor,
              borderColor: cardBorderColor,
            }}
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Revenue overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Completed transaction revenue over the selected period.
                </p>
              </div>
              <div
                className="inline-flex w-fit rounded-xl border p-1"
                style={{ borderColor: cardBorderColor }}
              >
                {(['7d', '30d', '90d'] as ChartRange[]).map((option) => {
                  const active = range === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRange(option)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                      style={{
                        backgroundColor: active ? draftTheme.primaryColor : 'transparent',
                        color: active ? primaryTextColor : '#64748B',
                      }}
                    >
                      {option === '7d' ? '7 days' : option === '30d' ? '30 days' : '90 days'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="h-80 w-full">
              {hasRevenueData ? (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vendorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={draftTheme.chartColor} stopOpacity={0.38} />
                      <stop offset="100%" stopColor={draftTheme.chartColor} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={formatChartDate}
                    minTickGap={24}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    width={62}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: cardBorderColor,
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                      backgroundColor: draftTheme.cardColor,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={draftTheme.chartColor}
                    strokeWidth={3}
                    fill="url(#vendorRevenueGradient)"
                    activeDot={{ r: 5, fill: draftTheme.chartColor, strokeWidth: 0 }}
                  />
                </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
                  <div className="px-6 text-center">
                    <p className="font-semibold text-slate-700">No revenue yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Revenue activity will appear here after completed redemptions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>

          <aside
            className="rounded-3xl border p-5 shadow-sm md:p-6"
            style={{
              backgroundColor: draftTheme.cardColor,
              borderColor: cardBorderColor,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="rounded-xl p-2.5"
                style={{
                  backgroundColor: withAlpha(draftTheme.primaryColor, 0.1),
                  color: draftTheme.primaryColor,
                }}
              >
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Customize dashboard</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Choose a palette or fine-tune individual colors. Changes preview instantly.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {VENDOR_DASHBOARD_PALETTES.map((palette) => {
                const active = themesMatch(draftTheme, palette.theme)
                return (
                  <button
                    key={palette.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraftTheme({ ...palette.theme })}
                    className="rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                    style={{
                      borderColor: active ? palette.theme.primaryColor : '#E2E8F0',
                      boxShadow: active
                        ? `0 0 0 2px ${withAlpha(palette.theme.primaryColor, 0.16)}`
                        : undefined,
                    }}
                  >
                    <div className="mb-3 flex gap-1.5">
                      <span
                        className="h-5 flex-1 rounded-md"
                        style={{ backgroundColor: palette.theme.primaryColor }}
                      />
                      <span
                        className="h-5 flex-1 rounded-md"
                        style={{ backgroundColor: palette.theme.accentColor }}
                      />
                      <span
                        className="h-5 flex-1 rounded-md border"
                        style={{ backgroundColor: palette.theme.backgroundColor }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{palette.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{palette.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <ColorField
                label="Primary"
                value={draftTheme.primaryColor}
                onChange={(primaryColor) =>
                  setDraftTheme((current) => ({ ...current, primaryColor }))
                }
              />
              <ColorField
                label="Accent"
                value={draftTheme.accentColor}
                onChange={(accentColor) =>
                  setDraftTheme((current) => ({ ...current, accentColor }))
                }
              />
              <ColorField
                label="Chart"
                value={draftTheme.chartColor}
                onChange={(chartColor) =>
                  setDraftTheme((current) => ({ ...current, chartColor }))
                }
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 rounded-xl"
                disabled={saveThemeMutation.isPending}
                onClick={() => {
                  setDraftTheme(DEFAULT_VENDOR_DASHBOARD_THEME)
                  saveThemeMutation.mutate(DEFAULT_VENDOR_DASHBOARD_THEME)
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset defaults
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2 rounded-xl"
                disabled={!hasUnsavedChanges || saveThemeMutation.isPending}
                onClick={() => saveThemeMutation.mutate(draftTheme)}
                style={{
                  backgroundColor: draftTheme.primaryColor,
                  color: primaryTextColor,
                }}
              >
                {saveThemeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save style
              </Button>
            </div>
          </aside>
        </section>

        <section
          className="rounded-3xl border p-5 shadow-sm md:p-6"
          style={{
            backgroundColor: draftTheme.cardColor,
            borderColor: cardBorderColor,
          }}
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className="rounded-xl p-2.5"
              style={{
                backgroundColor: withAlpha(draftTheme.accentColor, 0.12),
                color: draftTheme.primaryColor,
              }}
            >
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Quick actions</h2>
              <p className="text-sm text-slate-500">Jump to the tools you use most.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <QuickAction
              to="/campaign"
              title="Manage offers"
              description="Review active promotions and campaign details."
              icon={BadgePercent}
              color={draftTheme.primaryColor}
            />
            <QuickAction
              to="/transaction-history"
              title="Transaction history"
              description="Review recent redemptions and transaction activity."
              icon={ReceiptText}
              color={draftTheme.primaryColor}
            />
            <QuickAction
              to="/profile"
              title="Business profile"
              description="Check how your vendor information appears."
              icon={Store}
              color={draftTheme.primaryColor}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
      <span>
        <span className="block text-xs font-semibold text-slate-700">{label}</span>
        <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{value}</span>
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        className="h-9 w-11 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        aria-label={`${label} color`}
      />
    </label>
  )
}

function QuickAction({
  to,
  title,
  description,
  icon: Icon,
  color,
}: {
  to: '/campaign' | '/transaction-history' | '/profile'
  title: string
  description: string
  icon: typeof Store
  color: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <div
        className="rounded-xl p-2.5"
        style={{ backgroundColor: withAlpha(color, 0.1), color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </Link>
  )
}
