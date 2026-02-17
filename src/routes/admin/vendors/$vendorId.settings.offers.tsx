import { createFileRoute } from '@tanstack/react-router'
import { OffersSettings } from '@/components/admin/vendors/OffersSettings'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/firebase/config'
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings/offers')({
    component: OffersSettingsComponent,
    loader: async ({ context: { queryClient }, params: { vendorId } }) => {
        // Prefetch vendor
        const vendorPromise = queryClient.ensureQueryData({
            queryKey: ['vendor', vendorId],
            queryFn: async () => {
                const docRef = doc(db, 'vendors', vendorId)
                const snapshot = await getDoc(docRef)
                if (!snapshot.exists()) {
                    throw new Error('Vendor not found')
                }
                return { id: snapshot.id, ...snapshot.data() } as { name?: string }
            },
        })

        // Prefetch offers
        const offersPromise = queryClient.ensureQueryData({
            queryKey: ['offers', vendorId],
            queryFn: async () => {
                const q = query(
                    collection(db, 'offers'),
                    where('vendorId', '==', vendorId)
                )
                const snapshot = await getDocs(q)
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
            },
        })

        await Promise.all([vendorPromise, offersPromise])
    },
})

function OffersSettingsComponent() {
    const { vendorId } = Route.useParams()

    const { data: vendor } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: async () => {
            const docRef = doc(db, 'vendors', vendorId)
            const snapshot = await getDoc(docRef)
            if (!snapshot.exists()) {
                throw new Error('Vendor not found')
            }
            return { id: snapshot.id, ...snapshot.data() } as { name?: string }
        }
    })

    return (
        <div className="pt-6">
            <OffersSettings vendorId={vendorId} vendorName={vendor?.name || ''} />
        </div>
    )
}
