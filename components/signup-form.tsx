"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useConvex } from "convex/react"
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs"

import { api } from "@/convex/_generated/api"
import { retryOnConvexNotAuthenticated, waitForConvexToken } from "@/lib/clerk-convex-auth"
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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const convex = useConvex()
  const { isSignedIn, getToken } = useAuth()
  const { fetchStatus, signUp } = useSignUp()
  const { signIn } = useSignIn()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [verificationCode, setVerificationCode] = React.useState("")
  const [awaitingEmailVerification, setAwaitingEmailVerification] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const finalizeSignup = async ({
    normalizedEmail,
    normalizedPhone,
    normalizedName,
  }: {
    normalizedEmail: string
    normalizedPhone: string
    normalizedName: string
  }) => {
    if (fetchStatus === "fetching" || !signUp) {
      throw new Error("Clerk is still loading. Please try again.")
    }

    if (!signUp.createdSessionId) {
      throw new Error("Unable to activate the new session.")
    }

    const { error: finalizeError } = await signUp.finalize()
    if (finalizeError) {
      throw finalizeError
    }

    await waitForConvexToken(getToken)
    await retryOnConvexNotAuthenticated(async () => {
      await convex.mutation(api.volunteerAccounts.syncCurrentVolunteerAccount, {
        name: normalizedName,
        phone: normalizedPhone,
      })
    })
    const currentContext = await convex.query(api.volunteerAccounts.getCurrentVolunteerContext, {})
      setVolunteerSession({
        volunteerId: currentContext?.volunteer?._id,
        email: currentContext?.account?.email ?? normalizedEmail,
        name: currentContext?.account?.name ?? normalizedName,
        phone: currentContext?.account?.phone ?? normalizedPhone,
      })
    window.location.assign("/profile")
  }

  const handleResendCode = async () => {
    setError(null)
    setMessage(null)

    if (fetchStatus === "fetching" || !signUp) {
      setError("Clerk is still loading. Please try again.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error: resendError } = await signUp.verifications.sendEmailCode()
      if (resendError) {
        setError(resendError.message ?? "Unable to send a new verification code right now.")
        return
      }

      setMessage(
        `A new verification code was sent to ${signUp.emailAddress ?? email.trim().toLowerCase()}.`,
      )
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send a new verification code right now.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 10)
    const normalizedName = name.trim()

    if (isSignedIn) {
      router.replace("/")
      return
    }

    if (fetchStatus === "fetching" || !signUp) {
      setError("Clerk is still loading. Please try again.")
      return
    }

    if (awaitingEmailVerification) {
      if (!verificationCode.trim()) {
        setError("Please enter the verification code from your email.")
        return
      }

      setIsSubmitting(true)
      try {
        const { error: verificationError } = await signUp.verifications.verifyEmailCode({
          code: verificationCode.trim(),
        })

        if (verificationError) {
          setError(
            verificationError.message ??
              "Unable to verify the code. Please check the code and try again.",
          )
          return
        }

        if (signUp.status !== "complete" || !signUp.createdSessionId) {
          setError("Email verification is still pending. Please request a new code and try again.")
          return
        }

        await finalizeSignup({ normalizedEmail, normalizedPhone, normalizedName })
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to continue right now.",
        )
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!normalizedName || !normalizedEmail || !normalizedPhone || !password || !confirmPassword) {
      setError("Please fill in all fields before continuing.")
      return
    }

    if (password.length < 8 || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
      setError("Password must be at least 8 characters long, and include a number and a special character.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await signUp.password({
        emailAddress: normalizedEmail,
        password,
        firstName: normalizedName,
      })

      if (error) {
        setError(error.message ?? "Unable to continue right now.")
        return
      }

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await finalizeSignup({ normalizedEmail, normalizedPhone, normalizedName })
        return
      }

      const { error: sendCodeError } = await signUp.verifications.sendEmailCode()
      if (sendCodeError) {
        setError(sendCodeError.message ?? "Unable to send a verification code right now.")
        return
      }

      setAwaitingEmailVerification(true)
      setMessage(`We sent a verification code to ${normalizedEmail}. Enter it below to finish sign up.`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to continue right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!signIn) return
    try {
      await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/profile",
      })
    } catch (err) {
      console.error("Google signup error:", err)
      setError("Unable to start Google signup. Please try again.")
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
              {/* Name */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                </div>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={awaitingEmailVerification || isSubmitting}
                  required
                />
              </Field>
              {/* Email */}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={awaitingEmailVerification || isSubmitting}
                  required
                />
              </Field>
              {/* Phone Number */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                  {/* <a
                    href="/pwreset"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a> */}
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  disabled={awaitingEmailVerification || isSubmitting}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                {/* Password */}
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    {/* <a
                    href="/pwreset"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a> */}
                </div>
                <Input
                   id="password"
                   type="password"
                   value={password}
                   onChange={(event) => setPassword(event.target.value)}
                   disabled={awaitingEmailVerification || isSubmitting}
                   required
                 />
               </Field>
              {/* Confirm Password */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  {/* <a
                    href="/pwreset"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a> */}
                </div>
                <Input
                   id="confirm-password"
                   type="password"
                   value={confirmPassword}
                   onChange={(event) => setConfirmPassword(event.target.value)}
                   disabled={awaitingEmailVerification || isSubmitting}
                   required
                 />
               </Field>
               </div>
              {awaitingEmailVerification ? (
                <Field>
                  <FieldLabel htmlFor="verification-code">Email Verification Code</FieldLabel>
                  <Input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <FieldDescription>
                    Enter the verification code sent to your email.
                  </FieldDescription>
                </Field>
              ) : null}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {awaitingEmailVerification
                    ? isSubmitting
                      ? "Verifying..."
                      : "Verify Email"
                    : isSubmitting
                      ? "Continuing..."
                      : "Sign Up"}
                </Button>
              </Field>
              {awaitingEmailVerification ? (
                <Field>
                  <Button type="button" variant="outline" onClick={handleResendCode} disabled={isSubmitting}>
                    Resend verification code
                  </Button>
                </Field>
              ) : null}
              <div id="clerk-captcha" />
              {message ? <FieldDescription className="text-foreground">{message}</FieldDescription> : null}
              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
              {/* <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator> */}
              {/* Google Sign Up */}
              {/* <Field className="grid grid-cols-3 gap-4">
                <Button variant="outline" type="button" className="col-start-2" onClick={handleGoogleSignup}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5 ">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Google</span>
                </Button>
              </Field> */}
              <FieldDescription className="text-center">
                Already have an account? <a href="/login">Login</a>
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
