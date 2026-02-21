import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/auth"
import { useNavigate, useRouter } from "@tanstack/react-router"
import * as React from "react"
import { Link } from "@tanstack/react-router"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const navigate = useNavigate()
  const { signupWithEmail } = useAuth()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("signup-name") as string
    const email = formData.get("signup-email") as string
    const password = formData.get("signup-password") as string
    const confirmPassword = formData.get("signup-confirm-password") as string

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      setIsLoading(false)
      return
    }

    try {
      await signupWithEmail(email, password, name)
      await router.invalidate()
      await navigate({ to: '/dashboard' })
    } catch (err) {
      console.error("Signup error:", err)
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleEmailSignup}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center">
            {error}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="signup-name">Full Name</FieldLabel>
          <Input id="signup-name" name="signup-name" type="text" placeholder="John Doe" required disabled={isLoading} autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input id="signup-email" name="signup-email" type="email" placeholder="m@example.com" required disabled={isLoading} autoComplete="username" />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input id="signup-password" name="signup-password" type="password" required disabled={isLoading} autoComplete="new-password" />
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-confirm-password">Confirm Password</FieldLabel>
          <Input id="signup-confirm-password" name="signup-confirm-password" type="password" required disabled={isLoading} autoComplete="new-password" />
          <FieldDescription>Please confirm your password.</FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isLoading} className="w-full bg-brand-green hover:bg-brand-green/90 text-white">
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </Field>
        <FieldDescription className="px-6 text-center pt-4">
          Already have an account?{" "}
          <Link to="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
