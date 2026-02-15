import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
    ArrowLeft,
    Trash2,
    Loader2,
    Search,
    Settings,
    PackagePlus
} from 'lucide-react'
import { db, storage } from '@/firebase/config'
import {
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Types
interface Category {
    id: string
    name: string
    imageUrl: string
    order: number
    isActive: boolean
    link?: string
    nameArabic?: string
}

export const Route = createFileRoute('/admin/cms/categories')({
    component: CategoriesLayout,
})

function CategoriesLayout() {
    const [view, setView] = useState<'list' | 'manage'>('list')
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    const handleManageCategory = (category: Category) => {
        setSelectedCategory(category)
        setView('manage')
    }

    const handleBack = () => {
        if (view === 'manage') {
            setView('list')
            setSelectedCategory(null)
        }
    }

    return (
        <div className="font-sans">
            {view === 'list' ? (
                <CategoriesOverview onManage={handleManageCategory} />
            ) : (
                <ManageCategoryView category={selectedCategory} onBack={handleBack} />
            )}
        </div>
    )
}

// --- VIEW 1: Categories Overview (Firebase Integrated) ---
function CategoriesOverview({ onManage }: { onManage: (cat: Category) => void }) {
    const navigate = useNavigate()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        setLoading(true)
        try {
            const cmsRef = doc(db, 'cms', 'categories')
            const cmsSnap = await getDoc(cmsRef)

            if (cmsSnap.exists()) {
                setCategories(cmsSnap.data().categories || [])
            } else {
                setCategories([])
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load categories')
        } finally {
            setLoading(false)
        }
    }

    const handleAddCategory = () => {
        fileInputRef.current?.click()
    }

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)

            const newCat: Category = {
                id: `cat_${Math.random().toString(36).substr(2, 9)}`,
                name: 'New Category',
                imageUrl: downloadURL,
                order: categories.length + 1,
                isActive: true
            }

            const updatedCategories = [...categories, newCat]
            const cmsRef = doc(db, 'cms', 'categories')
            await setDoc(cmsRef, { categories: updatedCategories })

            setCategories(updatedCategories)
            toast.success('Category added')
        } catch (error) {
            console.error(error)
            toast.error('Failed to add category')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category?')) return
        try {
            const updatedCategories = categories.filter(c => c.id !== id)
            const cmsRef = doc(db, 'cms', 'categories')
            await setDoc(cmsRef, { categories: updatedCategories })

            setCategories(updatedCategories)
            toast.success('Deleted')
        } catch (error) {
            toast.error('Failed to delete')
        }
    }

    const handleUpdate = async (id: string, updates: Partial<Category>) => {
        try {
            const updatedCategories = categories.map(c => c.id === id ? { ...c, ...updates } : c)
            const cmsRef = doc(db, 'cms', 'categories')
            await setDoc(cmsRef, { categories: updatedCategories })

            setCategories(updatedCategories)
        } catch (error) {
            toast.error('Update failed')
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
        <div className="p-8 space-y-12 max-w-6xl mx-auto">
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
                        <span className="text-2xl">🗳️</span>
                        <h1 className="text-3xl font-bold tracking-tight">
                            App CMS / <span className="font-bold">Categories & Sorting</span>
                        </h1>
                    </div>
                </div>
                <Button
                    onClick={handleAddCategory}
                    disabled={uploading}
                    className="bg-[#7F3DFF] hover:bg-[#6B32D9] text-white rounded-2xl px-6 h-11 gap-2 font-bold shadow-md"
                >
                    <PackagePlus className="w-5 h-5" /> Add New Category
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} accept="image/*" />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                {categories.map((cat) => (
                    <div key={cat.id} className="flex gap-4">
                        <div className="relative w-[130px] h-[130px] rounded-[2rem] overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                            <img src={cat.imageUrl} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-0 right-0 px-2">
                                <Badge className="w-full justify-center bg-[#7F3DFF] hover:bg-[#7F3DFF] text-white rounded-full text-[10px] py-0.5 border-none">
                                    {cat.name}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-2 flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{cat.name}</h3>
                            <Button
                                variant="outline"
                                className="justify-start gap-2 rounded-xl h-10 border-gray-200 bg-[#F8F9F9] text-gray-900 font-bold text-sm px-4"
                                onClick={() => onManage(cat)}
                            >
                                <Settings className="w-4 h-4" /> Manage Category
                            </Button>
                            <Button
                                variant="outline"
                                className="justify-start gap-2 rounded-xl h-10 border-gray-200 bg-[#F8F9F9] text-red-500 font-bold text-sm px-4 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(cat.id)}
                            >
                                <Trash2 className="w-4 h-4" /> Delete Category
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sort Section */}
            <div className="space-y-6 pt-12">
                <h2 className="text-xl font-bold text-gray-900">Sort and Link Existing Banners</h2>
                <div className="bg-[#F8F9F9] rounded-[3rem] p-8 shadow-inner border border-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-4">
                                <button
                                    onClick={() => handleUpdate(cat.id, { isActive: !cat.isActive })}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative shadow-inner flex-shrink-0",
                                        cat.isActive ? "bg-[#7F3DFF]" : "bg-gray-300"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all transform",
                                        cat.isActive ? "left-7" : "left-1"
                                    )} />
                                </button>

                                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 shadow-sm">
                                    <img src={cat.imageUrl} className="w-full h-full object-cover" />
                                    <div className="absolute top-1 left-0 right-0 px-1">
                                        <Badge className="w-full justify-center bg-[#7F3DFF] text-[8px] py-0 h-4 min-h-0 border-none scale-90">
                                            {cat.name}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-2">
                                    <Select
                                        value={cat.order.toString()}
                                        onValueChange={(v) => handleUpdate(cat.id, { order: parseInt(v) })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={cat.link || "Grocery"}
                                        onValueChange={(v) => handleUpdate(cat.id, { link: v })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 font-bold">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">🔗</span>
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="Grocery">"Grocery"</SelectItem>
                                            <SelectItem value="Electronics">"Electronics"</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- VIEW 2: Manage Category (Mock UI only) ---
function ManageCategoryView({ category, onBack }: { category: Category | null, onBack: () => void }) {
    if (!category) return null

    // Mock sub-categories
    const subCategories = [
        { name: 'Burger', img: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200' },
        { name: 'Pizza', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200' },
        { name: 'Coffee', img: 'https://images.unsplash.com/photo-1541167760496-162955ed2a95?w=200' },
        { name: 'Dessert', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200' }
    ]

    // Mock vendors
    const mockVendors = [
        { name: 'Papa Johns', isActive: true, order: 1 },
        { name: 'Krispy Kreme', isActive: true, order: 1 },
        { name: 'Burger Boutique', isActive: true, order: 1 },
        { name: 'Poori & Karak', isActive: true, order: 1 },
        { name: 'Crispy Pollo', isActive: false, order: 1 }
    ]

    return (
        <div className="p-8 space-y-12 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-gray-100 hover:bg-gray-200"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🗳️</span>
                    <h1 className="text-3xl font-bold tracking-tight">
                        App CMS / <span className="font-bold">Categories & Sorting</span>
                    </h1>
                </div>
            </div>

            {/* Cover Section */}
            <div className="flex gap-8">
                <div className="relative w-[130px] h-[175px] rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                    <img src={category.imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-0 right-0 px-3">
                        <Badge className="w-full justify-center bg-[#7F3DFF] text-[10px] py-1 border-none shadow-sm font-bold">
                            {category.name}
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-col justify-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">Cover</h2>
                    <p className="text-sm text-gray-400 font-medium italic">Size: 100x135 pixels</p>
                    <Button
                        variant="outline"
                        className="rounded-2xl h-11 border-gray-200 bg-[#F8F9F9] text-gray-900 font-bold px-6 shadow-sm gap-2 hover:bg-gray-100"
                    >
                        <Settings className="w-4 h-4 text-purple-600" /> Change Cover
                    </Button>
                </div>
            </div>

            {/* Titles Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900">New Category Title (English)</label>
                    <Input
                        defaultValue={category.name}
                        className="h-12 rounded-2xl bg-[#F8F9F9] border-gray-100 font-bold px-6 focus:ring-purple-200"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-900">New Category Title (Arabic)</label>
                    <Input
                        defaultValue="طعام"
                        dir="rtl"
                        className="h-12 rounded-2xl bg-[#F8F9F9] border-gray-100 font-bold px-6 focus:ring-purple-200"
                    />
                </div>
            </div>

            {/* Sub-Categories */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="w-12 h-6 rounded-full bg-[#7F3DFF] relative shadow-inner">
                            <div className="absolute top-1 left-7 w-4 h-4 rounded-full bg-white shadow-sm" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">Sub-Categories</h2>
                    </div>
                    <Button className="bg-[#7F3DFF] hover:bg-[#6B32D9] text-white rounded-2xl px-6 h-11 gap-2 font-bold shadow-md">
                        <PackagePlus className="w-5 h-5" /> Add New Sub-Category
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-8">
                    {subCategories.map((sub, i) => (
                        <div key={i} className="flex flex-col items-center gap-3">
                            <div className="relative w-28 h-28 rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                                <img src={sub.img} className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-0 right-0 px-2">
                                    <Badge className="w-full justify-center bg-white/95 text-gray-900 text-[8px] py-0.5 border-none shadow-sm font-bold uppercase tracking-tight">
                                        {sub.name}
                                    </Badge>
                                </div>
                            </div>
                            <div className="w-full space-y-1.5">
                                <Button className="w-full h-9 rounded-xl border-gray-100 bg-[#F8F9F9] hover:bg-gray-100 text-gray-900 text-[10px] font-bold gap-1.5 px-0">
                                    <Settings className="w-3 h-3" /> Manage Category
                                </Button>
                                <Button className="w-full h-9 rounded-xl border-gray-100 bg-[#F8F9F9] hover:bg-red-50 text-red-500 text-[10px] font-bold gap-1.5 px-0">
                                    <Trash2 className="w-3 h-3" /> Delete Category
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Vendors */}
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">Vendors</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search for vendors"
                            className="bg-[#F8F9F9] border-none rounded-2xl h-12 pl-12 font-bold text-gray-600 focus:ring-purple-200"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-gray-100/50 px-4 py-2 rounded-2xl border border-gray-100">
                            <button className="w-10 h-5 rounded-full bg-[#7F3DFF] relative transition-colors shadow-inner">
                                <div className="absolute top-0.5 left-5 w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                            <span className="text-sm font-bold text-gray-900">Auto-sorting</span>
                        </div>
                        <Button className="bg-[#7F3DFF] hover:bg-[#6B32D9] text-white rounded-22xl rounded-2xl px-6 h-12 gap-2 font-bold shadow-md">
                            <PackagePlus className="w-5 h-5" /> Add New Vendor
                        </Button>
                    </div>
                </div>

                <div className="bg-[#F8F9F9] rounded-[2.5rem] p-6 space-y-3 shadow-inner border border-gray-50">
                    {mockVendors.map((vendor, i) => (
                        <div key={i} className="bg-white rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm border border-gray-50 hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <button className={cn(
                                    "w-10 h-5 rounded-full relative transition-colors shadow-inner",
                                    vendor.isActive ? "bg-[#7F3DFF]" : "bg-gray-200"
                                )}>
                                    <div className={cn(
                                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all transform",
                                        vendor.isActive ? "left-5.5 left-5" : "left-0.5"
                                    )} />
                                </button>
                                <span className="font-bold text-gray-900">{vendor.name}</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <Select defaultValue="1">
                                    <SelectTrigger className="w-24 h-10 border-none bg-gray-50 rounded-xl font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-10" />
        </div>
    )
}
