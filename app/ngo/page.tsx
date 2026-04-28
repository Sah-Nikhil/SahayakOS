"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { NgoDashboard } from "@/components/ngo-dashboard";
import { Button } from "@/components/ui/button";

export default function NgoPage() {
  const router = useRouter();
  const clerk = useClerk();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await clerk.signOut({ redirectUrl: "/ngo/login" });
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">NGO dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage opportunities for your NGO.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Manage your NGO</p>
            <p className="text-sm text-muted-foreground">
              You can update your NGO profile or logout.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => router.push("/ngo/profile")}>
              Profile
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>

        <NgoDashboard />
      </div>
    </main>
  );
}
