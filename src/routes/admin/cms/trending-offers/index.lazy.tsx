import { useState, useEffect } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
    ArrowLeft,
    Loader2,
    MoveUp,
    MoveDown,
    Flame,
    Check,
    X
} from 'lucide-react'
import { db } from '@/firebase/config'
import {
    getDoc,
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Vendor } from '@/queries'
import type { TrendingOffersConfig } from '@/types/trending-offers'

const MAX_SELECTED = 10

export const Route = createLazyFileRoute('/admin/cms/trending-offers/')({
    component: TrendingOffersManagement,
})

function TrendingOffersManagement() {
    const navigate = useNavigate()
    const [trendingVendors, setTrendingVendors] = useState<Vendor[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [lastUpdated, setLastUpdated] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch current CMS config
            const cmsRef = doc(db, 'cms', 'trending-offers')
            const cmsSnap = await getDoc(cmsRef)
            let currentIds: string[] = []

            if (cmsSnap.exists()) {
                const data = cmsSnap.data() as TrendingOffersConfig
                currentIds = data.vendorIds || []
                setLastUpdated(data.lastUpdated || '')
            }

            // 2. Fetch all vendors marked as trending
            const vendorsRef = collection(db, 'vendors')
            const q = query(vendorsRef, where('isTrending', '==', true))
            const querySnapshot = await getDocs(q)
            const vendors: Vendor[] = []
            querySnapshot.forEach((docSnap) => {
                vendors.push({ id: docSnap.id, ...docSnap.data() } as Vendor)
            })

            setTrendingVendors(vendors)

            // 3. Filter currentIds to only include those that still exist as trending
            const validIds = currentIds.filter(id => vendors.some(v => v.id === id))
            setSelectedIds(validIds)

        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load trending vendors')
        } finally {
            setLoading(false)
        }
    }

    const saveSelection = async () => {
        setSaving(true)
        try {
            const cmsRef = doc(db, 'cms', 'trending-offers')
            const now = new Date().toISOString()

            await setDoc(cmsRef, {
                vendorIds: selectedIds,
                lastUpdated: now
            })

            setLastUpdated(now)
            toast.success('Trending vendors selection saved')
        } catch (error) {
            console.error('Error saving selection:', error)
            toast.error('Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const toggleVendor = (vendorId: string) => {
        setSelectedIds(prev => {
            if (prev.includes(vendorId)) {
                return prev.filter(id => id !== vendorId)
            }
            if (prev.length >= MAX_SELECTED) {
                toast.error(`Maximum ${MAX_SELECTED} vendors can be selected`)
                return prev
            }
            return [...prev, vendorId]
        })
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newIds = [...selectedIds]
        const targetIndex = direction === 'up' ? index - 1 : index + 1

        if (targetIndex < 0 || targetIndex >= newIds.length) return

        const temp = newIds[index]
        newIds[index] = newIds[targetIndex]
        newIds[targetIndex] = temp
        setSelectedIds(newIds)
    }

    // Get selected vendor objects in order
    const selectedVendors = selectedIds
        .map(id => trendingVendors.find(v => v.id === id))
        .filter((v): v is Vendor => !!v)

    // Get unselected vendor objects
    const unselectedVendors = trendingVendors
        .filter(v => !selectedIds.includes(v.id))

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
                        className="rounded-full bg-gray-100 hover:bg-gray-200"
                        onClick={() => navigate({ to: '/admin/cms' })}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center">
                            <Flame className="w-5 h-5 fill-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Trending Vendors</h1>
                            <p className="text-xs text-gray-500 font-medium">
                                {selectedVendors.length}/{MAX_SELECTED} selected
                            </p>
                        </div>
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
                        onClick={saveSelection}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 h-11 font-bold shadow-lg shadow-purple-200 transition-all"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Save All Changes
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Selected vendors section */}
                <div className="flex flex-col gap-2 border-b pb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900">Selected Vendors</h2>
                        <span className="text-xs font-bold px-2.5 py-0.5 bg-purple-100 text-purple-600 rounded-xl">
                            {selectedVendors.length}/{MAX_SELECTED}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Select up to {MAX_SELECTED} vendors to display as trending. Use arrows to reorder.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {selectedVendors.map((vendor, index) => (
                        <div
                            key={vendor.id}
                            className="flex items-center gap-6 bg-[#F8F9F9] rounded-3xl p-4 border border-gray-100 shadow-sm transition-all ring-2 ring-purple-100 border-purple-200"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-100 font-bold text-gray-900">
                                {index + 1}
                            </div>

                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                                {vendor.profilePicture ? (
                                    <img src={vendor.profilePicture} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 uppercase text-[10px] font-bold text-gray-400 text-center p-2">
                                        No Image
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{vendor.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 truncate uppercase tracking-wider font-medium">
                                    {vendor.mainCategory || 'Uncategorized'} {vendor.offers?.length ? `· ${vendor.offers.length} offer${vendor.offers.length > 1 ? 's' : ''}` : ''}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => moveItem(index, 'up')}
                                    disabled={index === 0}
                                    className="rounded-xl h-10 w-10 border-gray-200 bg-white text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                                >
                                    <MoveUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === selectedVendors.length - 1}
                                    className="rounded-xl h-10 w-10 border-gray-200 bg-white text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                                >
                                    <MoveDown className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => toggleVendor(vendor.id)}
                                    className="rounded-xl h-10 w-10 border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {selectedVendors.length === 0 && (
                        <div className="py-12 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <p className="font-bold text-lg text-gray-500">No vendors selected</p>
                            <p className="text-sm text-center max-w-xs">
                                Select vendors from the list below to display as trending.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Unselected vendors section */}
            {unselectedVendors.length > 0 && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-2 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900">Available Vendors</h2>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-xl">
                                {unselectedVendors.length}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            These vendors are marked as trending but not selected for display.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {unselectedVendors.map((vendor) => (
                            <div
                                key={vendor.id}
                                className="flex items-center gap-6 bg-[#F8F9F9] rounded-3xl p-4 border border-gray-100 shadow-sm transition-all opacity-70"
                            >
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                                    {vendor.profilePicture ? (
                                        <img src={vendor.profilePicture} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-50 uppercase text-[10px] font-bold text-gray-400 text-center p-2">
                                            No Image
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{vendor.name}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate uppercase tracking-wider font-medium">
                                        {vendor.mainCategory || 'Uncategorized'} {vendor.offers?.length ? `· ${vendor.offers.length} offer${vendor.offers.length > 1 ? 's' : ''}` : ''}
                                    </p>
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => toggleVendor(vendor.id)}
                                    disabled={selectedIds.length >= MAX_SELECTED}
                                    className={cn(
                                        "rounded-xl h-10 w-10 border-gray-200 bg-white transition-all",
                                        selectedIds.length >= MAX_SELECTED
                                            ? "opacity-30 cursor-not-allowed text-gray-400"
                                            : "text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                                    )}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="h-20" />
        </div>
    )
}
