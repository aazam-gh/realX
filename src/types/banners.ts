export interface BannerImage {
    mobile: string
    desktop: string
}

export interface BannerItem {
    bannerId: string
    offerId: string
    images: BannerImage
    altText: string
    isActive: boolean
}

export interface BannersConfig {
    lastUpdated: string
    banners: BannerItem[]
}
