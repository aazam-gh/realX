import { queryOptions } from '@tanstack/react-query'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { listHoldingGroups } from '@/lib/holding-groups'
import { STALE_TIME } from '@/lib/constants'

async function countCollection(collectionName: string) {
  const snapshot = await getCountFromServer(collection(db, collectionName))
  return snapshot.data().count
}

async function countOnlineVendors() {
  const snapshot = await getCountFromServer(query(
    collection(db, 'vendors'),
    where('vendorType', '==', 'online'),
  ))
  return snapshot.data().count
}

async function countPendingVerificationRequests() {
  const snapshot = await getCountFromServer(query(
    collection(db, 'verification_requests'),
    where('status', '==', 'pending'),
  ))
  return snapshot.data().count
}

export const adminOverviewQueryOptions = {
  students: () => queryOptions({
    queryKey: ['admin-overview', 'students-count'],
    queryFn: () => countCollection('students'),
    staleTime: STALE_TIME.MEDIUM,
  }),
  vendors: () => queryOptions({
    queryKey: ['admin-overview', 'vendors-count'],
    queryFn: () => countCollection('vendors'),
    staleTime: STALE_TIME.MEDIUM,
  }),
  onlineVendors: () => queryOptions({
    queryKey: ['admin-overview', 'online-vendors-count'],
    queryFn: countOnlineVendors,
    staleTime: STALE_TIME.MEDIUM,
  }),
  holdingGroups: () => queryOptions({
    queryKey: ['holding-groups'],
    queryFn: async () => (await listHoldingGroups()).length,
    staleTime: STALE_TIME.MEDIUM,
  }),
  pendingVerificationRequests: () => queryOptions({
    queryKey: ['admin-overview', 'pending-verification-requests-count'],
    queryFn: countPendingVerificationRequests,
    staleTime: STALE_TIME.SHORT,
  }),
}
