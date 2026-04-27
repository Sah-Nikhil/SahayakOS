"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type OpportunityForm = {
  title: string;
  description: string;
  locationType: "hq" | "field" | "remote";
  city: string;
  lat: string;
  lng: string;
  start: string;
  end: string;
  durationHours: string;
  taskType: string;
  urgency: "low" | "medium" | "high";
  requiredSkills: string;
  skillPriorityMatrix: string;
  volunteersRequired: string;
};

const emptyOpportunityForm: OpportunityForm = {
  title: "",
  description: "",
  locationType: "field",
  city: "",
  lat: "",
  lng: "",
  start: "",
  end: "",
  durationHours: "",
  taskType: "",
  urgency: "medium",
  requiredSkills: "",
  skillPriorityMatrix: "",
  volunteersRequired: "1",
};

const splitValues = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const parseSkillPriorityMatrix = (value: string) =>
  splitValues(value).map((entry) => {
    const [skill, priorityValue] = entry.split(":");
    const priority = Number(priorityValue?.trim() ?? "0");
    return {
      skill: skill.trim(),
      priority: Number.isFinite(priority) ? priority : 0,
    };
  });

export function NgoDashboard({ className, ...props }: React.ComponentProps<"div">) {
  // Server-side ownership lookup replaces localStorage session
  const ngo = useQuery(api.queries.getNgoByOwner);
  const isNgoLoading = ngo === undefined;
  const ngoId = ngo?._id;

  const opportunities = useQuery(api.queries.getOpportunitiesByNgoId, ngoId ? { ngoId } : "skip");
  const createOpportunity = useMutation(api.mutations.createOpportunity);
  const updateOpportunityStatus = useMutation(api.mutations.updateOpportunityStatus);
  const [form, setForm] = React.useState<OpportunityForm>(emptyOpportunityForm);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!ngoId || !ngo) {
      setError("Create your NGO profile before listing opportunities.");
      return;
    }

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const durationHours = Number(form.durationHours);
    const volunteersRequired = Number(form.volunteersRequired);
    const start = new Date(form.start).getTime();
    const end = new Date(form.end).getTime();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.city.trim() ||
      !form.taskType.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(durationHours) ||
      !Number.isFinite(volunteersRequired) ||
      !Number.isFinite(start) ||
      !Number.isFinite(end)
    ) {
      setError("Please complete the opportunity form with valid values.");
      return;
    }

    if (end < start) {
      setError("Opportunity end time must be after the start time.");
      return;
    }

    const requiredSkills = splitValues(form.requiredSkills);
    const skillPriorityMatrix = parseSkillPriorityMatrix(form.skillPriorityMatrix);

    setIsSaving(true);
    try {
      await createOpportunity({
        ngoId,
        title: form.title.trim(),
        description: form.description.trim(),
        location: {
          type: form.locationType,
          city: form.city.trim(),
          lat,
          lng,
        },
        timeWindow: {
          start,
          end,
          durationHours,
        },
        taskType: form.taskType.trim(),
        urgency: form.urgency,
        requiredSkills,
        skillPriorityMatrix,
        volunteersRequired,
        status: "open",
      });

      setForm(emptyOpportunityForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save opportunity right now.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isNgoLoading) {
    return (
      <div className={className} {...props}>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading your NGO...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ngo) {
    return (
      <div className={className} {...props}>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Finish your NGO profile first so you can list opportunities here.
            </p>
            <Button className="mt-4" type="button" onClick={() => window.location.assign("/ngo/profile")}>
              Set up profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>NGO dashboard</CardTitle>
            <CardDescription>
              Manage opportunities for {ngo.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{ngo.name}</p>
              <p className="text-muted-foreground">
                {ngo.hqLocation.city}, {ngo.hqLocation.country}
              </p>
              <p className="text-muted-foreground">Registration ID: {ngo.registrationId}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Existing opportunities</h3>
              {(opportunities ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities yet.</p>
              ) : (
                (opportunities ?? []).map((opportunity) => (
                  <article key={opportunity._id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{opportunity.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {opportunity.location.city} • {opportunity.urgency} • {opportunity.status}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{opportunity.description}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(["open", "filled", "closed"] as const).map((status) => (
                          <Button
                            key={status}
                            type="button"
                            variant={opportunity.status === status ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              updateOpportunityStatus({
                                opportunityId: opportunity._id,
                                status,
                              })
                            }
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>List a new opportunity</CardTitle>
            <CardDescription>Keep the form lean, but capture the matching fields.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input id="title" value={form.title} onChange={handleChange} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="locationType">Location Type</FieldLabel>
                  <select
                    id="locationType"
                    value={form.locationType}
                    onChange={handleChange}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="hq">HQ</option>
                    <option value="field">Field</option>
                    <option value="remote">Remote</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <Input id="city" value={form.city} onChange={handleChange} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="lat">Latitude</FieldLabel>
                    <Input id="lat" type="number" value={form.lat} onChange={handleChange} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lng">Longitude</FieldLabel>
                    <Input id="lng" type="number" value={form.lng} onChange={handleChange} required />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="start">Start</FieldLabel>
                    <Input id="start" type="datetime-local" value={form.start} onChange={handleChange} required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="end">End</FieldLabel>
                    <Input id="end" type="datetime-local" value={form.end} onChange={handleChange} required />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="durationHours">Duration (hours)</FieldLabel>
                  <Input
                    id="durationHours"
                    type="number"
                    value={form.durationHours}
                    onChange={handleChange}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="taskType">Task Type</FieldLabel>
                  <Input id="taskType" value={form.taskType} onChange={handleChange} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="urgency">Urgency</FieldLabel>
                  <select
                    id="urgency"
                    value={form.urgency}
                    onChange={handleChange}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="requiredSkills">Required Skills</FieldLabel>
                  <Input
                    id="requiredSkills"
                    value={form.requiredSkills}
                    onChange={handleChange}
                    placeholder="first aid, logistics"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="skillPriorityMatrix">Skill Priority Matrix</FieldLabel>
                  <Input
                    id="skillPriorityMatrix"
                    value={form.skillPriorityMatrix}
                    onChange={handleChange}
                    placeholder="first aid:3, logistics:2"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="volunteersRequired">Volunteers Required</FieldLabel>
                  <Input
                    id="volunteersRequired"
                    type="number"
                    value={form.volunteersRequired}
                    onChange={handleChange}
                    required
                  />
                </Field>
                {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
                <Field>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Create opportunity"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NgoDashboard;
