"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";

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

export function NgoLoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { fetchStatus, signIn } = useSignIn();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isSignedIn) {
      router.replace("/ngo");
    }
  }, [isSignedIn, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (isSignedIn) {
      router.replace("/ngo");
      return;
    }

    setIsSubmitting(true);
    try {
      if (fetchStatus === "fetching" || !signIn) {
        setError("Clerk is still loading. Please try again.");
        return;
      }

      const { error } = await signIn.password({
        emailAddress: normalizedEmail,
        password: password.trim(),
      });

      if (error) {
        setError(error.message ?? "Unable to log in with those credentials.");
        return;
      }

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        setError("Unable to log in with those credentials.");
        return;
      }

      await signIn.finalize();

      // After Clerk sign-in, redirect to dashboard.
      router.replace("/ngo");
    } catch (loginError) {
      console.error("NGO login error:", loginError);
      setError(loginError instanceof Error ? loginError.message : "Unable to log in right now.");
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
                <h1 className="text-2xl font-bold">NGO Login</h1>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@ngo.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  required
                />
              </Field>

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </Field>

              {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                New to the NGO portal?
              </FieldSeparator>

              <FieldDescription className="text-center">
                <a href="/ngo/signup">Create an NGO account</a>
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

export default function NgoLoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <NgoLoginForm />
      </div>
    </div>
  );
}
