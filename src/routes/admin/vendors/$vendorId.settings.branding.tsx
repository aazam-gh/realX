import { createFileRoute } from '@tanstack/react-router'
import { BrandingSettings, type VendorBrandingForm } from '@/components/admin/vendors/BrandingSettings'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db, functions } from '@/firebase/config'
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { refreshVendorList } from '@/lib/vendorList'
import { deleteGalleryImages, getRemovedGalleryImages } from '@/lib/vendor-gallery'
import { vendorPinQueryOptions, vendorQueryOptions, type OnlineRedemptionConfig, type Vendor } from '@/queries'
import { validateOnlineRedemptionConfig } from '@/lib/online-vendor-config'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings/branding')({
    component: BrandingSettingsComponent,
    loader: async ({ context: { queryClient }, params: { vendorId } }) => {
        await queryClient.ensureQueryData(vendorQueryOptions(vendorId))
    },
})

function BrandingSettingsComponent() {
    const { vendorId } = Route.useParams()
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<VendorBrandingForm | null>(null)
    const [uploadingImages, setUploadingImages] = useState(false)
    const [onlineConfig, setOnlineConfig] = useState<OnlineRedemptionConfig>({
        fulfillmentMode: 'coupon',
        discountCode: '',
        purchaseUrl: '',
        enabled: false,
    })

    const { data: vendor, isLoading } = useQuery(vendorQueryOptions(vendorId))
    const { data: vendorPin = '', isLoading: isPinLoading } = useQuery(vendorPinQueryOptions(vendorId))

    useEffect(() => {
        if (vendor) {
            setFormData({ ...vendor, redemptionPin: vendorPin })
        }
    }, [vendor, vendorPin])

    useEffect(() => {
        let active = true

        const loadOnlineConfig = async () => {
            const snapshot = await getDoc(doc(db, 'vendorOnlineRedemptionConfigs', vendorId))
            if (!active) return

            if (!snapshot.exists()) {
                setOnlineConfig({
                    fulfillmentMode: 'coupon',
                    discountCode: '',
                    purchaseUrl: '',
                    enabled: false,
                })
                return
            }

            const data = snapshot.data()
            setOnlineConfig({
                fulfillmentMode: data.fulfillmentMode === 'outbound_link' || data.fulfillmentMode === 'partner_managed' ? data.fulfillmentMode : 'coupon',
                discountCode: data.discountCode || '',
                purchaseUrl: data.purchaseUrl || '',
                iosUrl: data.iosUrl || '',
                androidUrl: data.androidUrl || '',
                ctaLabel: data.ctaLabel || '',
                ctaLabelAr: data.ctaLabelAr || '',
                instructions: data.instructions || '',
                instructionsAr: data.instructionsAr || '',
                enabled: data.enabled === true,
            })
        }

        void loadOnlineConfig()

        return () => {
            active = false
        }
    }, [vendorId])

    const updateMutation = useMutation({
        mutationFn: async ({ vendorData, configData }: { vendorData: VendorBrandingForm, configData: OnlineRedemptionConfig }) => {
            if (vendorData.vendorType === 'online') {
                validateOnlineRedemptionConfig(configData)
            }

            const dataToUpdate: Record<string, unknown> = { ...vendorData }
            delete dataToUpdate.id
            delete dataToUpdate.redemptionPin
            dataToUpdate.isActive = vendorData.status === 'Active' || vendorData.status === undefined

            const vendorInformation = {
                title: vendorData.vendorInformation?.title?.trim() || '',
                titleAr: vendorData.vendorInformation?.titleAr?.trim() || '',
                message: vendorData.vendorInformation?.message?.trim() || '',
                messageAr: vendorData.vendorInformation?.messageAr?.trim() || '',
            }
            dataToUpdate.vendorInformation = vendorInformation.message || vendorInformation.messageAr
                ? vendorInformation
                : deleteField()

            const pin = vendorData.redemptionPin?.trim() || ''
            if (pin && !/^\d{4}$/.test(pin)) {
                throw new Error('Vendor security PIN must be exactly 4 digits.')
            }
            if (pin && pin !== vendorPin) {
                await httpsCallable(functions, 'setVendorRedemptionPin')({ vendorId, pin })
            }

            const vendorRef = doc(db, 'vendors', vendorId)
            await updateDoc(vendorRef, dataToUpdate)

            await setDoc(doc(db, 'vendorOnlineRedemptionConfigs', vendorId), {
                fulfillmentMode: configData.fulfillmentMode,
                discountCode: configData.discountCode?.trim() || deleteField(),
                purchaseUrl: configData.purchaseUrl?.trim() || deleteField(),
                iosUrl: configData.iosUrl?.trim() || deleteField(),
                androidUrl: configData.androidUrl?.trim() || deleteField(),
                ctaLabel: configData.ctaLabel?.trim() || deleteField(),
                ctaLabelAr: configData.ctaLabelAr?.trim() || deleteField(),
                instructions: configData.instructions?.trim() || deleteField(),
                instructionsAr: configData.instructionsAr?.trim() || deleteField(),
                dailyLimitPerUser: deleteField(),
                enabled: configData.enabled === true,
                updatedAt: serverTimestamp(),
            }, { merge: true })

            return { savedPin: pin || vendorPin }
        },
        onMutate: async ({ vendorData }) => {
            await queryClient.cancelQueries({ queryKey: ['vendor', vendorId] })
            const previousVendor = queryClient.getQueryData(['vendor', vendorId])
            const optimisticVendor = { ...vendorData }
            delete optimisticVendor.redemptionPin
            queryClient.setQueryData(['vendor', vendorId], (old: Vendor | undefined) => {
                if (!old) return old
                return { ...old, ...optimisticVendor }
            })
            return { previousVendor }
        },
        onSuccess: ({ savedPin }, { vendorData }) => {
            queryClient.setQueryData(['vendor-pin', vendorId], savedPin)
            setFormData((current) => current ? { ...current, redemptionPin: savedPin } : current)
            void deleteGalleryImages(getRemovedGalleryImages(vendor?.galleryImages, vendorData.galleryImages))
            void refreshVendorList()
            toast.success('Settings updated successfully!', {
                description: 'The vendor information has been synchronized with the database.',
                duration: 3000,
            })
        },
        onError: (error, _variables, context) => {
            if (context?.previousVendor) {
                queryClient.setQueryData(['vendor', vendorId], context.previousVendor)
            }
            toast.error('Failed to update settings', {
                description: error instanceof Error ? error.message : 'An unknown error occurred',
            })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
            queryClient.invalidateQueries({ queryKey: ['vendor-pin', vendorId] })
        },
    })

    const handleSave = () => {
        if (formData) {
            updateMutation.mutate({ vendorData: formData, configData: onlineConfig })
        }
    }

    const handleReset = () => {
        if (!formData || !vendor || uploadingImages) return
        void deleteGalleryImages(getRemovedGalleryImages(formData.galleryImages, vendor.galleryImages))
        setFormData({ ...vendor, redemptionPin: vendorPin })
    }

    if (isLoading || isPinLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
            </div>
        )
    }

    if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found</div>

    return (
        <div className="space-y-6 pt-6">
            {formData && (
                <BrandingSettings
                    formData={formData}
                    setFormData={setFormData}
                    vendorId={vendorId}
                    onlineConfig={onlineConfig}
                    setOnlineConfig={setOnlineConfig}
                    savedGalleryImages={vendor.galleryImages}
                    onUploadingChange={setUploadingImages}
                />
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={handleReset} disabled={uploadingImages}>Reset Changes</Button>
                <Button
                    className="bg-brand-green hover:bg-brand-green/90 text-white gap-2"
                    onClick={handleSave}
                    disabled={updateMutation.isPending || uploadingImages}
                >
                    {updateMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
