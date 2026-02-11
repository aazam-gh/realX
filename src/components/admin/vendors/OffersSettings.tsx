import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SquarePen, Plus, Loader2, ArrowLeft, Check, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Offer {
    id: string
    name: string
    description: string
    amount: number
    banner: string
    vendorID: string
    isActive?: boolean
}

interface OffersSettingsProps {
    vendorId: string | undefined
    vendorName?: string
}

export function OffersSettings({ vendorId, vendorName }: OffersSettingsProps) {
    const queryClient = useQueryClient()
    const [isCreating, setIsCreating] = useState(false)
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

    // Form states
    const [redemptionLimitType, setRedemptionLimitType] = useState<'no-limits' | 'limited'>('no-limits')
    const [perUserLimit, setPerUserLimit] = useState(false)
    const [totalRedemptionLimit, setTotalRedemptionLimit] = useState(false)
    const [branchAvailability, setBranchAvailability] = useState<'all' | 'specific'>('all')

    const { data: offers, isLoading, error } = useQuery({
        queryKey: ['offers', vendorId],
        queryFn: async () => {
            if (!vendorId) return []
            const q = query(
                collection(db, 'offers'),
                where('vendorID', '==', vendorId)
            )
            const snapshot = await getDocs(q)
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Offer[]
        },
        enabled: !!vendorId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: false,
    })

    const toggleMutation = useMutation({
        mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
            const docRef = doc(db, 'offers', offerId)
            await updateDoc(docRef, { isActive })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers', vendorId] })
            toast.success('Offer status updated')
        },
        onError: () => {
            toast.error('Failed to update offer status')
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 w-full text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-[#18B852] mb-2" />
                <span>Loading offers...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 w-full text-red-500">
                <p>Error loading offers: {error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['offers', vendorId] })}
                    className="mt-4"
                >
                    Retry
                </Button>
            </div>
        )
    }

    if (isCreating) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 border hover:bg-slate-100"
                        onClick={() => setIsCreating(false)}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">
                        <span className="text-slate-400 font-medium">{vendorName || 'Vendor'} / </span>
                        Create new Offer
                    </h1>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label htmlFor="titleEn" className="text-base font-medium">New Offer Title (English)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Input
                                id="titleEn"
                                placeholder={vendorName || 'Tim Hortons'}
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base h-12"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="titleAr" className="text-base font-medium">New Offer Title (Arabic)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Input
                                id="titleAr"
                                placeholder="تيم هورتنز"
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base h-12 text-right"
                                dir="rtl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="descEn" className="text-base font-medium">Offer Description (English)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Textarea
                                id="descEn"
                                placeholder="Tim Hortons"
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base min-h-[140px] resize-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="descAr" className="text-base font-medium">Offer Description (Arabic)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Textarea
                                id="descAr"
                                placeholder="Tim Hortons"
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base min-h-[140px] resize-none text-right"
                                dir="rtl"
                            />
                        </div>
                    </div>
                </div>

                {/* Redemption Settings */}
                <div className="space-y-6 pt-4">
                    <h3 className="text-xl font-bold">Redemption Settings (Optional Restrictions)</h3>

                    <div className="space-y-4">
                        <Label className="text-base font-medium">Redemption Limits:</Label>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setRedemptionLimitType('no-limits')
                                    setPerUserLimit(false)
                                    setTotalRedemptionLimit(false)
                                }}
                                className={`rounded-full px-6 h-10 font-medium transition-all ${redemptionLimitType === 'no-limits'
                                    ? 'bg-[#18B852] text-white hover:bg-[#18B852]/90'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {redemptionLimitType === 'no-limits' && <Check className="w-4 h-4 mr-2" />}
                                No Limits
                            </Button>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 h-10 border border-slate-200">
                                <Checkbox
                                    id="per-user-limit"
                                    checked={perUserLimit}
                                    onCheckedChange={(checked) => {
                                        setPerUserLimit(!!checked)
                                        if (checked) setRedemptionLimitType('limited')
                                        else if (!totalRedemptionLimit) setRedemptionLimitType('no-limits')
                                    }}
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <Label htmlFor="per-user-limit" className="cursor-pointer whitespace-nowrap">Limit Per User (E.g., "Once per week")</Label>
                                <Select disabled={!perUserLimit}>
                                    <SelectTrigger className="w-[40px] h-6 p-0 border-none bg-transparent focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="once">Once</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 h-10 border border-slate-200">
                                <Checkbox
                                    id="total-limit"
                                    checked={totalRedemptionLimit}
                                    onCheckedChange={(checked) => {
                                        setTotalRedemptionLimit(!!checked)
                                        if (checked) setRedemptionLimitType('limited')
                                        else if (!perUserLimit) setRedemptionLimitType('no-limits')
                                    }}
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <Label htmlFor="total-limit" className="cursor-pointer whitespace-nowrap">Limit Total Redemptions (E.g., "100 Redemptions Max")</Label>
                                <Select disabled={!totalRedemptionLimit}>
                                    <SelectTrigger className="w-[40px] h-6 p-0 border-none bg-transparent focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="500">500</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-base font-medium">Branch Availability:</Label>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setBranchAvailability('all')}
                                className={`rounded-full px-6 h-10 font-medium transition-all ${branchAvailability === 'all'
                                    ? 'bg-[#18B852] text-white hover:bg-[#18B852]/90'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {branchAvailability === 'all' && <Check className="w-4 h-4 mr-2" />}
                                All Branches
                            </Button>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 h-10 border border-slate-200">
                                <Checkbox
                                    id="specific-branches"
                                    checked={branchAvailability === 'specific'}
                                    onCheckedChange={(checked) => setBranchAvailability(checked ? 'specific' : 'all')}
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <Label htmlFor="specific-branches" className="cursor-pointer">Specific Branches Only</Label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pt-8">
                    <Button
                        variant="ghost"
                        onClick={() => setIsCreating(false)}
                        className="rounded-full px-6 h-12 text-base font-bold bg-slate-100 hover:bg-slate-200 text-black flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Cancel
                    </Button>
                    <Button
                        className="rounded-full px-8 h-12 text-base font-bold bg-[#18B852] hover:bg-[#18B852]/90 text-white shadow-lg shadow-green-200 flex items-center gap-2"
                    >
                        <div className="bg-white rounded-[4px] p-0.5">
                            <Check className="w-3 h-3 text-[#18B852]" strokeWidth={4} />
                        </div>
                        Save Offer
                    </Button>
                </div>
            </div>
        )

    }

    if (editingOffer) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 border hover:bg-slate-100"
                            onClick={() => setEditingOffer(null)}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="text-slate-400 font-medium">{vendorName || 'Vendor'} / </span>
                            Manage Offer
                        </h1>
                    </div>
                    {/* Delete Category Button - using Red as per screenshot */}
                    <Button
                        variant="destructive"
                        className="rounded-full px-6 h-10 bg-[#EF4444] hover:bg-[#DC2626] font-medium text-white flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Category
                    </Button>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label htmlFor="edit-titleEn" className="text-base font-medium">New Offer Title (English)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Input
                                id="edit-titleEn"
                                defaultValue={editingOffer.name}
                                placeholder={vendorName || 'Tim Hortons'}
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base h-12"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-titleAr" className="text-base font-medium">New Offer Title (Arabic)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Input
                                id="edit-titleAr"
                                placeholder="تيم هورتنز"
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base h-12 text-right"
                                dir="rtl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-descEn" className="text-base font-medium">Offer Description (English)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Textarea
                                id="edit-descEn"
                                defaultValue={editingOffer.description}
                                placeholder="Tim Hortons"
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base min-h-[140px] resize-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-descAr" className="text-base font-medium">Offer Description (Arabic)</Label>
                        <div className="bg-slate-50 p-1 rounded-xl">
                            <Textarea
                                id="edit-descAr"
                                placeholder="Tim Hortons"
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-base min-h-[140px] resize-none text-right"
                                dir="rtl"
                            />
                        </div>
                    </div>
                </div>

                {/* Redemption Settings */}
                <div className="space-y-6 pt-4">
                    <h3 className="text-xl font-bold">Redemption Settings (Optional Restrictions)</h3>

                    <div className="space-y-4">
                        <Label className="text-base font-medium">Redemption Limits:</Label>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setRedemptionLimitType('no-limits')
                                    setPerUserLimit(false)
                                    setTotalRedemptionLimit(false)
                                }}
                                className={`rounded-full px-6 h-10 font-medium transition-all ${redemptionLimitType === 'no-limits'
                                    ? 'bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90' // Purple for Manage View
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {redemptionLimitType === 'no-limits' && <Check className="w-4 h-4 mr-2" />}
                                No Limits
                            </Button>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 h-10 border border-slate-200">
                                <Checkbox
                                    id="edit-per-user-limit"
                                    checked={perUserLimit}
                                    onCheckedChange={(checked) => {
                                        setPerUserLimit(!!checked)
                                        if (checked) setRedemptionLimitType('limited')
                                        else if (!totalRedemptionLimit) setRedemptionLimitType('no-limits')
                                    }}
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <Label htmlFor="edit-per-user-limit" className="cursor-pointer whitespace-nowrap">Limit Per User (E.g., "Once per week")</Label>
                                <Select disabled={!perUserLimit}>
                                    <SelectTrigger className="w-[40px] h-6 p-0 border-none bg-transparent focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="once">Once</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 h-10 border border-slate-200">
                                <Checkbox
                                    id="edit-total-limit"
                                    checked={totalRedemptionLimit}
                                    onCheckedChange={(checked) => {
                                        setTotalRedemptionLimit(!!checked)
                                        if (checked) setRedemptionLimitType('limited')
                                        else if (!perUserLimit) setRedemptionLimitType('no-limits')
                                    }}
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <Label htmlFor="edit-total-limit" className="cursor-pointer whitespace-nowrap">Limit Total Redemptions (E.g., "100 Redemptions Max")</Label>
                                <Select disabled={!totalRedemptionLimit}>
                                    <SelectTrigger className="w-[40px] h-6 p-0 border-none bg-transparent focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="500">500</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-base font-medium">Branch Availability:</Label>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setBranchAvailability('all')}
                                className={`rounded-full px-6 h-10 font-medium transition-all ${branchAvailability === 'all'
                                    ? 'bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90' // Purple for Manage View
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {branchAvailability === 'all' && <Check className="w-4 h-4 mr-2" />}
                                All Branches
                            </Button>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 h-10 border border-slate-200">
                                <Checkbox
                                    id="edit-specific-branches"
                                    checked={branchAvailability === 'specific'}
                                    onCheckedChange={(checked) => setBranchAvailability(checked ? 'specific' : 'all')}
                                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                />
                                <Label htmlFor="edit-specific-branches" className="cursor-pointer">Specific Branches Only</Label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pt-8">
                    <Button
                        variant="ghost"
                        onClick={() => setEditingOffer(null)}
                        className="rounded-full px-6 h-12 text-base font-bold bg-slate-100 hover:bg-slate-200 text-black flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Cancel
                    </Button>
                    <Button
                        className="rounded-full px-8 h-12 text-base font-bold bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white shadow-lg shadow-purple-200 flex items-center gap-2"
                    >
                        <div className="bg-white rounded-[4px] p-0.5">
                            <Check className="w-3 h-3 text-[#8B5CF6]" strokeWidth={4} />
                        </div>
                        Save Offer
                    </Button>
                </div>
            </div>
        )
    }
    return (
        <div className="flex flex-wrap gap-8 items-start py-4 overflow-x-auto pb-8">
            {offers?.map((offer) => (
                <div key={offer.id} className="flex items-center gap-6">
                    <Card className="flex flex-col w-[340px] h-[360px] rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white p-8 group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(24,184,82,0.1)]">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-black text-[#1a1a1a] pr-4 leading-[1.1] tracking-tight">
                                {offer.name}
                            </h3>
                            <Switch
                                checked={offer.isActive ?? true}
                                onChange={(checked) => toggleMutation.mutate({ offerId: offer.id, isActive: checked })}
                                disabled={toggleMutation.isPending}
                            />
                        </div>

                        <div className="flex-grow space-y-4">
                            <p className="text-slate-500 font-medium leading-normal text-[15px]">
                                {offer.description}
                            </p>
                            <p className="text-slate-400 text-sm leading-normal whitespace-pre-wrap font-medium">
                                {offer.amount}% discount available
                            </p>
                        </div>

                        <Button
                            className="w-full bg-[#18B852] hover:bg-[#18B852]/90 text-white rounded-[20px] py-7 text-[16px] font-bold gap-3 shadow-[0_4px_15px_rgba(24,184,82,0.3)] transition-all active:scale-[0.98]"
                            onClick={() => setEditingOffer(offer)}
                        >
                            <SquarePen className="h-5 w-5" />
                            Manage Offer
                        </Button>
                    </Card>

                    {/* Visual Separator Handles */}
                    <div className="flex gap-[4px]">
                        <div className="w-[3px] h-10 bg-slate-200 rounded-full" />
                        <div className="w-[3px] h-10 bg-slate-200 rounded-full" />
                    </div>
                </div>
            ))}

            <Card className="flex flex-col items-center justify-between w-[340px] h-[360px] rounded-[32px] border-2 border-[#3b82f6] border-solid bg-white p-8 text-center transition-all shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <div className="flex-grow flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="relative h-24 w-24 flex items-center justify-center">
                            {/* Custom Wavy Badge Icon - Percent with Plus signs */}
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <path
                                    d="M50 5 L58 12 Q65 18 73 18 L82 18 Q90 18 90 27 L90 36 Q90 43 96 50 L96 50 Q90 57 90 64 L90 73 Q90 82 82 82 L73 82 Q65 82 58 88 L50 95 L42 88 Q35 82 27 82 L18 82 Q10 82 10 73 L10 64 Q10 57 4 50 L4 50 Q10 43 10 36 L10 27 Q10 18 18 18 L27 18 Q35 18 42 12 Z"
                                    fill="none"
                                    stroke="#18B852"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                />
                                <path d="M40 60 L60 40 M42 42 A3 3 0 1 1 42 41.9 M58 58 A3 3 0 1 1 58 57.9" stroke="#18B852" strokeWidth="6" strokeLinecap="round" />
                            </svg>
                            <Plus className="absolute top-0 right-0 h-8 w-8 text-[#18B852] stroke-[3]" />
                            <Plus className="absolute bottom-1 left-2 h-6 w-6 text-[#18B852] stroke-[3]" />
                        </div>
                    </div>

                    <p className="text-slate-500 font-bold text-[15px] max-w-[200px] leading-relaxed italic">
                        Get more discounts for students Yallah Admin! 🚀🔥
                    </p>
                </div>

                <Button
                    onClick={() => setIsCreating(true)}
                    className="w-full bg-[#18B852] hover:bg-[#18B852] text-white rounded-[20px] py-7 text-[16px] font-bold shadow-[0_4px_15px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98]"
                >
                    Create New Offer
                </Button>
            </Card>
        </div>
    )
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
    return (
        <div
            className={`w-[52px] h-[28px] rounded-full transition-all duration-300 cursor-pointer relative ${checked ? 'bg-[#18B852]' : 'bg-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onChange(!checked)}
        >
            <div
                className={`absolute top-1 left-1 w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 shadow-sm ${checked ? 'translate-x-[24px]' : 'translate-x-0'
                    }`}
            />
        </div>
    )
}
