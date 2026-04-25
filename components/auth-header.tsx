"use client";

import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthHeader() {
  return (
    <header className="flex items-center justify-end gap-3 border-b px-6 py-4">
      <AuthLoading>
        <div className="h-9" />
      </AuthLoading>
      <Unauthenticated>
        <SignInButton />
        <SignUpButton />
      </Unauthenticated>
      <Authenticated>
        <UserButton />
      </Authenticated>
    </header>
  );
}
