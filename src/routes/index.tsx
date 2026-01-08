import { createFileRoute } from '@tanstack/react-router'
import { Link, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    // Log for debugging
    console.log('Checking context on index.tsx:', context) // Check if user is authenticated
    if (context.auth.isAuthenticated) {
      console.log('User authenticated, proceeding...')
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Welcome to TS Router + Firebase
      </h1>

      <div className="flex gap-4 mt-8">
        <Link
          to="/login"
          className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
        >
          Login
        </Link>
        <Link
          to="/dashboard"
          className="px-4 py-2 border border-gray-300 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Dashboard (Protected)
        </Link>
      </div>
    </div>
  )
}
