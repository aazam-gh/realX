import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ExternalLink,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Store,
  Tags,
  TicketCheck,
} from 'lucide-react'
import { useAuth } from '@/auth'
import { vendorQueryOptions } from '@/queries'
import { vendorDashboardThemeQueryOptions } from '@/lib/vendor-dashboard-theme'

export const Route = createFileRoute('/(vendor-panel)/_vendor/profile')({
  component: VendorProfile,
})

interface DetailItemProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value?: string | number | null
  href?: string
  external?: boolean
  accentColor: string
}

function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return `rgba(15, 23, 42, ${alpha})`

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function normalizeWebsite(value?: string) {
  if (!value) return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function DetailItem({
  icon: Icon,
  label,
  value,
  href,
  external = false,
  accentColor,
}: DetailItemProps) {
  const content = value || 'Not provided'

  return (
    <div className="group flex min-h-24 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: withAlpha(accentColor, 0.12),
          color: accentColor,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>

        {href && value ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="mt-1 flex items-center gap-1.5 break-words text-sm font-semibold text-slate-900 transition hover:opacity-70"
          >
            <span>{content}</span>
            {external && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
          </a>
        ) : (
          <p className={`mt-1 break-words text-sm font-semibold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
            {content}
          </p>
        )}
      </div>
    </div>
  )
}

function VendorProfile() {
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
          <span className="font-medium text-slate-600">Preparing your profile...</span>
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-8 text-center">
          <Store className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Vendor profile not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not load the business profile connected to this account.
          </p>
        </div>
      </div>
    )
  }

  const websiteHref = normalizeWebsite(vendor.website)
  const offersCount = vendor.offers?.length || 0
  const locationsCount = vendor.locations?.length || (vendor.address ? 1 : 0)
  const subcategories = Array.isArray(vendor.subcategory) ? vendor.subcategory : []
  const tags = [...(vendor.tagsEn || []), ...(vendor.tagsAr || [])]
  const statusActive = vendor.status === 'Active'

  const summaryCards = [
    {
      label: 'Active offers',
      value: offersCount,
      icon: TicketCheck,
    },
    {
      label: 'Locations',
      value: locationsCount,
      icon: MapPin,
    },
    {
      label: 'Categories',
      value: 1 + subcategories.length,
      icon: Tags,
    },
  ]

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
            background: `linear-gradient(135deg, ${withAlpha(theme.primaryColor, 0.15)} 0%, ${theme.cardColor} 62%, ${withAlpha(theme.accentColor, 0.08)} 100%)`,
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 shadow-sm"
                style={{
                  borderColor: withAlpha(theme.primaryColor, 0.18),
                  backgroundColor: theme.cardColor,
                }}
              >
                {vendor.profilePicture ? (
                  <img
                    src={vendor.profilePicture}
                    alt={vendor.name || 'Vendor logo'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-11 w-11" style={{ color: theme.primaryColor }} />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      color: theme.primaryColor,
                      backgroundColor: withAlpha(theme.primaryColor, 0.1),
                    }}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Business profile
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      statusActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {vendor.status || 'Status unavailable'}
                  </span>
                </div>

                <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {vendor.name || 'Unnamed vendor'}
                </h1>

                {vendor.nameAr && (
                  <p className="mt-1 text-lg font-medium text-slate-500" dir="rtl">
                    {vendor.nameAr}
                  </p>
                )}

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  {vendor.shortDescription ||
                    'Review how your business information appears across the RealX vendor workspace.'}
                </p>
              </div>
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
                to="/campaign"
                className="inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ borderColor: withAlpha(theme.primaryColor, 0.2) }}
              >
                Manage offers
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <article
              key={label}
              className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm"
              style={{
                backgroundColor: theme.cardColor,
                borderColor: withAlpha(theme.primaryColor, 0.14),
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: withAlpha(theme.accentColor, 0.12),
                  color: theme.primaryColor,
                }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-950">{value}</p>
                <p className="text-sm font-medium text-slate-500">{label}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <article
            className="rounded-3xl border p-5 shadow-sm md:p-6"
            style={{
              backgroundColor: theme.cardColor,
              borderColor: withAlpha(theme.primaryColor, 0.14),
            }}
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: withAlpha(theme.primaryColor, 0.1),
                  color: theme.primaryColor,
                }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Business information</h2>
                <p className="text-sm text-slate-500">Core details connected to your vendor account.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DetailItem
                icon={Store}
                label="Business name"
                value={vendor.name}
                accentColor={theme.primaryColor}
              />
              <DetailItem
                icon={Store}
                label="Arabic name"
                value={vendor.nameAr}
                accentColor={theme.primaryColor}
              />
              <DetailItem
                icon={Tags}
                label="Main category"
                value={vendor.mainCategory}
                accentColor={theme.primaryColor}
              />
              <DetailItem
                icon={Building2}
                label="Vendor type"
                value={vendor.vendorType === 'online' ? 'Online vendor' : vendor.vendorType === 'in_store' ? 'In-store vendor' : undefined}
                accentColor={theme.primaryColor}
              />
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Subcategories
              </p>
              <div className="flex flex-wrap gap-2">
                {subcategories.length > 0 ? (
                  subcategories.map((subcategory) => (
                    <span
                      key={subcategory}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        color: theme.primaryColor,
                        backgroundColor: withAlpha(theme.primaryColor, 0.1),
                      }}
                    >
                      {subcategory}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No subcategories provided.</span>
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Search tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="rounded-full border px-3 py-1.5 text-xs font-medium text-slate-600"
                      style={{ borderColor: withAlpha(theme.primaryColor, 0.16) }}
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No search tags provided.</span>
                )}
              </div>
            </div>
          </article>

          <article
            className="rounded-3xl border p-5 shadow-sm md:p-6"
            style={{
              backgroundColor: theme.cardColor,
              borderColor: withAlpha(theme.primaryColor, 0.14),
            }}
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: withAlpha(theme.accentColor, 0.12),
                  color: theme.primaryColor,
                }}
              >
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Contact and presence</h2>
                <p className="text-sm text-slate-500">How customers and RealX can reach your business.</p>
              </div>
            </div>

            <div className="space-y-3">
              <DetailItem
                icon={Mail}
                label="Email"
                value={vendor.email}
                href={vendor.email ? `mailto:${vendor.email}` : undefined}
                accentColor={theme.primaryColor}
              />
              <DetailItem
                icon={Phone}
                label="Phone"
                value={vendor.phoneNumber || vendor.contact}
                href={vendor.phoneNumber ? `tel:${vendor.phoneNumber}` : undefined}
                accentColor={theme.primaryColor}
              />
              <DetailItem
                icon={Globe2}
                label="Website"
                value={vendor.website}
                href={websiteHref}
                external
                accentColor={theme.primaryColor}
              />
              <DetailItem
                icon={MapPin}
                label="Primary address"
                value={vendor.address}
                accentColor={theme.primaryColor}
              />
            </div>
          </article>
        </section>

        {vendor.locations && vendor.locations.length > 0 && (
          <section
            className="rounded-3xl border p-5 shadow-sm md:p-6"
            style={{
              backgroundColor: theme.cardColor,
              borderColor: withAlpha(theme.primaryColor, 0.14),
            }}
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: withAlpha(theme.primaryColor, 0.1),
                  color: theme.primaryColor,
                }}
              >
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Business locations</h2>
                <p className="text-sm text-slate-500">Branches currently connected to this profile.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vendor.locations.map((location) => (
                <div
                  key={location.id}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {location.name || 'Unnamed branch'}
                      </p>
                      {location.nameAr && (
                        <p className="mt-0.5 text-sm text-slate-500" dir="rtl">
                          {location.nameAr}
                        </p>
                      )}
                    </div>
                    {location.isPrimary && (
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          color: theme.primaryColor,
                          backgroundColor: withAlpha(theme.primaryColor, 0.1),
                        }}
                      >
                        Primary
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {location.address || 'Address not provided'}
                  </p>

                  {location.phoneNumber && (
                    <a
                      href={`tel:${location.phoneNumber}`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold"
                      style={{ color: theme.primaryColor }}
                    >
                      <Phone className="h-4 w-4" />
                      {location.phoneNumber}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
