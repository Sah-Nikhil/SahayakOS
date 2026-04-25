import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/login-form"

export default async function LoginPage(props: PageProps<"/login">) {
  const { userId } = await auth()
  const searchParams = await props.searchParams
  const redirectUrl = Array.isArray(searchParams.redirect_url)
    ? searchParams.redirect_url[0]
    : searchParams.redirect_url

  if (userId) {
    redirect("/")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm redirectUrl={redirectUrl} />
      </div>
    </div>
  )
}
