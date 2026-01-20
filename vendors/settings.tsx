import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ChevronRight, Pencil, Phone, PartyPopper, Settings } from 'lucide-react'

export const Route = createFileRoute('/admin/vendors/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    const settingsOptions = [
        {
            title: 'Profile & Branding',
            icon: <Pencil className="w-5 h-5" />,
            to: 'profile',
            color: 'text-orange-500',
        },
        {
            title: 'Contact Information',
            icon: <Phone className="w-5 h-5" />,
            to: 'contact',
            color: 'text-gray-600',
        },
        {
            title: 'Offers & Discounts',
            icon: <PartyPopper className="w-5 h-5" />,
            to: 'offers',
            color: 'text-pink-500',
        },
        {
            title: 'Admin Controls',
            icon: <Settings className="w-5 h-5" />,
            to: 'admin-controls',
            color: 'text-gray-600',
        },
    ]

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Navigation Menu / Tabs:</h2>
            </div>

            {/* List of Settings Options */}
            <div className="grid gap-4">
                {settingsOptions.map((option) => (
                    <div
                        key={option.title}
                        className="group flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-200"
                    >
                        <div className="flex items-center gap-5">
                            <div className={`${option.color} bg-gray-50 p-2 rounded-lg group-hover:bg-white transition-colors`}>
                                {option.icon}
                            </div>
                            <span className="text-xl font-medium text-gray-800">{option.title}</span>
                        </div>

                        <Link from={Route.fullPath} to={option.to}>
                            <Button
                                className="bg-[#6b7280] hover:bg-[#4b5563] text-white rounded-full px-8 h-12 flex items-center gap-2 text-sm font-semibold transition-all active:scale-95"
                            >
                                Manage <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )
}
