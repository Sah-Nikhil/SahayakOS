"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useConvex } from "convex/react"

import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { setNgoSession } from "@/lib/ngo-session"
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

export function NgoLoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const convex = useConvex()
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
      let ngo = null

      if (normalizedEmail.includes("@")) {
        ngo = await convex.query(api.ngos.getNgoByPocEmail, { email: normalizedEmail })
      } else {
        ngo = await convex.query(api.ngos.getNgoByRegistrationId, { registrationId: normalizedEmail })
      }

      if (!ngo) {
        setIsSubmitting(false)
        setError("No NGO profile found for this email or registration ID. Please sign up first.")
        return
      }

      setNgoSession({
        ngoId: ngo._id,
        email: ngo.pocDetails?.email,
        name: ngo.ngoName,
        phone: ngo.pocDetails?.phone,
      })

      router.push("/ngo")
    } catch (error) {
      setIsSubmitting(false)
      setError(error instanceof Error ? error.message : "Unable to login right now.")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">NGO Login</h1>
              </div>

              <Field>
                <FieldLabel htmlFor="emailOrReg">Email or Registration ID</FieldLabel>
                <Input
                  id="emailOrReg"
                  type="text"
                  placeholder="contact@ngo.org or REG-1234"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </Field>

              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">Or continue with</FieldSeparator>

              <FieldDescription className="text-center">
                Don't have an NGO account? <a href="/ngo/signup">Sign up</a>
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
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}

export default function NgoLoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <NgoLoginForm />
      </div>
    </div>
  )
}
