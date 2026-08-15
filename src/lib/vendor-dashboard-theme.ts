import { queryOptions } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

export interface VendorDashboardTheme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  cardColor: string
  chartColor: string
}

export interface VendorDashboardPalette {
  name: string
  description: string
  theme: VendorDashboardTheme
}

export const DEFAULT_VENDOR_DASHBOARD_THEME: VendorDashboardTheme = {
  primaryColor: '#16A34A',
  accentColor: '#22C55E',
  backgroundColor: '#F6FBF7',
  cardColor: '#FFFFFF',
  chartColor: '#16A34A',
}

export const VENDOR_DASHBOARD_PALETTES: ReadonlyArray<VendorDashboardPalette> = [
  {
    name: 'RealX Green',
    description: 'Fresh and familiar',
    theme: DEFAULT_VENDOR_DASHBOARD_THEME,
  },
  {
    name: 'Ocean Blue',
    description: 'Clear and professional',
    theme: {
      primaryColor: '#2563EB',
      accentColor: '#0EA5E9',
      backgroundColor: '#F5F9FF',
      cardColor: '#FFFFFF',
      chartColor: '#2563EB',
    },
  },
  {
    name: 'Royal Violet',
    description: 'Bold and premium',
    theme: {
      primaryColor: '#7C3AED',
      accentColor: '#A855F7',
      backgroundColor: '#FAF7FF',
      cardColor: '#FFFFFF',
      chartColor: '#7C3AED',
    },
  },
  {
    name: 'Sunset Orange',
    description: 'Warm and energetic',
    theme: {
      primaryColor: '#EA580C',
      accentColor: '#F59E0B',
      backgroundColor: '#FFF8F2',
      cardColor: '#FFFFFF',
      chartColor: '#EA580C',
    },
  },
  {
    name: 'Rose',
    description: 'Modern and expressive',
    theme: {
      primaryColor: '#E11D48',
      accentColor: '#FB7185',
      backgroundColor: '#FFF7F8',
      cardColor: '#FFFFFF',
      chartColor: '#E11D48',
    },
  },
  {
    name: 'Slate',
    description: 'Neutral and focused',
    theme: {
      primaryColor: '#334155',
      accentColor: '#64748B',
      backgroundColor: '#F8FAFC',
      cardColor: '#FFFFFF',
      chartColor: '#475569',
    },
  },
]

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value)
}

function normalizeTheme(data: Partial<VendorDashboardTheme>): VendorDashboardTheme {
  return {
    primaryColor: isHexColor(data.primaryColor)
      ? data.primaryColor.toUpperCase()
      : DEFAULT_VENDOR_DASHBOARD_THEME.primaryColor,
    accentColor: isHexColor(data.accentColor)
      ? data.accentColor.toUpperCase()
      : DEFAULT_VENDOR_DASHBOARD_THEME.accentColor,
    backgroundColor: isHexColor(data.backgroundColor)
      ? data.backgroundColor.toUpperCase()
      : DEFAULT_VENDOR_DASHBOARD_THEME.backgroundColor,
    cardColor: isHexColor(data.cardColor)
      ? data.cardColor.toUpperCase()
      : DEFAULT_VENDOR_DASHBOARD_THEME.cardColor,
    chartColor: isHexColor(data.chartColor)
      ? data.chartColor.toUpperCase()
      : DEFAULT_VENDOR_DASHBOARD_THEME.chartColor,
  }
}

export const vendorDashboardThemeQueryOptions = (vendorId: string) =>
  queryOptions({
    queryKey: ['vendor-dashboard-theme', vendorId],
    queryFn: async () => {
      if (!vendorId) return DEFAULT_VENDOR_DASHBOARD_THEME

      const snapshot = await getDoc(doc(db, 'vendorDashboardThemes', vendorId))
      if (!snapshot.exists()) return DEFAULT_VENDOR_DASHBOARD_THEME

      return normalizeTheme(snapshot.data() as Partial<VendorDashboardTheme>)
    },
    enabled: Boolean(vendorId),
    staleTime: 5 * 60 * 1000,
  })
