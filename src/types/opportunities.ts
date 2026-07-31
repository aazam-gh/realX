import type { Timestamp } from 'firebase/firestore'

export type OpportunityKind =
  | 'event'
  | 'career'
  | 'learning'
  | 'experience'
  | 'entrepreneurship'

export type OpportunityStatus = 'draft' | 'published' | 'archived'

export interface StudentOpportunity {
  id: string
  kind: OpportunityKind
  status: OpportunityStatus
  titleEn: string
  titleAr?: string
  summaryEn?: string
  summaryAr?: string
  descriptionEn?: string
  descriptionAr?: string
  providerName?: string
  imageUrl?: string
  locationEn?: string
  locationAr?: string
  locationMode?: 'onsite' | 'remote' | 'hybrid'
  startsAt?: Timestamp | Date | string | null
  endsAt?: Timestamp | Date | string | null
  deadline?: Timestamp | Date | string | null
  publishedAt?: Timestamp | Date | string | null
  expiresAt?: Timestamp | Date | string | null
  featured?: boolean
  createdAt?: string
  updatedAt?: string
  actionUrl?: string
  qualifiedActions?: number
}
