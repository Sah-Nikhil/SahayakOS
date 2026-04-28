"use client";

import * as React from "react";
import { useAction } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";

type VolunteerMatch = {
  volunteerId: string;
  name: string;
  matchReason: string;
  score: number;
};

type SmartMatchButtonProps = {
  opportunityId: Id<"opportunities">;
};

export function SmartMatchButton({ opportunityId }: SmartMatchButtonProps) {
  const matchVolunteers = useAction(api.ai.matchVolunteersToOpportunity);
  const [isMatching, setIsMatching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [matches, setMatches] = React.useState<VolunteerMatch[]>([]);

  const handleMatch = async () => {
    setError(null);
    setIsMatching(true);
    try {
      const result = await matchVolunteers({ opportunityId });
      setMatches(result.matches);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to generate matches.");
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" onClick={() => void handleMatch()} disabled={isMatching}>
        {isMatching ? "Matching..." : "Smart Match"}
      </Button>
      {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
      {matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map((match) => (
            <div key={match.volunteerId} className="rounded-md border p-2">
              <p className="text-sm font-medium">
                {match.name} ({Math.round(match.score)}/100)
              </p>
              <p className="text-xs text-muted-foreground">{match.matchReason}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
