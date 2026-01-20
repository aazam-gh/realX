import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { useRouter } from '@tanstack/react-router'
import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

export const Route = createFileRoute('/admin')({
    beforeLoad: ({ context, location }) => {
        const { auth } = context

        // Wait until Firebase auth has resolved
        if (auth.isInitialLoading) {
            return
        }

        // Not logged in at all
        if (!auth.isAuthenticated) {
            throw redirect({
                to: '/login',
                search: { redirect: location.href },
            })
        }

        // Logged in but NOT admin
        if (!auth.isAdmin) {
            throw redirect({
                to: '/unauthorized',
            })
        }
    },
    component: AdminLayout,
})

function AdminLayout() {
    const { user, logout } = useAuth()
    const router = useRouter()
    // Use useNavigate from @tanstack/react-router as we are in the layout route
    const navigate = Route.useNavigate()

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout().then(() => {
                router.invalidate().finally(() => {
                    navigate({ to: '/login' })
                })
            })
        }
    }

    const sidebarUser = {
        name: user?.displayName || 'User',
        email: user?.email || '',
        avatar: user?.photoURL || '',
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AdminSidebar variant="inset" user={sidebarUser} onLogout={handleLogout} />
            <SidebarInset>
                <SiteHeader />
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    )
}
