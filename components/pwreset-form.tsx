"use client"

import * as React from "react"
import { useSignIn } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type ResetStep = "email" | "code" | "password" | "done"

export function PwResetForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { fetchStatus, signIn } = useSignIn()
  const [step, setStep] = React.useState<ResetStep>("email")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const normalizedEmail = email.trim().toLowerCase()

  const ensureClerkReady = () => {
    if (fetchStatus === "fetching" || !signIn) {
      throw new Error("Clerk is still loading. Please try again.")
    }
  }

  const restartFlow = () => {
    setStep("email")
    setEmail("")
    setCode("")
    setPassword("")
    setConfirmPassword("")
    setMessage(null)
    setError(null)
  }

  const handleResendCode = async () => {
    setError(null)
    setMessage(null)

    if (step === "email") {
      return
    }

    setIsSubmitting(true)
    try {
      ensureClerkReady()
      const { error: resendError } =
        await signIn.resetPasswordEmailCode.sendCode()

      if (resendError) {
        setError(
          resendError.message ??
            "Unable to send a new reset code right now.",
        )
        return
      }

      setMessage(`A new reset code was sent to ${normalizedEmail}.`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send a new reset code right now.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (fetchStatus === "fetching" || !signIn) {
      setError("Clerk is still loading. Please try again.")
      return
    }

    if (step === "email") {
      if (!normalizedEmail) {
        setError("Please enter your email address.")
        return
      }

      setIsSubmitting(true)
      try {
        await signIn.create({ identifier: normalizedEmail })
        const { error: sendError } =
          await signIn.resetPasswordEmailCode.sendCode()

        if (sendError) {
          setError(
            sendError.message ?? "Unable to send a reset code right now.",
          )
          return
        }

        setStep("code")
        setMessage(`We sent a reset code to ${normalizedEmail}. Enter it below to continue.`)
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to send a reset code right now.",
        )
      } finally {
        setIsSubmitting(false)
      }

      return
    }

    if (step === "code") {
      if (!code.trim()) {
        setError("Please enter the reset code from your email.")
        return
      }

      setIsSubmitting(true)
      try {
        const { error: verifyError } =
          await signIn.resetPasswordEmailCode.verifyCode({
            code: code.trim(),
          })

        if (verifyError) {
          setError(
            verifyError.message ??
              "Unable to verify the code. Please try again.",
          )
          return
        }

        if (signIn.status !== "needs_new_password") {
          setError(
            "The code was accepted, but the password reset flow is not ready yet. Please request a new code and try again.",
          )
          return
        }

        setStep("password")
        setMessage("Code verified. Choose a new password below.")
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to verify the code right now.",
        )
      } finally {
        setIsSubmitting(false)
      }

      return
    }

    if (step === "password") {
      if (!password || !confirmPassword) {
        setError("Please enter and confirm your new password.")
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }

      setIsSubmitting(true)
      try {
        const { error: submitError } =
          await signIn.resetPasswordEmailCode.submitPassword({
            password,
            signOutOfOtherSessions: true,
          })

        if (submitError) {
          setError(
            submitError.message ??
              "Unable to update your password right now.",
          )
          return
        }

        setStep("done")
        setCode("")
        setPassword("")
        setConfirmPassword("")
        setMessage(null)
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to update your password right now.",
        )
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const isEmailStep = step === "email"
  const isCodeStep = step === "code"
  const isPasswordStep = step === "password"
  const isDoneStep = step === "done"

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <span className="sr-only">SahayakOS</span>
              </div>
            </div>
            <h1 className="text-xl font-bold">Reset your password</h1>
            <FieldDescription className="text-center">
              Enter the code sent to your email, then choose a new password.
            </FieldDescription>
          </div>

          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="email">Email</FieldLabel>
              {!isEmailStep ? (
                <button
                  type="button"
                  onClick={restartFlow}
                  className="ml-auto text-sm text-muted-foreground hover:underline"
                  disabled={isSubmitting}
                >
                  Use a different email
                </button>
              ) : null}
            </div>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!isEmailStep || isSubmitting}
              required
            />
          </Field>

          {isCodeStep ? (
            <Field>
              <FieldLabel htmlFor="code">Reset code</FieldLabel>
              <Input
                id="code"
                type="text"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <FieldDescription>
                Check your email and enter the reset code here.
              </FieldDescription>
            </Field>
          ) : null}

          {isPasswordStep ? (
            <Field>
              <FieldDescription>
                Code verified. Set your new password below.
              </FieldDescription>
            </Field>
          ) : null}

          {isPasswordStep ? (
            <>
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Field>
            </>
          ) : null}

          {!isDoneStep ? (
            <Field>
              <Button type="submit" disabled={isSubmitting}>
                {isEmailStep
                  ? isSubmitting
                    ? "Sending code..."
                    : "Send reset code"
                  : isCodeStep
                    ? isSubmitting
                      ? "Verifying..."
                      : "Verify code"
                    : isPasswordStep
                      ? isSubmitting
                        ? "Updating..."
                        : "Update password"
                      : "Continue"}
              </Button>
            </Field>
          ) : null}

          {isCodeStep || isPasswordStep ? (
            <Field>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isSubmitting}
              >
                Resend code
              </Button>
            </Field>
          ) : null}

          {isDoneStep ? (
            <FieldDescription className="text-foreground text-center">
              Password updated successfully.{" "}
              <a href="/login" className="underline">
                Go to login
              </a>
              .
            </FieldDescription>
          ) : null}

          {message ? (
            <FieldDescription className="text-foreground">{message}</FieldDescription>
          ) : null}
          {error ? (
            <FieldDescription className="text-destructive">{error}</FieldDescription>
          ) : null}

          {!isDoneStep ? <FieldSeparator>Or</FieldSeparator> : null}
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
