export interface BrandItem {
    id: string
    name: string
    logoUrl: string
    isActive: boolean
}

export interface BrandsConfig {
    lastUpdated: string
    brands: BrandItem[]
}
