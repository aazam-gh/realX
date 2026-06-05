import { z } from 'zod'
import { db } from '@/firebase/config'
import {
    collection,
    getDocs,
    orderBy,
    query,
} from 'firebase/firestore'
import type { Vendor } from '@/queries'


export const vendorsSearchSchema = z.object({
    page: z.coerce.number().int().min(1).catch(1),
    pageSize: z.coerce.number().int().min(5).max(50).catch(10),
    search: z.string().catch(''),
    sort: z.enum(['name-asc', 'name-desc']).catch('name-asc'),
    xcard: z.enum(['all', 'enabled', 'disabled']).catch('all'),
})

export type VendorsSearch = z.infer<typeof vendorsSearchSchema>
export type VendorScope = 'all' | 'in_store' | 'online'

export interface VendorsPageResult {
    vendors: Vendor[]
    totalCount: number
}

export async function fetchVendorsPage(search: VendorsSearch, vendorScope: VendorScope): Promise<VendorsPageResult> {
    const collRef = collection(db, 'vendors')
    const trimmedSearch = search.search.trim().toLowerCase()


    const snapshot = await getDocs(query(
        collRef,
        orderBy('name', search.sort === 'name-desc' ? 'desc' : 'asc')
    ))


    const allVendors = snapshot.docs.map((docSnap) => {


        const data = docSnap.data()

        return {
            id: docSnap.id,
            name: data.name || 'Unnamed Vendor',
            contact: data.contact || data.email || '',
            pin: data.pin || '----',
            profilePicture: data.profilePicture || '',
            vendorType: data.vendorType || 'in_store',
            xcard: !!data.xcard,
            mainCategory: data.mainCategory || data.category,
            subcategory: data.subcategory,
            isTrending: data.isTrending,
            latitude: data.latitude,
            longitude: data.longitude,
            lat: data.lat,
            lng: data.lng,
            offers: data.offers || [],
        } as Vendor
    })



    const filteredVendors = allVendors.filter((vendor) => {
        const matchesScope = vendorScope === 'all' || vendor.vendorType === vendorScope
        const matchesSearch =
            !trimmedSearch ||
            (vendor.name ?? '').toLowerCase().includes(trimmedSearch)

        return matchesScope && matchesSearch
    })

    const start = (search.page - 1) * search.pageSize
    const end = search.page * search.pageSize



    return {
        vendors: filteredVendors.slice(start, end),
        totalCount: filteredVendors.length,
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
            contact: data.contact || '',
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
