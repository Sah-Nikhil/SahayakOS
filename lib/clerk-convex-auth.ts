type GetClerkToken = (options: {
  template?: "convex"
  skipCache?: boolean
}) => Promise<string | null>

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })

export async function waitForConvexToken(getToken: GetClerkToken) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let token: string | null = null
    try {
      token = await getToken({
        template: "convex",
        skipCache: attempt > 0,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes("No JWT template exists with name: convex")) {
        throw new Error(
          "Clerk JWT template \"convex\" is missing. Create a Clerk JWT template named \"convex\" and set its audience claim to \"convex\", then try again.",
        )
      }
      throw error
    }

    if (token) {
      return
    }

    await delay(150 + attempt * 50)
  }

  throw new Error("Signed in, but your authenticated session is still initializing. Please try again.")
}

export async function retryOnConvexNotAuthenticated<T>(operation: () => Promise<T>) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isNotAuthenticated = errorMessage.includes("Not authenticated")

      if (!isNotAuthenticated || attempt === 4) {
        throw error
      }

      await delay(150 + attempt * 100)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to complete this request right now.")
}
