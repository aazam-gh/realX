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
    type DocumentData,
    type QueryDocumentSnapshot,
    type QueryConstraint,
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

function mapVendor(docSnap: QueryDocumentSnapshot<DocumentData>): Vendor {
    const data = docSnap.data()

    return {
        id: docSnap.id,
        name: data.name || 'Unnamed Vendor',
        contact: data.contact || data.email || '',
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
}

function vendorMatchesSearch(docSnap: QueryDocumentSnapshot<DocumentData>, searchTerm: string): boolean {
    const data = docSnap.data()
    const searchableValues = [
        data.name,
        data.nameAr,
        data.contact,
        data.email,
        data.pin,
        data.mainCategory,
        ...(Array.isArray(data.subcategory) ? data.subcategory : []),
    ]

    return searchableValues.some((value) => (
        typeof value === 'string' && value.toLowerCase().includes(searchTerm)
    ))
}

export async function fetchVendorsPage(search: VendorsSearch, vendorScope: VendorScope): Promise<VendorsPageResult> {
    const collRef = collection(db, 'vendors')
    const trimmedSearch = search.search.trim().toLowerCase()
    const constraints: QueryConstraint[] = []

    if (vendorScope !== 'all') {
        constraints.push(where('vendorType', '==', vendorScope))
    }

    if (search.xcard === 'enabled') {
        constraints.push(where('xcard', '==', true))
    } else if (search.xcard === 'disabled') {
        constraints.push(where('xcard', '==', false))
    }

    constraints.push(orderBy('name', search.sort === 'name-desc' ? 'desc' : 'asc'))

    if (trimmedSearch) {
        const snapshot = await getDocs(query(collRef, ...constraints))
        const matchedDocs = snapshot.docs.filter((docSnap) => vendorMatchesSearch(docSnap, trimmedSearch))
        const pageDocs = matchedDocs.slice((search.page - 1) * search.pageSize, search.page * search.pageSize)

        return {
            vendors: pageDocs.map(mapVendor),
            totalCount: matchedDocs.length,
        }
    }

    const countQuery = query(collRef, ...constraints)
    const pageLimit = search.page * search.pageSize
    const pageQuery = query(collRef, ...constraints, limit(pageLimit))

    const [countSnapshot, snapshot] = await Promise.all([
        getCountFromServer(countQuery),
        getDocs(pageQuery),
    ])

    const pageDocs = snapshot.docs.slice((search.page - 1) * search.pageSize, search.page * search.pageSize)

    return {
        vendors: pageDocs.map(mapVendor),
        totalCount: countSnapshot.data().count,
    }
}

export async function fetchAllVendors(): Promise<Vendor[]> {
    const collRef = collection(db, 'vendors')
    const q = query(collRef, orderBy('name', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(mapVendor)
}
