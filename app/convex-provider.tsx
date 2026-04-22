"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

type Props = {
  children: React.ReactNode;
};

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in environment.");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: Props) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
