import { createFileRoute } from '@tanstack/react-router'
import { Shield } from 'lucide-react'

export const Route = createFileRoute('/admin')({
    component: AdminComponent,
})

function AdminComponent() {
    return (
        <div className="min-h-svh flex flex-col items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6 p-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="size-8 text-primary" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
                    <p className="text-muted-foreground">
                        Welcome to the admin dashboard. This page is under construction.
                    </p>
                </div>
            </div>
        </div>
    )
}
