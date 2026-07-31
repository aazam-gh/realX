import { useEffect, useState } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type {
  OpportunityKind,
  OpportunityStatus,
  StudentOpportunity,
} from '@/types/opportunities'

export const Route = createLazyFileRoute('/admin/cms/opportunities/')({
  component: OpportunitiesManagement,
})

const kinds: OpportunityKind[] = [
  'career',
  'event',
  'learning',
  'experience',
  'entrepreneurship',
]

function createBlankOpportunity(): StudentOpportunity {
  return {
    id: `opportunity_${Math.random().toString(36).slice(2, 11)}`,
    kind: 'career',
    status: 'draft',
    titleEn: '',
    titleAr: '',
    summaryEn: '',
    summaryAr: '',
    descriptionEn: '',
    descriptionAr: '',
    providerName: '',
    imageUrl: '',
    locationEn: '',
    locationAr: '',
    locationMode: 'onsite',
    startsAt: null,
    deadline: null,
    expiresAt: null,
    featured: false,
    actionUrl: '',
  }
}

function toDateTimeInput(value: StudentOpportunity['startsAt']) {
  if (!value) return ''
  const date = value instanceof Date
    ? value
    : typeof value === 'string'
      ? new Date(value)
      : typeof value.toDate === 'function'
        ? value.toDate()
        : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toTimestamp(value: StudentOpportunity['startsAt']) {
  const normalized = toDateTimeInput(value)
  return normalized ? Timestamp.fromDate(new Date(normalized)) : null
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.toString()
      : ''
  } catch {
    return ''
  }
}

function OpportunitiesManagement() {
  const navigate = useNavigate()
  const [items, setItems] = useState<StudentOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    void loadOpportunities()
  }, [])

  const loadOpportunities = async () => {
    setLoading(true)
    try {
      const snapshot = await getDocs(query(collection(db, 'opportunities'), orderBy('publishedAt', 'desc')))
      const loaded = await Promise.all(snapshot.docs.map(async (snapshotDoc) => {
        const [actionConfig, analyticsDays] = await Promise.all([
          getDoc(doc(db, 'opportunityActionConfigs', snapshotDoc.id)),
          getDocs(collection(db, 'opportunityAnalytics', snapshotDoc.id, 'days')),
        ])
        return {
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
          actionUrl: actionConfig.data()?.actionUrl || '',
          qualifiedActions: analyticsDays.docs.reduce(
            (total, day) => total + Number(day.data().qualifiedActions || 0),
            0,
          ),
        } as StudentOpportunity
      }))
      setItems(loaded)
    } catch (error) {
      console.error('Failed to load opportunities', error)
      toast.error('Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  const updateItem = (id: string, updates: Partial<StudentOpportunity>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item))
  }

  const saveItem = async (item: StudentOpportunity) => {
    if (!item.titleEn.trim()) {
      toast.error('English title is required')
      return
    }
    if (item.status === 'published' && !item.actionUrl?.trim()) {
      toast.error('Published opportunities require an HTTPS action URL')
      return
    }
    if (item.actionUrl) {
      try {
        const parsed = new URL(item.actionUrl)
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error()
      } catch {
        toast.error('Action URL must be a credential-free HTTPS URL')
        return
      }
    }

    setSavingId(item.id)
    const now = new Date().toISOString()
    try {
      await setDoc(doc(db, 'opportunities', item.id), {
        id: item.id,
        kind: item.kind,
        status: item.status,
        titleEn: item.titleEn.trim(),
        titleAr: item.titleAr?.trim() || '',
        summaryEn: item.summaryEn?.trim() || '',
        summaryAr: item.summaryAr?.trim() || '',
        descriptionEn: item.descriptionEn?.trim() || '',
        descriptionAr: item.descriptionAr?.trim() || '',
        providerName: item.providerName?.trim() || '',
        imageUrl: item.imageUrl?.trim() || '',
        locationEn: item.locationEn?.trim() || '',
        locationAr: item.locationAr?.trim() || '',
        locationMode: item.locationMode || 'onsite',
        startsAt: toTimestamp(item.startsAt),
        endsAt: toTimestamp(item.endsAt),
        deadline: toTimestamp(item.deadline),
        expiresAt: toTimestamp(item.expiresAt),
        publishedAt: item.publishedAt
          ? toTimestamp(item.publishedAt)
          : item.status === 'published'
            ? Timestamp.now()
            : null,
        featured: item.featured === true,
        createdAt: item.createdAt || now,
        updatedAt: now,
      })
      if (item.actionUrl?.trim()) {
        await setDoc(doc(db, 'opportunityActionConfigs', item.id), {
          opportunityId: item.id,
          actionUrl: item.actionUrl.trim(),
          updatedAt: Timestamp.now(),
        })
      } else {
        await deleteDoc(doc(db, 'opportunityActionConfigs', item.id))
      }
      updateItem(item.id, { updatedAt: now })
      toast.success('Opportunity saved')
    } catch (error) {
      console.error('Failed to save opportunity', error)
      toast.error('Failed to save opportunity')
    } finally {
      setSavingId(null)
    }
  }

  const removeItem = async (item: StudentOpportunity) => {
    if (!confirm(`Delete ${item.titleEn || 'this opportunity'}?`)) return
    try {
      await Promise.all([
        deleteDoc(doc(db, 'opportunities', item.id)),
        deleteDoc(doc(db, 'opportunityActionConfigs', item.id)),
      ])
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
      toast.success('Opportunity deleted')
    } catch (error) {
      console.error('Failed to delete opportunity', error)
      toast.error('Failed to delete opportunity')
    }
  }

  const migrateEvents = async () => {
    setMigrating(true)
    try {
      const events = await getDocs(collection(db, 'events'))
      let migrated = 0
      for (const eventDoc of events.docs) {
        const event = eventDoc.data()
        const opportunityId = `event_${eventDoc.id}`
        const actionUrl = safeHttpsUrl(event.link)
        const opportunityRef = doc(db, 'opportunities', opportunityId)
        const existing = await getDoc(opportunityRef)
        if (existing.exists()) continue
        await setDoc(opportunityRef, {
          id: opportunityId,
          kind: 'event',
          status: event.isActive === false
            ? 'archived'
            : actionUrl
              ? 'published'
              : 'draft',
          titleEn: event.titleEn || '',
          titleAr: event.titleAr || '',
          summaryEn: event.descriptionEn || '',
          summaryAr: event.descriptionAr || '',
          descriptionEn: event.descriptionEn || '',
          descriptionAr: event.descriptionAr || '',
          providerName: 'realX',
          imageUrl: event.imageUrl || '',
          locationEn: event.locationEn || '',
          locationAr: event.locationAr || '',
          locationMode: 'onsite',
          startsAt: event.startsAt || null,
          deadline: null,
          publishedAt: Timestamp.now(),
          expiresAt: null,
          featured: false,
          createdAt: event.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        if (actionUrl) {
          await setDoc(doc(db, 'opportunityActionConfigs', opportunityId), {
            opportunityId,
            actionUrl,
            updatedAt: Timestamp.now(),
          })
        }
        migrated += 1
      }
      toast.success(`Migrated ${migrated} event${migrated === 1 ? '' : 's'}`)
      await loadOpportunities()
    } catch (error) {
      console.error('Failed to migrate events', error)
      toast.error('Failed to migrate events')
    } finally {
      setMigrating(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl bg-gray-100" onClick={() => navigate({ to: '/admin/cms' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student Opportunities</h1>
            <p className="text-sm text-gray-500">Curate Careers, Events, Learning and Experiences.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={migrating} onClick={() => void migrateEvents()}>
            {migrating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-2" />}
            Migrate Events
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setItems((current) => [createBlankOpportunity(), ...current])}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Opportunity
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-14 text-center text-gray-500">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
          Add the first student opportunity or migrate the existing Events feed.
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    {item.kind === 'career' ? <BriefcaseBusiness className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-bold">{item.titleEn || 'New opportunity'}</p>
                    <p className="text-xs text-gray-500">
                      {item.id} · {item.qualifiedActions || 0} qualified action{item.qualifiedActions === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => void removeItem(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Kind">
                  <select className="h-10 w-full rounded-md border px-3 bg-white" value={item.kind} onChange={(event) => updateItem(item.id, { kind: event.target.value as OpportunityKind })}>
                    {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select className="h-10 w-full rounded-md border px-3 bg-white" value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value as OpportunityStatus })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Provider"><Input value={item.providerName || ''} onChange={(event) => updateItem(item.id, { providerName: event.target.value })} /></Field>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="English title"><Input value={item.titleEn} onChange={(event) => updateItem(item.id, { titleEn: event.target.value })} /></Field>
                <Field label="Arabic title"><Input dir="rtl" value={item.titleAr || ''} onChange={(event) => updateItem(item.id, { titleAr: event.target.value })} /></Field>
                <Field label="English summary"><Textarea value={item.summaryEn || ''} onChange={(event) => updateItem(item.id, { summaryEn: event.target.value })} /></Field>
                <Field label="Arabic summary"><Textarea dir="rtl" value={item.summaryAr || ''} onChange={(event) => updateItem(item.id, { summaryAr: event.target.value })} /></Field>
                <Field label="English description"><Textarea rows={5} value={item.descriptionEn || ''} onChange={(event) => updateItem(item.id, { descriptionEn: event.target.value })} /></Field>
                <Field label="Arabic description"><Textarea rows={5} dir="rtl" value={item.descriptionAr || ''} onChange={(event) => updateItem(item.id, { descriptionAr: event.target.value })} /></Field>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Image URL"><Input type="url" value={item.imageUrl || ''} onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })} /></Field>
                <Field label="Secure action URL"><Input type="url" placeholder="https://partner.example/apply" value={item.actionUrl || ''} onChange={(event) => updateItem(item.id, { actionUrl: event.target.value })} /></Field>
                <Field label="English location"><Input value={item.locationEn || ''} onChange={(event) => updateItem(item.id, { locationEn: event.target.value })} /></Field>
                <Field label="Arabic location"><Input dir="rtl" value={item.locationAr || ''} onChange={(event) => updateItem(item.id, { locationAr: event.target.value })} /></Field>
                <Field label="Starts at"><Input type="datetime-local" value={toDateTimeInput(item.startsAt)} onChange={(event) => updateItem(item.id, { startsAt: event.target.value })} /></Field>
                <Field label="Apply by"><Input type="datetime-local" value={toDateTimeInput(item.deadline)} onChange={(event) => updateItem(item.id, { deadline: event.target.value })} /></Field>
              </div>

              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={item.featured === true} onChange={(event) => updateItem(item.id, { featured: event.target.checked })} />
                  Feature on mobile Home
                </label>
                <Button className="bg-gray-950 hover:bg-gray-800" disabled={savingId === item.id} onClick={() => void saveItem(item)}>
                  {savingId === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Opportunity
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
