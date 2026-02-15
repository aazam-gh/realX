import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
    ArrowLeft,
    Image as ImageIcon,
    Plus,
    Trash2,
    Loader2
} from 'lucide-react'
import { db, storage } from '@/firebase/config'
import {
    getDoc,
    doc,
    setDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import type { BannerItem } from '@/types/banners'

export const Route = createFileRoute('/admin/cms/banners/')({
    component: BannersManagement,
})

function BannersManagement() {
    const navigate = useNavigate()
    const [banners, setBanners] = useState<BannerItem[]>([])
    const [lastUpdated, setLastUpdated] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null) // 'mobile' | 'desktop' | null
    const [activeBannerId, setActiveBannerId] = useState<string | null>(null)
    const [pendingDeletions, setPendingDeletions] = useState<string[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)
    const desktopFileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const cmsRef = doc(db, 'cms', 'banner')
            const cmsSnap = await getDoc(cmsRef)

            if (cmsSnap.exists()) {
                const data = cmsSnap.data()
                setBanners(data.banners || [])
                setLastUpdated(data.lastUpdated || '')
            } else {
                setBanners([])
                setLastUpdated('')
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const saveBanners = async (updatedBanners: BannerItem[]) => {
        try {
            const cmsRef = doc(db, 'cms', 'banner')
            const lastUpdated = new Date().toISOString()

            await setDoc(cmsRef, {
                banners: updatedBanners,
                lastUpdated: lastUpdated
            })

            // Cleanup storage for deleted images
            if (pendingDeletions.length > 0) {
                await Promise.all(pendingDeletions.map(async (url) => {
                    try {
                        const imageRef = ref(storage, url)
                        await deleteObject(imageRef)
                    } catch (err) {
                        console.error('Failed to delete storage object:', url, err)
                    }
                }))
                setPendingDeletions([])
            }

            setLastUpdated(lastUpdated)
            setBanners(updatedBanners)
            toast.success('Banners updated successfully')
        } catch (error) {
            console.error('Error saving banners:', error)
            toast.error('Failed to save changes')
        }
    }



    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, bannerId: string, type: 'mobile' | 'desktop') => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(type)
        try {
            const storageRef = ref(storage, `banners/${type}/${Date.now()}_${file.name}`)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)

            const updatedBanners = banners.map(b => {
                if (b.bannerId === bannerId) {
                    // Track old image for deletion if it exists
                    if (b.images[type]) {
                        setPendingDeletions(prev => [...prev, b.images[type]])
                    }
                    return {
                        ...b,
                        images: {
                            ...b.images,
                            [type]: downloadURL
                        }
                    }
                }
                return b
            })

            setBanners(updatedBanners)
            toast.success(`${type} image uploaded`)
        } catch (error) {
            console.error('Error uploading image:', error)
            toast.error('Failed to upload image')
        } finally {
            setUploading(null)
        }
    }

    const handleDeleteBanner = async (bannerId: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return
        try {
            const bannerToDelete = banners.find(b => b.bannerId === bannerId)
            const remainingBanners = banners.filter(b => b.bannerId !== bannerId)

            if (bannerToDelete) {
                const urls: string[] = []
                if (bannerToDelete.images.mobile) urls.push(bannerToDelete.images.mobile)
                if (bannerToDelete.images.desktop) urls.push(bannerToDelete.images.desktop)

                // Update Firestore
                const cmsRef = doc(db, 'cms', 'banner')
                await setDoc(cmsRef, {
                    banners: remainingBanners,
                    lastUpdated: new Date().toISOString()
                })

                // Delete images
                if (urls.length > 0) {
                    await Promise.all(urls.map(async (url) => {
                        try {
                            const imageRef = ref(storage, url)
                            await deleteObject(imageRef)
                        } catch (err) {
                            console.error('Failed to delete storage object:', url, err)
                        }
                    }))
                }
            }
            setBanners(remainingBanners)
            toast.success('Banner deleted')
        } catch (error) {
            console.error('Error deleting banner:', error)
            toast.error('Failed to delete banner')
        }
    }

    const handleUpdateBanner = (bannerId: string, updates: Partial<BannerItem>) => {
        setBanners(banners.map(b => b.bannerId === bannerId ? { ...b, ...updates } : b))
    }

    const triggerUpload = (bannerId: string, type: 'mobile' | 'desktop') => {
        setActiveBannerId(bannerId)
        if (type === 'mobile') {
            fileInputRef.current?.click()
        } else {
            desktopFileInputRef.current?.click()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto font-sans bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-gray-100 hover:bg-gray-200"
                        onClick={() => navigate({ to: '/admin/cms' })}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🖼️</span>
                        <h1 className="text-3xl font-bold tracking-tight">Banner Management</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-medium">Last Updated</p>
                        <p className="text-sm font-bold text-gray-900">
                            {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
                        </p>
                    </div>
                    <Button
                        onClick={() => saveBanners(banners)}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 h-11 font-bold shadow-lg shadow-purple-200 transition-all"
                    >
                        Save All Changes
                    </Button>
                </div>
            </div>

            {/* Manage Banners Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-900">Configured Banners</h2>
                    <Link
                        to="/admin/cms/banners/add"
                        className="inline-flex items-center justify-center bg-[#F8F9F9] hover:bg-gray-100 text-gray-900 border border-gray-100 rounded-full px-6 h-11 gap-2 font-bold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 text-purple-600" />
                        Add New Banner
                    </Link>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => activeBannerId && onFileChange(e, activeBannerId, 'mobile')}
                    />
                    <input
                        type="file"
                        ref={desktopFileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => activeBannerId && onFileChange(e, activeBannerId, 'desktop')}
                    />
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {banners.map((banner, index) => (
                        <div key={banner.bannerId} className="bg-[#F8F9F9] rounded-[2.5rem] p-8 space-y-6 border border-gray-100 shadow-sm relative group overflow-hidden">
                            <div className="flex flex-col lg:flex-row gap-8">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Mobile Banner</p>
                                        <div
                                            onClick={() => triggerUpload(banner.bannerId, 'mobile')}
                                            className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden bg-white border-2 border-dashed border-gray-200 cursor-pointer hover:border-purple-400 transition-all flex flex-col items-center justify-center group/img"
                                        >
                                            {banner.images.mobile ? (
                                                <img src={banner.images.mobile} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-[10px] font-bold">Recommended: 1080x460</span>
                                                </div>
                                            )}
                                            {uploading === 'mobile' && activeBannerId === banner.bannerId && (
                                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs font-bold px-3 py-1 bg-black/50 rounded-full">Change Mobile</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Desktop Banner</p>
                                        <div
                                            onClick={() => triggerUpload(banner.bannerId, 'desktop')}
                                            className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden bg-white border-2 border-dashed border-gray-200 cursor-pointer hover:border-purple-400 transition-all flex flex-col items-center justify-center group/img"
                                        >
                                            {banner.images.desktop ? (
                                                <img src={banner.images.desktop} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-[10px] font-bold">Recommended: 1920x820</span>
                                                </div>
                                            )}
                                            {uploading === 'desktop' && activeBannerId === banner.bannerId && (
                                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs font-bold px-3 py-1 bg-black/50 rounded-full">Change Desktop</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 ml-1">Offer ID / Link Key</label>
                                            <input
                                                value={banner.offerId}
                                                onChange={(e) => handleUpdateBanner(banner.bannerId, { offerId: e.target.value })}
                                                placeholder="winter_sale_2026"
                                                className="w-full h-12 px-4 rounded-2xl bg-white border border-gray-100 font-bold text-sm text-gray-900 outline-none focus:border-purple-400 transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 ml-1">Alt Text (Accessibility)</label>
                                            <input
                                                value={banner.altText}
                                                onChange={(e) => handleUpdateBanner(banner.bannerId, { altText: e.target.value })}
                                                placeholder="50% off Winter Gear"
                                                className="w-full h-12 px-4 rounded-2xl bg-white border border-gray-100 font-medium text-sm text-gray-900 outline-none focus:border-purple-400 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleUpdateBanner(banner.bannerId, { isActive: !banner.isActive })}
                                                className={cn(
                                                    "w-14 h-7 rounded-full transition-colors relative shadow-inner",
                                                    banner.isActive ? "bg-purple-600" : "bg-gray-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-5 h-5 rounded-full bg-white transition-all transform shadow-sm",
                                                    banner.isActive ? "left-8" : "left-1"
                                                )} />
                                            </button>
                                            <span className="text-sm font-bold text-gray-600">
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = [...banners]
                                                    if (index > 0) {
                                                        const temp = updated[index]
                                                        updated[index] = updated[index - 1]
                                                        updated[index - 1] = temp
                                                        setBanners(updated)
                                                    }
                                                }}
                                                disabled={index === 0}
                                                className="rounded-xl h-10 border-gray-100 text-gray-600 font-bold text-xs"
                                            >
                                                Move Up
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = [...banners]
                                                    if (index < banners.length - 1) {
                                                        const temp = updated[index]
                                                        updated[index] = updated[index + 1]
                                                        updated[index + 1] = temp
                                                        setBanners(updated)
                                                    }
                                                }}
                                                disabled={index === banners.length - 1}
                                                className="rounded-xl h-10 border-gray-100 text-gray-600 font-bold text-xs"
                                            >
                                                Move Down
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteBanner(banner.bannerId)}
                                                className="rounded-xl h-10 border-gray-100 text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {banners.length === 0 && (
                        <div className="col-span-full py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <div className="bg-white p-4 rounded-full shadow-sm">
                                <ImageIcon className="w-10 h-10 opacity-30 text-purple-600" />
                            </div>
                            <p className="font-bold text-lg text-gray-500">No banners yet</p>
                            <p className="text-sm">Click 'Add New Banner' to create your first one.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-20" />
        </div>
    )
}
