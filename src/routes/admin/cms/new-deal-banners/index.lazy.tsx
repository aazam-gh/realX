import { createLazyFileRoute } from '@tanstack/react-router'
import { OfferBannersManagement, type OfferBannersConfig } from '../trending-offer-banners/index.lazy'

const newDealBannersConfig: OfferBannersConfig = {
    cmsDocumentId: 'new-deal-banners',
    storageFolder: 'new-deal-banners',
    itemIdPrefix: 'new_deal',
    title: 'New Deal Banners',
    sectionTitle: 'New Deals',
    itemLabel: 'New Deal Banner',
    emptyMessage: 'No new deal banners yet',
}

export const Route = createLazyFileRoute('/admin/cms/new-deal-banners/')({
    component: () => <OfferBannersManagement config={newDealBannersConfig} />,
})
