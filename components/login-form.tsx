"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, useSignIn } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { setVolunteerSession } from "@/lib/volunteer-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  redirectUrl,
  ...props
}: React.ComponentProps<"div"> & { redirectUrl?: string }) {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { fetchStatus, signIn } = useSignIn()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password.trim()) {
      setError("Please enter your email and password.")
      return
    }

    setIsSubmitting(true)
    try {
      if (isSignedIn) {
        router.replace("/")
        return
      }

      if (fetchStatus === "fetching" || !signIn) {
        setError("Clerk is still loading. Please try again.")
        return
      }

      const { error } = await signIn.password({
        identifier: normalizedEmail,
        password: password.trim(),
      })

      if (error) {
        setError(error.message ?? "Unable to log in with those credentials.")
        return
      }

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        setError("Unable to log in with those credentials.")
        return
      }

      const { error: finalizeError } = await signIn.finalize()
      if (finalizeError) {
        setError(finalizeError.message ?? "Unable to log in with those credentials.")
        return
      }

      setVolunteerSession({ email: normalizedEmail })

      const destination = redirectUrl ?? "/profile"
      window.location.assign(destination)

    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to login right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome to SahayakOS</h1>
                {/* <p className="text-balance text-muted-foreground">
                </p> */}
              </div>
              {/* Email */}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              {/* Password */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <span className="ml-auto text-sm text-muted-foreground">Forgot your password?</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              {/* Login Button */}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </Field>
              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field className="grid grid-cols-3 gap-4">
                {/* Google Login */}
                <Button variant="outline" type="button" className="col-start-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5 ">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Google</span>
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <a href="/signup">Sign up</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/vercel.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
