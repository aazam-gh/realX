import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 text-foreground overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute h-full w-full bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-sm">
            Authenticated Routes
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A secure foundation for your next big idea. Built with TanStack Router, Firebase, and modern React patterns.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30 active:scale-95 text-lg"
          >
            Get Started
          </Link>
          <Link
            to="/dashboard"
            className="px-8 py-3.5 rounded-full border border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground font-semibold transition-all hover:scale-105 active:scale-95 text-lg"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
