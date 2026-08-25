export interface FeaturedBrandShowcaseItem {
    id: string
    title?: string
    titleAr?: string
    imageUrl?: string
    ctaText?: string
    vendorId: string
    isActive: boolean
    order?: number
    // Legacy fields are retained only so existing Firestore documents can be read
    // and migrated when the showcase is next saved.
    orderUrl?: string
    heroImageUrl?: string
    tileImageUrls?: string[]
}

export interface FeaturedBrandShowcaseConfig {
    lastUpdated: string
    items: FeaturedBrandShowcaseItem[]
}
