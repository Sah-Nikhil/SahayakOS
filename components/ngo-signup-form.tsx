"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function NgoSignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { fetchStatus, signUp } = useSignUp();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [awaitingEmailVerification, setAwaitingEmailVerification] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const finalizeSignup = async () => {
    if (fetchStatus === "fetching" || !signUp) {
      throw new Error("Clerk is still loading. Please try again.");
    }

    if (signUp.status !== "complete" || !signUp.createdSessionId) {
      throw new Error("Signup is not complete.");
    }

    await signUp.finalize();

    // After Clerk signup, redirect to profile creation.
    router.replace("/ngo/profile");
  };

  const handleResendCode = async () => {
    setError(null);
    setMessage(null);

    if (fetchStatus === "fetching" || !signUp) {
      setError("Clerk is still loading. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setError(error.message ?? "Unable to send a new verification code right now.");
        return;
      }
      setMessage(`A new verification code was sent to ${signUp.emailAddress ?? email.trim().toLowerCase()}.`);
    } catch (submitError) {
      console.error("Resend code error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send a new verification code right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (isSignedIn) {
      router.replace("/ngo/profile");
      return;
    }

    if (fetchStatus === "fetching" || !signUp) {
      setError("Clerk is still loading. Please try again.");
      return;
    }

    if (awaitingEmailVerification) {
      if (!verificationCode.trim()) {
        setError("Please enter the verification code from your email.");
        return;
      }

      setIsSubmitting(true);
      try {
        const { error: verificationError } = await signUp.verifications.verifyEmailCode({
          code: verificationCode.trim(),
        });

        if (verificationError) {
          setError(
            verificationError.message ?? "Unable to verify the code. Please check the code and try again.",
          );
          return;
        }

        if (signUp.status !== "complete" || !signUp.createdSessionId) {
          setError("Email verification is still pending. Please check the code and try again.");
          return;
        }

        await finalizeSignup();
      } catch (submitError) {
        console.error("Verification error:", submitError);
        setError(submitError instanceof Error ? submitError.message : "Unable to continue right now.");
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields before continuing.");
      return;
    }

    if (password.length < 8 || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
      setError("Password must be at least 8 characters long, and include a number and a special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signUp.password({
        emailAddress: normalizedEmail,
        password,
      });

      if (error) {
        setError(error.message ?? "Unable to continue right now.");
        return;
      }

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await finalizeSignup();
        return;
      }

      const { error: sendCodeError } = await signUp.verifications.sendEmailCode();
      if (sendCodeError) {
        setError(sendCodeError.message ?? "Unable to send a verification code right now.");
        return;
      }

      setAwaitingEmailVerification(true);
      setMessage(`We sent a verification code to ${normalizedEmail}. Enter it below to finish sign up.`);
    } catch (submitError) {
      console.error("Signup error:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to continue right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create NGO account</h1>
                <p className="text-sm text-muted-foreground">
                  This only creates the NGO login. You will build the public profile next.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="ngo@example.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={awaitingEmailVerification || isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={awaitingEmailVerification || isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={awaitingEmailVerification || isSubmitting}
                  required
                />
              </Field>

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
                      ? "Creating account..."
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
              {message ? <FieldDescription>{message}</FieldDescription> : null}
              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Already onboarded?
              </FieldSeparator>

              <FieldDescription className="text-center">
                <a href="/ngo/login">Log in to your NGO account</a>
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
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}

export default NgoSignupForm;
