import { useEffect, useState } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
    ArrowLeft,
    ArrowDown,
    ArrowUp,
    Image as ImageIcon,
    Loader2,
    Save,
    Sparkles,
    Upload
} from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { uploadImage } from '@/lib/upload'
import { getVendorList, type VendorOption } from '@/lib/vendorList'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type {
    FeaturedBrandShowcaseConfig,
    FeaturedBrandShowcaseItem
} from '@/types/featured-brand-showcase'

const CMS_DOC_ID = 'featuredBrandShowcase'

type UploadSlot = 'image'

function clampImagePositionY(value: number | undefined) {
    if (!Number.isFinite(value)) return 50
    return Math.min(100, Math.max(0, Number(value)))
}

export const Route = createLazyFileRoute('/admin/cms/featured-brand-showcase/')({
    component: FeaturedBrandShowcaseManagement,
})

function createEmptyItem(): FeaturedBrandShowcaseItem {
    return {
        id: `showcase_${Math.random().toString(36).slice(2, 11)}`,
        title: '',
        titleAr: '',
        vendorId: '',
        isActive: true,
        imageUrl: '',
        imagePositionY: 50,
        ctaText: '',
        order: 0,
    }
}

function normalizeItem(item: FeaturedBrandShowcaseItem): FeaturedBrandShowcaseItem {
    return {
        id: item.id || createEmptyItem().id,
        title: item.title || '',
        titleAr: item.titleAr || '',
        imageUrl: item.imageUrl || '',
        imagePositionY: clampImagePositionY(item.imagePositionY),
        ctaText: item.ctaText || '',
        vendorId: item.vendorId || '',
        isActive: item.isActive !== false,
        order: item.order ?? 0,
    }
}

function FeaturedBrandShowcaseManagement() {
    const navigate = useNavigate()
    const [items, setItems] = useState<FeaturedBrandShowcaseItem[]>([])
    const [selectedId, setSelectedId] = useState('')
    const [lastUpdated, setLastUpdated] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingSlot, setUploadingSlot] = useState<UploadSlot | null>(null)
    const [vendors, setVendors] = useState<VendorOption[]>([])

    useEffect(() => {
        fetchData()
        getVendorList().then(setVendors).catch(error => console.error('Error fetching vendor list:', error))
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const cmsRef = doc(db, 'cms', CMS_DOC_ID)
            const cmsSnap = await getDoc(cmsRef)

            if (cmsSnap.exists()) {
                const data = cmsSnap.data() as FeaturedBrandShowcaseConfig
                const normalizedItems = (data.items || []).map(normalizeItem).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                const nextItems = normalizedItems.length > 0 ? normalizedItems : [createEmptyItem()]
                setItems(nextItems)
                setSelectedId(nextItems[0].id)
                setLastUpdated(data.lastUpdated || '')
            } else {
                const emptyItem = createEmptyItem()
                setItems([emptyItem])
                setSelectedId(emptyItem.id)
                setLastUpdated('')
            }
        } catch (error) {
            console.error('Error fetching featured brand showcase:', error)
            toast.error('Failed to load showcase')
        } finally {
            setLoading(false)
        }
    }

    const item = items.find((candidate) => candidate.id === selectedId) || items[0] || createEmptyItem()

    const updateItem = (updates: Partial<FeaturedBrandShowcaseItem>) => {
        setItems(prev => prev.map(candidate => candidate.id === item.id ? { ...candidate, ...updates } : candidate))
    }

    const handleUpload = async (
        event: React.ChangeEvent<HTMLInputElement>,
        slot: UploadSlot,
    ) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        setUploadingSlot(slot)
        try {
            const timestamp = Date.now()
            const downloadURL = await uploadImage(
                `featured-brand-showcase/${item.id}/image/${timestamp}_${file.name}`,
                file,
                { maxWidth: 1920, quality: 0.8 }
            )

            updateItem({ imageUrl: downloadURL })

            toast.success('Image uploaded')
        } catch (error) {
            console.error('Error uploading showcase image:', error)
            toast.error('Failed to upload image')
        } finally {
            setUploadingSlot(null)
        }
    }

    const validateItem = (draft: FeaturedBrandShowcaseItem) => {
        const trimmedVendorId = draft.vendorId.trim()

        if (!trimmedVendorId) return 'Partner vendor is required'
        if (!draft.imageUrl) return 'Banner image is required'

        return null
    }

    const saveShowcase = async () => {
        const validationError = items.map(validateItem).find(Boolean)
        if (validationError) {
            toast.error(validationError)
            return
        }

        setSaving(true)
        try {
            const now = new Date().toISOString()
            const cleanedItems = items.map((currentItem, index) => {
                return {
                id: currentItem.id,
                title: currentItem.title?.trim() || '',
                titleAr: currentItem.titleAr?.trim() || '',
                imageUrl: currentItem.imageUrl || '',
                imagePositionY: clampImagePositionY(currentItem.imagePositionY),
                ctaText: currentItem.ctaText?.trim() || '',
                vendorId: currentItem.vendorId?.trim() || '',
                isActive: true,
                order: Number.isFinite(Number(currentItem.order)) ? Number(currentItem.order) : index,
                }
            })

            await setDoc(doc(db, 'cms', CMS_DOC_ID), {
                items: cleanedItems,
                lastUpdated: now,
            } satisfies FeaturedBrandShowcaseConfig)

            setItems(cleanedItems)
            setLastUpdated(now)
            toast.success('Featured brand showcase saved')
        } catch (error) {
            console.error('Error saving featured brand showcase:', error)
            toast.error('Failed to save showcase')
        } finally {
            setSaving(false)
        }
    }

    const uploadInProgress = uploadingSlot !== null

    const addItem = () => {
        const newItem = createEmptyItem()
        newItem.order = items.length
        setItems(prev => [...prev, newItem])
        setSelectedId(newItem.id)
    }

    const deleteItem = () => {
        if (items.length === 1) {
            toast.error('Keep at least one showcase item')
            return
        }
        const remaining = items.filter(candidate => candidate.id !== item.id)
        setItems(remaining)
        setSelectedId(remaining[0].id)
    }

    const moveItem = (direction: -1 | 1) => {
        const index = items.findIndex(candidate => candidate.id === item.id)
        const nextIndex = index + direction
        if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return
        const nextItems = [...items]
        const [moved] = nextItems.splice(index, 1)
        nextItems.splice(nextIndex, 0, moved)
        setItems(nextItems.map((candidate, order) => ({ ...candidate, order })))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto font-sans bg-white min-h-screen">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={addItem}
                        className="rounded-xl px-4 h-10 font-bold"
                    >
                        Add Partner Banner
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl bg-gray-100 hover:bg-gray-200"
                        onClick={() => navigate({ to: '/admin/cms' })}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Featured Brand Showcase</h1>
                <p className="text-xs text-gray-500 font-medium">
                                Partner banner content shown in the mobile app
                            </p>
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
                        onClick={saveShowcase}
                        disabled={saving || uploadInProgress}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 h-10 font-bold shadow-md shadow-purple-200 transition-all"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {items.map((candidate, index) => (
                    <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setSelectedId(candidate.id)}
                        className={cn('rounded-xl border px-4 py-2 text-left text-sm font-bold transition-colors', selectedId === candidate.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600')}
                    >
                        {index + 1}. {candidate.title || 'Untitled partner'}
                    </button>
                ))}
                <Button variant="ghost" onClick={deleteItem} className="text-red-500">Delete selected</Button>
                <Button variant="ghost" size="icon" onClick={() => moveItem(-1)} disabled={items.findIndex(candidate => candidate.id === item.id) <= 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => moveItem(1)} disabled={items.findIndex(candidate => candidate.id === item.id) === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-6">
                <section className="bg-[#F8F9F9] rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-200/70 pb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Banner Image</h2>
                            <p className="text-sm text-gray-500">Upload the single image used for this partner banner.</p>
                        </div>
                    </div>

                    <ImageUploadSlot
                        label="Banner Image"
                        imageUrl={item.imageUrl || ''}
                        imagePositionY={item.imagePositionY}
                        aspectClass="aspect-[3.6/1]"
                        uploading={uploadingSlot === 'image'}
                        disabled={uploadInProgress}
                        onChange={(event) => handleUpload(event, 'image')}
                    />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <label htmlFor="featured-banner-image-position" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                Mobile crop position
                            </label>
                            <span className="text-xs font-bold text-gray-500">
                                {Math.round(clampImagePositionY(item.imagePositionY))}%
                            </span>
                        </div>
                        <input
                            id="featured-banner-image-position"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={clampImagePositionY(item.imagePositionY)}
                            onChange={(event) => updateItem({ imagePositionY: Number(event.target.value) })}
                            className="w-full accent-purple-600"
                            aria-label="Mobile crop vertical position"
                        />
                        <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                            <span>Top</span>
                            <span>Center</span>
                            <span>Bottom</span>
                        </div>
                    </div>
                </section>

                <section className="bg-[#F8F9F9] rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                    <div className="border-b border-gray-200/70 pb-4">
                        <h2 className="text-lg font-bold text-gray-900">Banner Details</h2>
                        <p className="text-sm text-gray-500">Only the content and linked vendor are needed for this mobile banner.</p>
                    </div>

                    <Field label="Name (English)">
                        <input
                            value={item.title || ''}
                            onChange={(event) => updateItem({ title: event.target.value })}
                            placeholder="OMARA APPAREL"
                            className="w-full h-11 px-4 rounded-xl bg-white border border-gray-100 font-bold text-sm text-gray-900 outline-none focus:border-purple-400 transition-all shadow-sm"
                        />
                    </Field>

                    <Field label="Name (Arabic)">
                        <input
                            dir="rtl"
                            value={item.titleAr || ''}
                            onChange={(event) => updateItem({ titleAr: event.target.value })}
                            placeholder="اومارا للملابس"
                            className="w-full h-11 px-4 rounded-xl bg-white border border-gray-100 font-bold text-sm text-gray-900 outline-none focus:border-purple-400 transition-all shadow-sm text-right"
                        />
                    </Field>

                    <Field label="Linked Vendor">
                        <select
                            value={item.vendorId || ''}
                            onChange={(event) => updateItem({ vendorId: event.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-white border border-gray-100 font-medium text-sm text-gray-900 outline-none focus:border-purple-400 transition-all shadow-sm"
                        >
                            <option value="">Select a vendor</option>
                            {vendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Button Text">
                        <input
                            value={item.ctaText || ''}
                            onChange={(event) => updateItem({ ctaText: event.target.value })}
                            placeholder="Shop Now"
                            className="w-full h-11 px-4 rounded-xl bg-white border border-gray-100 font-medium text-sm text-gray-900 outline-none focus:border-purple-400 transition-all shadow-sm"
                        />
                    </Field>

                </section>
            </div>

            <div className="h-20" />
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
            {children}
        </div>
    )
}

function ImageUploadSlot({
    label,
    imageUrl,
    imagePositionY,
    aspectClass,
    uploading,
    disabled,
    onChange,
}: {
    label: string
    imageUrl: string
    imagePositionY?: number
    aspectClass: string
    uploading: boolean
    disabled: boolean
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
    return (
        <label className="block space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</span>
            <span className={cn(
                'relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-white transition-all hover:border-purple-400',
                aspectClass
            )}>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onChange}
                    disabled={disabled}
                />
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ objectPosition: `50% ${clampImagePositionY(imagePositionY)}%` }}
                        loading="lazy"
                    />
                ) : (
                    <span className="flex flex-col items-center gap-2 text-gray-400">
                        <ImageIcon className="h-8 w-8 opacity-40" />
                        <span className="text-xs font-bold">Upload image</span>
                    </span>
                )}
                {uploading && (
                    <span className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </span>
                )}
                <span className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="inline-flex items-center gap-2 text-white text-xs font-bold px-3 py-1.5 bg-black/50 rounded-xl">
                        <Upload className="w-3.5 h-3.5" />
                        Change Image
                    </span>
                </span>
            </span>
        </label>
    )
}
