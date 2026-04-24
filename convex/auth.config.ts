import type { AuthConfig } from "convex/server";

const clerkDomain = process.env.CLERK_FRONTEND_API_URL;

if (!clerkDomain) {
  throw new Error("Missing Clerk issuer domain in environment.");
}

const authConfig = {
  providers: [
    {
      domain: clerkDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

export default authConfig;
