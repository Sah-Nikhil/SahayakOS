"use client"

import * as React from "react"
import { api } from "@/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

interface ApplyModalProps {
  isOpen: boolean
  onClose: () => void
  opportunityId: string
  opportunityTitle?: string
  opportunityLocation?: string
}

export function ApplyModal({
  isOpen,
  onClose,
  opportunityId,
  opportunityTitle = "Opportunity",
  opportunityLocation,
}: ApplyModalProps) {
  const [coverLetter, setCoverLetter] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const applyToOpportunity = useMutation(api.mutations.applyToOpportunity)
  const opportunity = useQuery(api.queries.getOpportunityById, isOpen && opportunityId ? { opportunityId: opportunityId as Id<"opportunities"> } : "skip")
  const volunteerContext = useQuery(api.volunteerAccounts.getCurrentVolunteerContext)

  const availabilityWarning = React.useMemo(() => {
    if (!opportunity?.days || opportunity.days.length === 0) return null;
    const volunteer = volunteerContext?.volunteer;
    if (!volunteer?.availability) return null;

    const availableDays = new Set(
      volunteer.availability.days
        .filter((d: any) => d.enabled)
        .map((d: any) => d.day)
    );

    const missingDays = opportunity.days.filter((day: string) => !availableDays.has(day));
    if (missingDays.length > 0) {
      return `Warning: Your availability doesn't perfectly align with the required days (${opportunity.days.join(", ")}). You may still apply, but the NGO will see this.`;
    }
    return null;
  }, [opportunity, volunteerContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!coverLetter.trim()) {
      setError("Please write a cover letter before applying.")
      return
    }

    setIsSubmitting(true)
    try {
      await applyToOpportunity({
        opportunityId: opportunityId as Id<"opportunities">,
        coverLetter,
      })
      setMessage("Successfully applied to the opportunity!")
      setCoverLetter("")
      setTimeout(() => {
        onClose()
        setMessage(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Apply to Opportunity</CardTitle>
          <CardDescription>
            <div className="mt-2 space-y-1">
              <p className="font-medium text-foreground">{opportunityTitle}</p>
              {opportunityLocation && (
                <p className="text-sm text-muted-foreground">{opportunityLocation}</p>
              )}
            </div>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="cover-letter">Cover Letter</FieldLabel>
                <textarea
                  id="cover-letter"
                  className={cn(
                    "flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  placeholder="Tell us why you'd like to volunteer for this opportunity and what relevant experience or skills you bring..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <FieldDescription>
                  Share your motivation and relevant experience (optional but recommended)
                </FieldDescription>
              </Field>
              {availabilityWarning ? (
                <FieldDescription className="text-amber-600 font-medium">{availabilityWarning}</FieldDescription>
              ) : null}
              {message ? (
                <FieldDescription className="text-green-600">{message}</FieldDescription>
              ) : null}
              {error ? (
                <FieldDescription className="text-destructive">{error}</FieldDescription>
              ) : null}
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Submitting..." : "Apply"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
