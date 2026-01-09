import { createFileRoute } from '@tanstack/react-router'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { GalleryVerticalEnd } from 'lucide-react'
import { SignupForm } from '@/components/signup-form'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const fallback = '/dashboard' as const

export const Route = createFileRoute('/signup')({
    validateSearch: z.object({
        redirect: z.string().optional().catch(''),
    }),
    beforeLoad: ({ context, search }) => {
        if (context.auth.isAuthenticated) {
            throw redirect({ to: search.redirect || fallback })
        }
    },
    component: SignupComponent,
})

function SignupComponent() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="#" className="flex items-center gap-2 font-medium">
                        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                            <GalleryVerticalEnd className="size-4" />
                        </div>
                        ReelX
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <SignupForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background dark:from-primary/10 dark:via-primary/5 dark:to-background" />
            </div>
        </div>
    )
}
