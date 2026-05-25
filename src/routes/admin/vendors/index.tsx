import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/firebase/config'
import {
    collection,
    getCountFromServer,
    getDocs,
    limit,
    orderBy,
    query,
    where,
    type QueryConstraint,
} from 'firebase/firestore'
import type { EmbeddedOffer } from '@/queries'

export const vendorsSearchSchema = z.object({
    page: z.coerce.number().int().min(1).catch(1),
    pageSize: z.coerce.number().int().min(5).max(50).catch(10),
    search: z.string().catch(''),
    sort: z.enum(['name-asc', 'name-desc']).catch('name-asc'),
    xcard: z.enum(['all', 'enabled', 'disabled']).catch('all'),
})

export const Route = createFileRoute('/admin/vendors/')({
    validateSearch: (search) => vendorsSearchSchema.parse(search),
    loader: async ({ context: { queryClient }, location }) => {
        const search = vendorsSearchSchema.parse(location.search)
        await queryClient.ensureQueryData({
            queryKey: ['vendors-page', search],
            queryFn: () => fetchVendorsPage(search),
        })
    },
})

export interface Vendor {
    id: string
    name: string
    contact: string
    pin: string
    profilePicture?: string
    vendorType?: 'in_store' | 'online'
    xcard: boolean
    mainCategory?: string
    subcategory?: string[]
    isTrending?: boolean
    latitude?: number
    longitude?: number
    lat?: number
    lng?: number
    offers?: EmbeddedOffer[]
}

export interface VendorsPageResult {
    vendors: Vendor[]
    totalCount: number
}

export type VendorsSearch = z.infer<typeof vendorsSearchSchema>

export async function fetchVendorsPage(search: VendorsSearch): Promise<VendorsPageResult> {
    const collRef = collection(db, 'vendors')
    const trimmedSearch = search.search.trim().toLowerCase()
    const constraints: QueryConstraint[] = []

    if (trimmedSearch) {
        constraints.push(where('searchTokens', 'array-contains', trimmedSearch))
    }

    if (search.xcard === 'enabled') {
        constraints.push(where('xcard', '==', true))
    } else if (search.xcard === 'disabled') {
        constraints.push(where('xcard', '==', false))
    }

    constraints.push(orderBy('name', search.sort === 'name-desc' ? 'desc' : 'asc'))

    const countQuery = query(collRef, ...constraints)
    const pageLimit = search.page * search.pageSize
    const pageQuery = query(collRef, ...constraints, limit(pageLimit))

    const [countSnapshot, snapshot] = await Promise.all([
        getCountFromServer(countQuery),
        getDocs(pageQuery),
    ])

    const pageDocs = snapshot.docs.slice((search.page - 1) * search.pageSize, search.page * search.pageSize)

    const vendors = pageDocs.map((docSnap) => {
        const data = docSnap.data()

        return {
            id: docSnap.id,
            name: data.name || 'Unnamed Vendor',
            contact: data.phoneNumber?.toString() || data.contact || '',
            pin: data.pin || '----',
            profilePicture: data.profilePicture || '',
            vendorType: data.vendorType || 'in_store',
            xcard: !!data.xcard,
            mainCategory: data.mainCategory,
            subcategory: data.subcategory,
            isTrending: data.isTrending,
            latitude: data.latitude,
            longitude: data.longitude,
            lat: data.lat,
            lng: data.lng,
            offers: data.offers || [],
        } as Vendor
    })

    return {
        vendors,
        totalCount: countSnapshot.data().count,
    }
}

export async function fetchAllVendors(): Promise<Vendor[]> {
    const collRef = collection(db, 'vendors')
    const q = query(collRef, orderBy('name', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => {
        const data = docSnap.data()

        return {
            id: docSnap.id,
            name: data.name || 'Unnamed Vendor',
            contact: data.phoneNumber?.toString() || data.contact || '',
            pin: data.pin || '----',
            profilePicture: data.profilePicture || '',
            vendorType: data.vendorType || 'in_store',
            xcard: !!data.xcard,
            mainCategory: data.mainCategory,
            subcategory: data.subcategory,
            isTrending: data.isTrending,
            latitude: data.latitude,
            longitude: data.longitude,
            lat: data.lat,
            lng: data.lng,
            offers: data.offers || [],
        } as Vendor
    })
}
