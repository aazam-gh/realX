import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/admin/vendors/contact')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link from={Route.fullPath} to="..">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Menu
                    </Button>
                </Link>
                <h2 className="text-2xl font-bold tracking-tight">Contact Information</h2>
            </div>

            <div className="bg-white border rounded-xl p-8">
                <p className="text-gray-500 text-lg">Manage vendor contact details and communication settings here.</p>
            </div>
        </div>
    )
}
