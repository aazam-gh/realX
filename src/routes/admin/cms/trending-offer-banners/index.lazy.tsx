import { useEffect, useRef, useState } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Flame,
    Image as ImageIcon,
    Loader2,
    Plus,
    Trash2,
} from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { db, storage } from '@/firebase/config'
import { getVendorList, type VendorOption } from '@/lib/vendorList'
import { uploadImage } from '@/lib/upload'
import { cn } from '@/lib/utils'
import type { TrendingOfferBannerItem, TrendingOfferBannersConfig } from '@/types/trending-offer-banners'

const MAX_ITEMS = 10

export const Route = createLazyFileRoute('/admin/cms/trending-offer-banners/')({
    component: () => <OfferBannersManagement config={trendingOfferBannersConfig} />,
})

export type OfferBannersConfig = {
    cmsDocumentId: string
    storageFolder: string
    itemIdPrefix: string
    title: string
    sectionTitle: string
    itemLabel: string
    emptyMessage: string
}

export const trendingOfferBannersConfig: OfferBannersConfig = {
    cmsDocumentId: 'trending-offer-banners',
    storageFolder: 'trending-offer-banners',
    itemIdPrefix: 'trending_offer',
    title: 'Trending Offer Banners',
    sectionTitle: 'Next App Trending Banners',
    itemLabel: 'Trending Banner',
    emptyMessage: 'No trending offer banners yet',
}

function createEmptyItem(itemIdPrefix: string): TrendingOfferBannerItem {
    return {
        trendingOfferBannerId: `${itemIdPrefix}_${Math.random().toString(36).slice(2, 11)}`,
        vendorId: '',
        images: {
            mobile: '',
        },
        altText: '',
        isActive: true,
    }
}

export function OfferBannersManagement({ config }: { config: OfferBannersConfig }) {
    const { cmsDocumentId, storageFolder, itemIdPrefix, title, sectionTitle, itemLabel, emptyMessage } = config
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [items, setItems] = useState<TrendingOfferBannerItem[]>([])
    const [vendors, setVendors] = useState<VendorOption[]>([])
    const [lastUpdated, setLastUpdated] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
    const [activeItemId, setActiveItemId] = useState<string | null>(null)
    const [pendingDeletions, setPendingDeletions] = useState<string[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [cmsSnap, vendorOptions] = await Promise.all([
                getDoc(doc(db, 'cms', cmsDocumentId)),
                getVendorList(),
            ])

            if (cmsSnap.exists()) {
                const data = cmsSnap.data() as TrendingOfferBannersConfig
                setItems(data.items || [])
                setLastUpdated(data.lastUpdated || '')
            } else {
                setItems([])
                setLastUpdated('')
            }

            setVendors(vendorOptions)
        } catch (error) {
            console.error(`Error fetching ${title.toLowerCase()}:`, error)
            toast.error(`Failed to load ${title.toLowerCase()}`)
        } finally {
            setLoading(false)
        }
    }

    const saveItems = async () => {
        setSaving(true)
        try {
            const now = new Date().toISOString()

            await setDoc(doc(db, 'cms', cmsDocumentId), {
                items,
                lastUpdated: now,
            })

            if (pendingDeletions.length > 0) {
                await Promise.all(pendingDeletions.map(async (url) => {
                    try {
                        await deleteObject(ref(storage, url))
                    } catch (error) {
                        console.error('Failed to delete storage object:', url, error)
                    }
                }))
                setPendingDeletions([])
            }

            setLastUpdated(now)
            toast.success(`${title} saved`)
        } catch (error) {
            console.error('Error saving trending offer banners:', error)
            toast.error('Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const addItem = () => {
        if (items.length >= MAX_ITEMS) {
            toast.error(`Maximum ${MAX_ITEMS} ${itemLabel.toLowerCase()}s can be configured`)
            return
        }

        setItems(prev => [...prev, createEmptyItem(itemIdPrefix)])
    }

    const updateItem = (itemId: string, updates: Partial<TrendingOfferBannerItem>) => {
        setItems(prev => prev.map(item => item.trendingOfferBannerId === itemId ? { ...item, ...updates } : item))
    }

    const triggerUpload = (itemId: string) => {
        setActiveItemId(itemId)
        fileInputRef.current?.click()
    }

    const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        const itemId = activeItemId
        event.target.value = ''

        if (!file || !itemId) return

        setUploadingItemId(itemId)
        try {
            const downloadURL = await uploadImage(
                `${storageFolder}/mobile/${Date.now()}_${file.name}`,
                file,
                { maxWidth: 1920, quality: 0.8 },
            )

            setItems(prev => prev.map(item => {
                if (item.trendingOfferBannerId !== itemId) return item

                if (item.images.mobile) {
                    setPendingDeletions(deletions => [...deletions, item.images.mobile])
                }

                return {
                    ...item,
                    images: {
                        ...item.images,
                        mobile: downloadURL,
                    },
                }
            }))
            toast.success('Banner image uploaded')
        } catch (error) {
            console.error(`Error uploading ${itemLabel.toLowerCase()}:`, error)
            toast.error('Failed to upload image')
        } finally {
            setUploadingItemId(null)
        }
    }

    const deleteItem = async (itemId: string) => {
        if (!confirm(`Are you sure you want to delete this ${itemLabel.toLowerCase()}?`)) return

        const itemToDelete = items.find(item => item.trendingOfferBannerId === itemId)
        setItems(prev => prev.filter(item => item.trendingOfferBannerId !== itemId))

        if (itemToDelete?.images.mobile) {
            setPendingDeletions(prev => [...prev, itemToDelete.images.mobile])
        }
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= items.length) return

        const updated = [...items]
        const current = updated[index]
        updated[index] = updated[targetIndex]
        updated[targetIndex] = current
        setItems(updated)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto font-sans bg-white min-h-screen">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl bg-gray-100 hover:bg-gray-200"
                        onClick={() => navigate({ to: '/admin/cms' })}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center">
                            <Flame className="w-5 h-5 fill-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                            <p className="text-xs text-gray-500 font-medium">{items.length}/{MAX_ITEMS} configured for the next app version</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 font-medium">Last Updated</p>
                        <p className="text-sm font-bold text-gray-900">
                            {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
                        </p>
                    </div>
                    <Button
                        onClick={saveItems}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 h-10 font-bold shadow-md shadow-purple-200 transition-all"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Save All Changes
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{sectionTitle}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        This writes to cms/{cmsDocumentId}; the mobile app reads this document when configured.
                    </p>
                </div>
                <Button
                    onClick={addItem}
                    disabled={items.length >= MAX_ITEMS}
                    className="inline-flex items-center justify-center bg-[#F8F9F9] hover:bg-gray-100 text-gray-900 border border-gray-100 rounded-xl px-5 h-10 gap-2 font-bold text-sm shadow-sm transition-all disabled:opacity-40"
                >
                    <Plus className="w-4 h-4 text-orange-500" />
                    Add Banner
                </Button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={onFileChange}
                />
            </div>

            <div className="grid grid-cols-1 gap-6">
                {items.map((item, index) => {
                    const linkedVendorName = vendors.find(vendor => vendor.id === item.vendorId)?.name

                    return (
                        <div key={item.trendingOfferBannerId} className="bg-[#F8F9F9] rounded-2xl p-6 space-y-5 border border-gray-100 shadow-sm relative group">
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-1.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Custom {itemLabel}</p>
                                    <div
                                        onClick={() => triggerUpload(item.trendingOfferBannerId)}
                                        className="relative w-full aspect-[21/9] rounded-xl overflow-hidden bg-white border-2 border-dashed border-gray-200 cursor-pointer hover:border-orange-300 transition-all flex flex-col items-center justify-center group/img"
                                    >
                                        {item.images.mobile ? (
                                            <img src={item.images.mobile} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <ImageIcon className="w-8 h-8" />
                                                <span className="text-[10px] font-bold">Recommended: 1080x460</span>
                                            </div>
                                        )}
                                        {uploadingItemId === item.trendingOfferBannerId && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-bold px-3 py-1.5 bg-black/50 rounded-xl">Change Image</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Vendor</label>
                                            <select
                                                value={item.vendorId}
                                                onChange={(event) => updateItem(item.trendingOfferBannerId, { vendorId: event.target.value })}
                                                className="w-full h-11 px-4 rounded-xl bg-white border border-gray-100 font-bold text-sm text-gray-900 outline-none focus:border-orange-300 transition-all shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="">- Select vendor -</option>
                                                {vendors.map(vendor => (
                                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                                ))}
                                            </select>
                                            {item.vendorId && (
                                                <p className="text-xs text-orange-500 font-medium ml-1">
                                                    Linked vendorId: {item.vendorId}{linkedVendorName ? ` (${linkedVendorName})` : ''}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Alt Text</label>
                                            <input
                                                value={item.altText}
                                                onChange={(event) => updateItem(item.trendingOfferBannerId, { altText: event.target.value })}
                                                placeholder={`Custom ${itemLabel.toLowerCase()}`}
                                                className="w-full h-11 px-4 rounded-xl bg-white border border-gray-100 font-medium text-sm text-gray-900 outline-none focus:border-orange-300 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200/60">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateItem(item.trendingOfferBannerId, { isActive: !item.isActive })}
                                                className={cn(
                                                    'w-11 h-6 rounded-full transition-colors relative shadow-inner',
                                                    item.isActive ? 'bg-orange-500' : 'bg-gray-200',
                                                )}
                                            >
                                                <div className={cn(
                                                    'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all transform shadow-sm',
                                                    item.isActive ? 'left-5.5' : 'left-0.5',
                                                )} />
                                            </button>
                                            <span className="text-xs font-bold text-gray-500">
                                                {item.isActive ? 'Active in new app' : 'Inactive'}
                                            </span>
                                        </div>

                                        <div className="flex gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => moveItem(index, 'up')}
                                                disabled={index === 0}
                                                className="rounded-xl h-9 w-9 border-gray-100 bg-white text-gray-500 hover:text-orange-500 hover:bg-orange-50"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => moveItem(index, 'down')}
                                                disabled={index === items.length - 1}
                                                className="rounded-xl h-9 w-9 border-gray-100 bg-white text-gray-500 hover:text-orange-500 hover:bg-orange-50"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => deleteItem(item.trendingOfferBannerId)}
                                                className="rounded-xl h-9 w-9 border-gray-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {items.length === 0 && (
                    <div className="py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-3">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <Flame className="w-10 h-10 opacity-30 text-orange-500" />
                        </div>
                        <p className="font-bold text-lg text-gray-500">{emptyMessage}</p>
                        <p className="text-sm">Add a vendor-linked banner for the next app version.</p>
                    </div>
                )}
            </div>

            <div className="h-20" />
        </div>
    )
}
