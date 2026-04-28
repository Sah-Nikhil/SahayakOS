"use client";

import * as React from "react";
import { useAction } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";

export type OpportunityDraft = {
  title: string;
  description: string;
  urgency: "Low" | "Medium" | "High";
  requiredSkills: string[];
  taskType: string;
};

type DraftOpportunityWithAiProps = {
  onDraftReady: (draft: OpportunityDraft) => void;
};

export function DraftOpportunityWithAi({ onDraftReady }: DraftOpportunityWithAiProps) {
  const draftOpportunity = useAction(api.ai.draftOpportunity);
  const [inputNotes, setInputNotes] = React.useState("");
  const [isDrafting, setIsDrafting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleDraft = async () => {
    setError(null);
    setMessage(null);

    const trimmedInput = inputNotes.trim();
    if (trimmedInput.length === 0) {
      setError("Add some rough notes first.");
      return;
    }

    setIsDrafting(true);
    try {
      const draft = await draftOpportunity({ inputNotes: trimmedInput });
      onDraftReady(draft);
      setMessage("Draft generated. Review and edit before publishing.");
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Unable to draft right now.");
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Draft with AI</p>
      <textarea
        value={inputNotes}
        onChange={(event) => setInputNotes(event.target.value)}
        placeholder="Paste rough notes, bullet points, or voice memo transcript..."
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="button" variant="outline" onClick={() => void handleDraft()} disabled={isDrafting}>
        {isDrafting ? "Drafting..." : "Draft with AI"}
      </Button>
      {message ? <FieldDescription className="text-primary">{message}</FieldDescription> : null}
      {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
    </div>
  );
}
