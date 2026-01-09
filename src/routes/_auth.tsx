import { createFileRoute } from '@tanstack/react-router'
import { Outlet, redirect  } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
    // Check if user is authenticated
    if (!context.auth.isAuthenticated) {
      console.log('User not authenticated, redirecting to login...')
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
    console.log('User authenticated, proceeding...')
  },
  component: AuthLayout,
})

function AuthLayout() {

  return (
    <Outlet />
  )
}
