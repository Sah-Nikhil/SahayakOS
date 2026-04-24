import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { SignupForm } from "@/components/signup-form"

export default async function SignupPage() {
  const { userId } = await auth()

  if (userId) {
    redirect("/")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
