import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import {
    AlertTriangle,
    CheckCircle2,
    Gift,
    Loader2,
    Pause,
    Play,
    RefreshCw,
    ShieldCheck,
    Square,
    TicketCheck,
    Users,
} from 'lucide-react'
import { toast } from 'sonner'

import badrgoLogo from '@/assets/badrgo-logo.png'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { functions } from '@/firebase/config'

export const Route = createFileRoute('/admin/pilot-campaign/')({
    component: PilotCampaignPage,
})

type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'

type CampaignSummary = {
    exists: boolean
    campaignId?: string
    brandName?: string
    status?: CampaignStatus
    uiApproved?: boolean
    totalCodes?: number
    publicLimit?: number
    reservedLimit?: number
    publicAssignedCount?: number
    reservedAssignedCount?: number
    startsAt?: string | null
    endsAt?: string | null
    title?: string
    titleAr?: string
    description?: string
    descriptionAr?: string
    instructions?: string
    instructionsAr?: string
    destinationUrl?: string
}

const defaults = {
    title: 'Your next ride is on us',
    titleAr: 'مشوارك القادم علينا',
    description: 'The first 80 eligible realX users can claim one complimentary Badrgo ride code.',
    descriptionAr: 'أول ٨٠ مستخدمًا مؤهلًا في realX يمكنهم الحصول على رمز رحلة مجانية من بدر جو.',
    instructions: 'Copy your personal code and apply it in Badrgo. One code per verified realX account.',
    instructionsAr: 'انسخ رمزك الشخصي واستخدمه في بدر جو. رمز واحد لكل حساب realX موثّق.',
    destinationUrl: 'https://badrgo.com',
    startsAt: '',
    endsAt: '',
    codes: '',
}

const parseCodes = (value: string) => value
    .split(/[\s,;]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)

const toIso = (value: string) => value ? new Date(value).toISOString() : null

function MetricCard({
    label,
    value,
    helper,
    icon: Icon,
}: {
    label: string
    value: string
    helper: string
    icon: typeof Users
}) {
    return (
        <Card className="border-slate-200 shadow-none">
            <CardContent className="flex items-start justify-between p-5">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{helper}</p>
                </div>
                <div className="rounded-2xl bg-[#fff0f3] p-3 text-[#CF0A2C]">
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    )
}

function PilotCampaignPage() {
    const queryClient = useQueryClient()
    const [form, setForm] = useState(defaults)
    const [approvalConfirmed, setApprovalConfirmed] = useState(false)
    const [reservedRecipient, setReservedRecipient] = useState('')

    const summaryQuery = useQuery({
        queryKey: ['badrgo-pilot-admin'],
        queryFn: async () => {
            const callable = httpsCallable(functions, 'getBadrgoPilotAdminSummary')
            const result = await callable({})
            return result.data as CampaignSummary
        },
        retry: false,
        refetchInterval: 15_000,
    })

    const codes = useMemo(() => parseCodes(form.codes), [form.codes])
    const duplicateCount = codes.length - new Set(codes).size
    const invalidCount = codes.filter((code) => !/^[A-Z0-9]{6,32}$/.test(code)).length
    const inventoryReady = codes.length === 100 && duplicateCount === 0 && invalidCount === 0
    const summary = summaryQuery.data
    const publicAssigned = summary?.publicAssignedCount || 0
    const reservedAssigned = summary?.reservedAssignedCount || 0

    const configureMutation = useMutation({
        mutationFn: async () => {
            const callable = httpsCallable(functions, 'configureBadrgoPilotCampaign')
            return callable({
                ...form,
                startsAt: toIso(form.startsAt),
                endsAt: toIso(form.endsAt),
                codes,
            })
        },
        onSuccess: async () => {
            setForm((current) => ({ ...current, codes: '' }))
            setApprovalConfirmed(false)
            await queryClient.invalidateQueries({ queryKey: ['badrgo-pilot-admin'] })
            toast.success('Draft saved with 80 public and 20 reserved codes')
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Unable to save campaign draft')
        },
    })

    const statusMutation = useMutation({
        mutationFn: async (status: CampaignStatus) => {
            const callable = httpsCallable(functions, 'setBadrgoPilotCampaignStatus')
            return callable({ status, uiApproved: status === 'active' ? approvalConfirmed : undefined })
        },
        onSuccess: async (_, status) => {
            await queryClient.invalidateQueries({ queryKey: ['badrgo-pilot-admin'] })
            toast.success(status === 'active' ? 'Campaign activated' : `Campaign ${status}`)
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Unable to change campaign status')
        },
    })

    const reserveMutation = useMutation({
        mutationFn: async () => {
            const value = reservedRecipient.trim()
            const callable = httpsCallable(functions, 'assignBadrgoReservedCoupon')
            return callable(value.includes('@') ? { email: value } : { uid: value })
        },
        onSuccess: async () => {
            setReservedRecipient('')
            await queryClient.invalidateQueries({ queryKey: ['badrgo-pilot-admin'] })
            toast.success('Reserved coupon assigned')
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Unable to assign reserved coupon')
        },
    })

    const handleActivation = () => {
        if (!approvalConfirmed) {
            toast.error('Confirm partner UI approval before activation')
            return
        }
        if (!window.confirm('Activate the public first-come, first-served allocation now?')) return
        statusMutation.mutate('active')
    }

    const handleEnd = () => {
        if (!window.confirm('End this campaign permanently? Existing assignments will remain available.')) return
        statusMutation.mutate('ended')
    }

    return (
        <div className="mx-auto w-full max-w-[1500px] space-y-8 p-5 md:p-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#CF0A2C]">
                        <Gift className="h-4 w-4" />
                        Badrgo × realX
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Ride pilot campaign</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Manage the protected 80-code public allocation and 20-code reserved pool. Saving creates a draft only.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-8 px-3 capitalize">
                        {summary?.status || (summaryQuery.isLoading ? 'loading' : 'not configured')}
                    </Badge>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Refresh campaign status"
                        onClick={() => void summaryQuery.refetch()}
                        disabled={summaryQuery.isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${summaryQuery.isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    label="Public allocation"
                    value={`${publicAssigned} / ${summary?.publicLimit || 80}`}
                    helper={`${Math.max(0, (summary?.publicLimit || 80) - publicAssigned)} available first come, first served`}
                    icon={Users}
                />
                <MetricCard
                    label="Reserved allocation"
                    value={`${reservedAssigned} / ${summary?.reservedLimit || 20}`}
                    helper={`${Math.max(0, (summary?.reservedLimit || 20) - reservedAssigned)} available for selected participants`}
                    icon={TicketCheck}
                />
                <MetricCard
                    label="Protected inventory"
                    value={`${summary?.totalCodes || 0} / 100`}
                    helper={summary?.uiApproved ? 'Partner UI approval recorded' : 'Activation locked pending UI approval'}
                    icon={ShieldCheck}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
                <Card className="border-slate-200 shadow-none">
                    <CardHeader>
                        <CardTitle>Campaign draft</CardTitle>
                        <CardDescription>
                            Paste the Codes column from the supplied Excel workbook. Codes are sent only to the protected backend.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="title">English title</Label>
                                <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="titleAr">Arabic title</Label>
                                <Input id="titleAr" dir="rtl" value={form.titleAr} onChange={(event) => setForm({ ...form, titleAr: event.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">English description</Label>
                                <Textarea id="description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="descriptionAr">Arabic description</Label>
                                <Textarea id="descriptionAr" dir="rtl" rows={3} value={form.descriptionAr} onChange={(event) => setForm({ ...form, descriptionAr: event.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="startsAt">Start time</Label>
                                <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endsAt">End time</Label>
                                <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="destinationUrl">Badrgo destination URL</Label>
                                <Input id="destinationUrl" type="url" value={form.destinationUrl} onChange={(event) => setForm({ ...form, destinationUrl: event.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Label htmlFor="codes">Coupon inventory</Label>
                                <div className="flex gap-2 text-xs">
                                    <Badge variant={codes.length === 100 ? 'default' : 'outline'}>{codes.length} / 100</Badge>
                                    {duplicateCount > 0 && <Badge variant="destructive">{duplicateCount} duplicate</Badge>}
                                    {invalidCount > 0 && <Badge variant="destructive">{invalidCount} invalid</Badge>}
                                </div>
                            </div>
                            <Textarea
                                id="codes"
                                value={form.codes}
                                onChange={(event) => setForm({ ...form, codes: event.target.value })}
                                rows={8}
                                spellCheck={false}
                                className="font-mono text-xs"
                                placeholder="Paste all 100 codes here—one per line"
                            />
                            <p className="text-xs text-slate-500">
                                The first 80 rows become public inventory; the final 20 become the reserved pool. Codes are never returned to this page.
                            </p>
                        </div>

                        <Button
                            onClick={() => configureMutation.mutate()}
                            disabled={!inventoryReady || configureMutation.isPending || publicAssigned > 0 || reservedAssigned > 0}
                            className="bg-slate-950 text-white hover:bg-slate-800"
                        >
                            {configureMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save protected draft
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="overflow-hidden border-[#CF0A2C]/20 shadow-none">
                        <div className="h-2 bg-[#CF0A2C]" />
                        <CardHeader>
                            <CardTitle>Mobile UI preview</CardTitle>
                            <CardDescription>Partner-facing placement and redemption CTA.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-[30px] border border-[#CF0A2C]/20 bg-white p-6 text-center shadow-[0_18px_48px_rgba(207,10,44,0.10)]">
                                <div className="mx-auto mb-5 flex h-24 max-w-60 items-center justify-center rounded-3xl bg-white p-3">
                                    <img src={badrgoLogo} alt="Badrgo" className="h-full w-full object-contain" />
                                </div>
                                <p className="text-2xl font-semibold tracking-tight text-slate-950">{form.title}</p>
                                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">{form.description}</p>
                                <div className="mt-6 rounded-2xl bg-[#CF0A2C] px-5 py-4 text-sm font-semibold text-white">
                                    Claim my ride code
                                </div>
                                <p className="mt-3 text-xs text-slate-500">First 80 verified users. First come, first served.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-none">
                        <CardHeader>
                            <CardTitle>Activation gate</CardTitle>
                            <CardDescription>The public allocation cannot open until partner UI approval is confirmed.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                                <Checkbox
                                    checked={approvalConfirmed}
                                    onCheckedChange={(checked) => setApprovalConfirmed(checked === true)}
                                />
                                <span className="text-sm leading-5 text-slate-700">
                                    Badrgo has reviewed and approved the logo placement and redemption CTA.
                                </span>
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={handleActivation}
                                    disabled={!summary?.exists || !approvalConfirmed || statusMutation.isPending || summary?.status === 'active'}
                                    className="bg-[#CF0A2C] text-white hover:bg-[#b90927]"
                                >
                                    <Play className="h-4 w-4" />
                                    Activate campaign
                                </Button>
                                {summary?.status === 'active' && (
                                    <Button variant="outline" onClick={() => statusMutation.mutate('paused')} disabled={statusMutation.isPending}>
                                        <Pause className="h-4 w-4" /> Pause
                                    </Button>
                                )}
                                {summary?.exists && summary.status !== 'ended' && (
                                    <Button variant="outline" onClick={handleEnd} disabled={statusMutation.isPending}>
                                        <Square className="h-4 w-4" /> End
                                    </Button>
                                )}
                            </div>
                            {!summary?.uiApproved && (
                                <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    Saving the inventory does not make the campaign visible in the app.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-none">
                        <CardHeader>
                            <CardTitle>Assign reserved code</CardTitle>
                            <CardDescription>Use the protected 20-code pool for a selected participant.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input
                                value={reservedRecipient}
                                onChange={(event) => setReservedRecipient(event.target.value)}
                                placeholder="Firebase UID or verified email"
                            />
                            <Button
                                variant="outline"
                                onClick={() => reserveMutation.mutate()}
                                disabled={!reservedRecipient.trim() || reserveMutation.isPending || !summary?.exists}
                            >
                                {reserveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Assign reserved coupon
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    )
}
