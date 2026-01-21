import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { BrandingSettings } from '@/components/admin/vendors/BrandingSettings'
import { GeneralSettings } from '@/components/admin/vendors/GeneralSettings'
import { OffersSettings } from '@/components/admin/vendors/OffersSettings'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings')({
    component: VendorSettingsComponent
})

export interface Vendor {
    id: string
    name?: string
    nameAr?: string
    email?: string
    phoneNumber?: string
    website?: string
    status?: string
    isFeatured?: boolean
    shortDescriptionEn?: string
    shortDescriptionAr?: string
    keywordsEn?: string[]
    keywordsAr?: string[]
    tagsEn?: string[]
    tagsAr?: string[]
    profilePicture?: string
    coverImage?: string
}

function VendorSettingsComponent() {
    const { vendorId } = Route.useParams()
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<Vendor | null>(null)

    const { data: vendor, isLoading } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: async () => {
            const docRef = doc(db, 'vendors', vendorId)
            const snapshot = await getDoc(docRef)
            if (!snapshot.exists()) {
                throw new Error('Vendor not found')
            }
            return { id: snapshot.id, ...snapshot.data() } as Vendor
        }
    })

    useEffect(() => {
        if (vendor) {
            setFormData(vendor)
        }
    }, [vendor])

    const updateMutation = useMutation({
        mutationFn: async (updatedData: Partial<Vendor>) => {
            const { id, ...dataToUpdate } = updatedData
            const docRef = doc(db, 'vendors', vendorId)
            await updateDoc(docRef, dataToUpdate)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
            toast.success('Settings updated successfully!', {
                description: 'The vendor information has been synchronized with the database.',
                duration: 3000,
            })
        },
        onError: (error) => {
            toast.error('Failed to update settings', {
                description: error instanceof Error ? error.message : 'An unknown error occurred',
            })
        }
    })

    const [activeTab, setActiveTab] = useState('general')

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
            </div>
        )
    }

    if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found</div>

    const handleSave = () => {
        if (formData) {
            updateMutation.mutate(formData)
        }
    }

    return (
        <div className="p-8 space-y-6 w-full max-w-[1200px] mx-auto">
            <div className="flex items-center gap-4">
                <Link
                    to="/admin/vendors"
                    search={{ page: 1, pageSize: 10 }}
                    className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <span className="text-slate-400 font-medium">{vendor?.name || 'Vendor'}</span>
                    </h1>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="offers">Offers</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <GeneralSettings formData={formData} setFormData={setFormData} />
                </TabsContent>

                <TabsContent value="branding" className="space-y-6 pt-6">
                    {formData && (
                        <BrandingSettings formData={formData} setFormData={setFormData} vendorId={vendorId} />
                    )}
                </TabsContent>

                <TabsContent value="offers">
                    <OffersSettings formData={formData} setFormData={setFormData} />
                </TabsContent>
            </Tabs>

            {activeTab !== 'offers' && (
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => setFormData(vendor)}>Reset Changes</Button>
                    <Button
                        className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white gap-2"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                    >
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            )}
        </div>
    )
}
