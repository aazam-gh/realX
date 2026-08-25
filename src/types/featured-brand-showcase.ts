export interface FeaturedBrandShowcaseItem {
    id: string
    title?: string
    titleAr?: string
    imageUrl?: string
    imagePositionY?: number
    ctaText?: string
    vendorId: string
    isActive: boolean
    order?: number
}

export interface FeaturedBrandShowcaseConfig {
    lastUpdated: string
    items: FeaturedBrandShowcaseItem[]
}
