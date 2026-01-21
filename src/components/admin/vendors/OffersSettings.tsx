import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SquarePen, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Vendor } from '@/routes/admin/vendors/$vendorId.settings'

interface OffersSettingsProps {
    formData: Vendor | null
    setFormData: (val: any) => void
}

export function OffersSettings({ formData: _formData, setFormData: _setFormData }: OffersSettingsProps) {
    const [offers] = useState([
        {
            id: 1,
            title: '20% Student Discount',
            description: 'Get a 20% Student Discount on the Total Bill.',
            details: 'The discount is available for Dine-In and Takeaway across all branches.',
            active: true
        },
        {
            id: 2,
            title: 'B1G1 Donuts',
            description: 'Buy any Medium Size Latte & Get any Classic Donut FREE.',
            details: 'The discount is available for Dine-In and Takeaway across all branches.\n\n*This applies to Hot or Iced Latte (Regular or Spanish).',
            active: true
        }
    ])

    return (
        <div className="flex flex-wrap gap-8 items-start py-4 overflow-x-auto pb-8">
            {offers.map((offer) => (
                <div key={offer.id} className="flex items-center gap-6">
                    <Card className="flex flex-col w-[340px] h-[360px] rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white p-8 group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(124,58,237,0.1)]">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-black text-[#1a1a1a] pr-4 leading-[1.1] tracking-tight">
                                {offer.title}
                            </h3>
                            <Switch checked={offer.active} />
                        </div>

                        <div className="flex-grow space-y-4">
                            <p className="text-slate-500 font-medium leading-normal text-[15px]">
                                {offer.description}
                            </p>
                            <p className="text-slate-400 text-sm leading-normal whitespace-pre-wrap font-medium">
                                {offer.details}
                            </p>
                        </div>

                        <Button className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-[20px] py-7 text-[16px] font-bold gap-3 shadow-[0_4px_15px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98]">
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
                                    stroke="#7c3aed"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                />
                                <path d="M40 60 L60 40 M42 42 A3 3 0 1 1 42 41.9 M58 58 A3 3 0 1 1 58 57.9" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
                            </svg>
                            <Plus className="absolute top-0 right-0 h-8 w-8 text-[#7c3aed] stroke-[3]" />
                            <Plus className="absolute bottom-1 left-2 h-6 w-6 text-[#7c3aed] stroke-[3]" />
                        </div>
                    </div>

                    <p className="text-slate-500 font-bold text-[15px] max-w-[200px] leading-relaxed italic">
                        Get more discounts for students Yallah Admin! 🚀🔥
                    </p>
                </div>

                <Button className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-[20px] py-7 text-[16px] font-bold shadow-[0_4px_15px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98]">
                    Create New Offer
                </Button>
            </Card>
        </div>
    )
}

function Switch({ checked }: { checked: boolean }) {
    return (
        <div
            className={`w-[52px] h-[28px] rounded-full transition-all duration-300 cursor-pointer relative ${checked ? 'bg-[#7c3aed]' : 'bg-slate-200'
                }`}
        >
            <div
                className={`absolute top-1 left-1 w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 shadow-sm ${checked ? 'translate-x-[24px]' : 'translate-x-0'
                    }`}
            />
        </div>
    )
}
