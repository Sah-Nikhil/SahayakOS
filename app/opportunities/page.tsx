import { NgoOpportunityMap } from "@/components/ngo-opportunity-map";

export default function OpportunitiesPage() {
  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">NGO opportunity map</h1>
          <p className="text-sm text-muted-foreground">
            Live Convex data with city, skill, and urgency filters.
          </p>
        </header>
        <NgoOpportunityMap />
      </div>
    </main>
  );
}
