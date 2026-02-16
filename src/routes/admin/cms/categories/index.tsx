import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import {
    ArrowLeft,
    Trash2,
    Loader2,
    Settings,
    PackagePlus
} from 'lucide-react'
import { db, storage } from '@/firebase/config'
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    addDoc,
    updateDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Category } from '@/types/categories'

export const Route = createFileRoute('/admin/cms/categories/')({
    component: CategoriesOverview,
})

function CategoriesOverview() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [categories, setCategories] = useState<Category[]>([])
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const categoriesRef = collection(db, 'categories')
            const querySnapshot = await getDocs(categoriesRef)
            const cats: Category[] = []
            querySnapshot.forEach((doc) => {
                cats.push({ id: doc.id, ...doc.data() } as Category)
            })
            return cats.sort((a, b) => (a.order || 0) - (b.order || 0))
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    useEffect(() => {
        if (categoriesQuery.data) {
            setCategories(categoriesQuery.data)
        }
    }, [categoriesQuery.data])

    const saveSortingMutation = useMutation({
        mutationFn: async (newCategories: Category[]) => {
            const batch: Promise<void>[] = []
            newCategories.forEach((cat, index) => {
                const docRef = doc(db, 'categories', cat.id)
                batch.push(updateDoc(docRef, { order: index + 1 }) as Promise<void>)
            })
            await Promise.all(batch)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('Sorting saved')
        },
        onError: (error) => {
            console.error('Error saving sorting:', error)
            toast.error('Failed to save sorting')
        }
    })

    const addCategoryMutation = useMutation({
        mutationFn: async (file: File) => {
            setUploading(true)
            const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)

            const newCatData = {
                nameEnglish: 'New Category',
                nameArabic: 'فئة جديدة',
                imageUrl: downloadURL,
                order: categories.length + 1,
                isActive: true,
                subcategories: []
            }

            const docRef = await addDoc(collection(db, 'categories'), newCatData)
            return { id: docRef.id, ...newCatData } as Category
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('Category added')
        },
        onError: (error) => {
            console.error('Error adding category:', error)
            toast.error('Failed to add category')
        },
        onSettled: () => {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    })

    const deleteCategoryMutation = useMutation({
        mutationFn: async ({ id, imageUrl }: { id: string, imageUrl: string }) => {
            await deleteDoc(doc(db, 'categories', id))
            try {
                const imageRef = ref(storage, imageUrl)
                await deleteObject(imageRef)
            } catch (err) {
                console.error('Failed to delete storage object:', err)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('Category deleted')
        },
        onError: (error) => {
            console.error('Error deleting category:', error)
            toast.error('Failed to delete category')
        }
    })

    const saveSorting = () => {
        saveSortingMutation.mutate(categories)
    }

    const handleAddCategory = () => {
        fileInputRef.current?.click()
    }

    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newCats = [...categories]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newCats.length) return

        const temp = newCats[index]
        newCats[index] = newCats[targetIndex]
        newCats[targetIndex] = temp
        setCategories(newCats)
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            addCategoryMutation.mutate(file)
        }
    }

    const handleDelete = (id: string, imageUrl: string) => {
        if (!confirm('Are you sure you want to delete this category? This will delete all subcategories as well.')) return
        deleteCategoryMutation.mutate({ id, imageUrl })
    }

    if (categoriesQuery.isLoading && categories.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-12 max-w-6xl mx-auto font-sans">
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
                            App CMS / <span className="font-bold">Categories</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {categories.length > 0 && (
                        <Button
                            onClick={saveSorting}
                            disabled={saveSortingMutation.isPending}
                            variant="outline"
                            className="border-purple-200 text-purple-600 hover:bg-purple-50 rounded-2xl px-6 h-11 font-bold shadow-sm"
                        >
                            {saveSortingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Sorting
                        </Button>
                    )}
                    <Button
                        onClick={handleAddCategory}
                        disabled={uploading}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 h-11 gap-2 font-bold shadow-md transition-all sm:flex hidden"
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackagePlus className="w-5 h-5" />}
                        Add New Category
                    </Button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} accept="image/*" />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                {categories.map((cat, index) => (
                    <div
                        key={cat.id}
                        className="flex gap-4 group"
                    >
                        <div className="relative w-[130px] h-[130px] rounded-[2rem] overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 shadow-sm transition-transform group-hover:scale-[1.02]">
                            <img src={cat.imageUrl} className="w-full h-full object-cover" alt={cat.nameEnglish} />
                            <div className="absolute top-2 left-0 right-0 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                                <Badge className="bg-purple-600/90 text-white rounded-full text-[10px] py-0.5 border-none shadow-sm capitalize">
                                    {cat.nameEnglish}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center gap-2 flex-1">
                            <h3 className="text-lg font-bold text-gray-900 truncate">{cat.nameEnglish}</h3>

                            <div className="flex gap-1">
                                <Link to="/admin/cms/categories/$categoryId" params={{ categoryId: cat.id }} className="flex-1">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-2 rounded-xl h-10 border-gray-100 bg-[#F8F9F9] text-gray-900 font-bold text-xs px-3 hover:bg-gray-100 transition-colors"
                                    >
                                        <Settings className="w-4 h-4 text-purple-600" /> Manage
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-10 w-10 border-gray-100 bg-[#F8F9F9] text-gray-600 hover:bg-gray-100 p-0 flex items-center justify-center"
                                    onClick={() => moveCategory(index, 'up')}
                                    disabled={index === 0}
                                >
                                    ↑
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-10 w-10 border-gray-100 bg-[#F8F9F9] text-gray-600 hover:bg-gray-100 p-0 flex items-center justify-center"
                                    onClick={() => moveCategory(index, 'down')}
                                    disabled={index === categories.length - 1}
                                >
                                    ↓
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 rounded-xl h-10 border-gray-100 bg-[#F8F9F9] text-red-500 font-bold text-xs px-4 hover:text-red-600 hover:bg-red-50 transition-colors"
                                onClick={() => handleDelete(cat.id, cat.imageUrl)}
                            >
                                <Trash2 className="w-4 h-4" /> Delete Category
                            </Button>
                        </div>
                    </div>
                ))}
            </div>


            {categories.length === 0 && !categoriesQuery.isLoading && (
                <div className="py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <div className="bg-white p-4 rounded-full shadow-sm">
                        <PackagePlus className="w-10 h-10 opacity-30 text-purple-600" />
                    </div>
                    <p className="font-bold text-lg text-gray-500">No categories found</p>
                    <p className="text-sm">Click 'Add New Category' to create your first one.</p>
                </div>
            )}

            <div className="h-10" />
        </div>
    )
}
