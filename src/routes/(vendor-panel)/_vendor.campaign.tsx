import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  BadgePercent,
  Gift,
  Loader2,
  Sparkles,
  Store,
  TicketCheck,
} from 'lucide-react'
import { useAuth } from '@/auth'
import { vendorQueryOptions, type EmbeddedOffer } from '@/queries'
import { vendorDashboardThemeQueryOptions } from '@/lib/vendor-dashboard-theme'

export const Route = createFileRoute('/(vendor-panel)/_vendor/campaign')({
  component: VendorCampaign,
})

function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return `rgba(15, 23, 42, ${alpha})`

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function formatDiscount(offer: EmbeddedOffer) {
  switch (offer.discountType) {
    case 'buy1get1':
      return 'Buy 1 Get 1'
    case 'percentage':
      return `${offer.discountValue || 0}% OFF`
    case 'amount':
      return `QAR ${offer.discountValue || 0} OFF`
    default:
      return 'Special offer'
  }
}

function VendorCampaign() {
  const { user } = useAuth()
  const vendorId = user?.uid || ''

  const { data: vendor, isLoading: vendorLoading } = useQuery(vendorQueryOptions(vendorId))
  const { data: theme, isLoading: themeLoading } = useQuery(
    vendorDashboardThemeQueryOptions(vendorId),
  )

  if (vendorLoading || themeLoading || !theme) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          <span className="font-medium text-slate-600">Preparing your campaigns...</span>
        </div>
      </div>
    )
  }

  const offers = vendor?.offers || []

  return (
    <main
      className="min-h-full px-4 py-5 transition-colors md:px-6 md:py-7 lg:px-8"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className="overflow-hidden rounded-3xl border p-5 shadow-sm md:p-7"
          style={{
            borderColor: withAlpha(theme.primaryColor, 0.16),
            background: `linear-gradient(135deg, ${withAlpha(theme.primaryColor, 0.16)} 0%, ${theme.cardColor} 64%, ${withAlpha(theme.accentColor, 0.09)} 100%)`,
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  color: theme.primaryColor,
                  backgroundColor: withAlpha(theme.primaryColor, 0.1),
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Vendor campaigns
              </span>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Offers & campaigns
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Review the promotions currently connected to your business and see how
                each offer is presented to students.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Dashboard
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <Link
                to="/profile"
                className="inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ borderColor: withAlpha(theme.primaryColor, 0.2) }}
              >
                View profile
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article
            className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm"
            style={{
              backgroundColor: theme.cardColor,
              borderColor: withAlpha(theme.primaryColor, 0.14),
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: withAlpha(theme.accentColor, 0.13),
                color: theme.primaryColor,
              }}
            >
              <TicketCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-950">{offers.length}</p>
              <p className="text-sm font-medium text-slate-500">Published offers</p>
            </div>
          </article>

          <article
            className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm"
            style={{
              backgroundColor: theme.cardColor,
              borderColor: withAlpha(theme.primaryColor, 0.14),
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: withAlpha(theme.primaryColor, 0.11),
                color: theme.primaryColor,
              }}
            >
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="truncate text-lg font-black text-slate-950">
                {vendor?.name || 'Your business'}
              </p>
              <p className="text-sm font-medium text-slate-500">Campaign owner</p>
            </div>
          </article>
        </section>

        <section
          className="rounded-3xl border p-5 shadow-sm md:p-6"
          style={{
            backgroundColor: theme.cardColor,
            borderColor: withAlpha(theme.primaryColor, 0.14),
          }}
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Current offers
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                All promotions currently visible from your vendor account.
              </p>
            </div>

            {offers.length > 0 && (
              <span
                className="w-fit rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  color: theme.primaryColor,
                  backgroundColor: withAlpha(theme.primaryColor, 0.1),
                }}
              >
                {offers.length} {offers.length === 1 ? 'offer' : 'offers'}
              </span>
            )}
          </div>

          {offers.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer, index) => (
                <article
                  key={`${offer.titleEn || 'offer'}-${index}`}
                  className="group relative overflow-hidden rounded-3xl border p-5 transition hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    borderColor: withAlpha(theme.primaryColor, 0.16),
                    background: `linear-gradient(145deg, ${theme.cardColor} 30%, ${withAlpha(theme.accentColor, 0.08)} 100%)`,
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundColor: theme.primaryColor }}
                  />

                  <div className="flex items-start justify-between gap-4 pt-1">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: withAlpha(theme.primaryColor, 0.11),
                        color: theme.primaryColor,
                      }}
                    >
                      {offer.discountType === 'buy1get1' ? (
                        <Gift className="h-6 w-6" />
                      ) : (
                        <BadgePercent className="h-6 w-6" />
                      )}
                    </div>

                    <span
                      className="rounded-full px-3 py-1.5 text-xs font-bold"
                      style={{
                        color: theme.primaryColor,
                        backgroundColor: withAlpha(theme.primaryColor, 0.11),
                      }}
                    >
                      {formatDiscount(offer)}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h3 className="break-words text-xl font-black text-slate-950">
                      {offer.titleEn || 'Untitled offer'}
                    </h3>

                    {offer.titleAr && (
                      <p className="mt-1 text-sm font-semibold text-slate-500" dir="rtl">
                        {offer.titleAr}
                      </p>
                    )}

                    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                      {offer.descriptionEn || 'No description has been provided for this offer.'}
                    </p>

                    {offer.descriptionAr && (
                      <p className="mt-2 text-sm leading-6 text-slate-500" dir="rtl">
                        {offer.descriptionAr}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-200/70 pt-4">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                      Visible to students
                    </span>

                    <span
                      className="text-xs font-bold"
                      style={{ color: theme.primaryColor }}
                    >
                      Offer #{index + 1}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div
              className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed px-6 py-12 text-center"
              style={{
                borderColor: withAlpha(theme.primaryColor, 0.22),
                backgroundColor: withAlpha(theme.primaryColor, 0.035),
              }}
            >
              <div className="max-w-md">
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl"
                  style={{
                    color: theme.primaryColor,
                    backgroundColor: withAlpha(theme.primaryColor, 0.11),
                  }}
                >
                  <Gift className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-950">
                  No campaigns yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Offers added to your vendor account will appear here with their
                  student-facing titles, descriptions, and discount details.
                </p>

                <Link
                  to="/dashboard"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Return to dashboard
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
