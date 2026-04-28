"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { SingleSelect } from "@/components/ui/single-select";
import { getCityMapConfigsFromEnv } from "@/lib/city-maps";
import { DAY_OPTIONS, SKILL_OPTIONS, type DayOptionValue } from "@/lib/form-options";
import {
  SkillPriorityMatrixEditor,
  type SkillPriorityEntry,
} from "@/components/skill-priority-matrix-editor";

type ScheduleMode = "duration" | "range";

type OpportunityForm = {
  title: string;
  description: string;
  locationType: "hq" | "field" | "remote";
  city: string;
  lat: string;
  lng: string;
  scheduleMode: ScheduleMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationHours: string;
  days: DayOptionValue[];
  taskType: string;
  urgency: "low" | "medium" | "high";
  requiredSkills: string[];
  skillPriorityMatrix: SkillPriorityEntry[];
  volunteersRequired: string;
};

const emptyOpportunityForm: OpportunityForm = {
  title: "",
  description: "",
  locationType: "field",
  city: "",
  lat: "",
  lng: "",
  scheduleMode: "duration",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  durationHours: "",
  days: [],
  taskType: "",
  urgency: "medium",
  requiredSkills: [],
  skillPriorityMatrix: [],
  volunteersRequired: "1",
};

const scheduleModeOptions = [
  { label: "Duration", value: "duration" },
  { label: "Start / End", value: "range" },
];

const urgencyOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const locationTypeOptions = [
  { label: "HQ", value: "hq" },
  { label: "Field", value: "field" },
  { label: "Remote", value: "remote" },
];

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const syncSkillPriorityMatrix = (requiredSkills: string[], existing: SkillPriorityEntry[]) => {
  const existingBySkill = new Map(existing.map((entry) => [normalizeSkill(entry.skill), entry.priority]));

  return requiredSkills.map((skill) => ({
    skill,
    priority: existingBySkill.get(normalizeSkill(skill)) ?? 1,
  }));
};

const toDateTime = (date: string, time: string) => {
  if (!date || !time) {
    return null;
  }

  const result = new Date(`${date}T${time}`);
  return Number.isNaN(result.getTime()) ? null : result;
};

const toPriorityPayload = (entries: SkillPriorityEntry[]) =>
  entries.map((entry) => ({
    skill: entry.skill.trim(),
    priority: Number(entry.priority),
  }));

export function NgoDashboard({ className, ...props }: React.ComponentProps<"div">) {
  const ngo = useQuery(api.queries.getNgoByOwner);
  const isNgoLoading = ngo === undefined;
  const ngoId = ngo?._id;
  const cityConfig = React.useMemo(() => getCityMapConfigsFromEnv(), []);
  const cityOptions = cityConfig.cities.map((city) => ({ label: city.name, value: city.name }));

  const opportunities = useQuery(api.queries.getOpportunitiesByNgoId, ngoId ? { ngoId } : "skip");
  const opportunityApplications = useQuery(
    api.queries.getOpportunityApplicationsForOwnedNgo,
    ngoId ? {} : "skip",
  );
  const createOpportunity = useMutation(api.mutations.createOpportunity);
  const updateOpportunityStatus = useMutation(api.mutations.updateOpportunityStatus);
  const deleteOpportunity = useMutation(api.mutations.deleteOpportunity);
  const reviewOpportunityApplication = useMutation(api.mutations.reviewOpportunityApplication);
  const [form, setForm] = React.useState<OpportunityForm>(emptyOpportunityForm);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingDeleteOpportunityId, setPendingDeleteOpportunityId] = React.useState<Id<"opportunities"> | null>(null);
  const [pendingReviewApplicationId, setPendingReviewApplicationId] = React.useState<Id<"opportunityApplications"> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const applicationsByOpportunityId = React.useMemo(() => {
    const grouped = new Map<Id<"opportunities">, NonNullable<typeof opportunityApplications>[number][]>();
    for (const application of opportunityApplications ?? []) {
      const existing = grouped.get(application.opportunityId);
      if (existing) {
        existing.push(application);
      } else {
        grouped.set(application.opportunityId, [application]);
      }
    }
    return grouped;
  }, [opportunityApplications]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleRequiredSkillsChange = (selected: string[]) => {
    setForm((prev) => ({
      ...prev,
      requiredSkills: selected,
      skillPriorityMatrix: syncSkillPriorityMatrix(selected, prev.skillPriorityMatrix),
    }));
  };

  const handlePriorityChange = (nextValue: SkillPriorityEntry[]) => {
    setForm((prev) => ({ ...prev, skillPriorityMatrix: nextValue }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!ngoId || !ngo) {
      setError("Create your NGO profile before listing opportunities.");
      return;
    }

    if (cityConfig.error) {
      setError(cityConfig.error);
      return;
    }

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const volunteersRequired = Number(form.volunteersRequired);
    const durationHours = Number(form.durationHours);
    const requiredSkills = form.requiredSkills.map((skill) => skill.trim()).filter((skill) => skill.length > 0);
    const skillPriorityMatrix = toPriorityPayload(form.skillPriorityMatrix);

    if (!cityOptions.some((option) => option.value === form.city)) {
      setError("Please choose a city from the dropdown.");
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.taskType.trim()) {
      setError("Please complete the opportunity form with valid values.");
      return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(volunteersRequired)) {
      setError("Latitude, longitude, and volunteers required must be valid numbers.");
      return;
    }

    if (form.days.length === 0) {
      setError("Please select at least one day.");
      return;
    }

    if (requiredSkills.length === 0) {
      setError("Please select at least one required skill.");
      return;
    }

    if (skillPriorityMatrix.length !== requiredSkills.length) {
      setError("Skill priorities must match the selected required skills.");
      return;
    }

    for (const entry of skillPriorityMatrix) {
      if (!requiredSkills.some((skill) => normalizeSkill(skill) === normalizeSkill(entry.skill))) {
        setError("Skill priority matrix can only include required skills.");
        return;
      }

      if (!Number.isFinite(entry.priority) || entry.priority < 1 || entry.priority > 5) {
        setError("Each skill priority must be between 1 and 5.");
        return;
      }
    }

    let start = 0;
    let end = 0;
    let computedDurationHours = 0;

    if (form.scheduleMode === "duration") {
      const startDateTime = toDateTime(form.startDate, form.startTime);
      if (!startDateTime || !Number.isFinite(durationHours) || durationHours <= 0) {
        setError("Enter a valid start date, start time, and duration.");
        return;
      }

      start = startDateTime.getTime();
      end = start + durationHours * 60 * 60 * 1000;
      computedDurationHours = durationHours;
    } else {
      const startDateTime = toDateTime(form.startDate, form.startTime);
      const endDateTime = toDateTime(form.endDate, form.endTime);

      if (!startDateTime || !endDateTime) {
        setError("Enter valid start and end dates and times.");
        return;
      }

      start = startDateTime.getTime();
      end = endDateTime.getTime();

      if (end <= start) {
        setError("Opportunity end time must be after the start time.");
        return;
      }

      computedDurationHours = Number(((end - start) / 3_600_000).toFixed(2));
    }

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
          durationHours: computedDurationHours,
        },
        days: form.days,
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

  const handleDeleteOpportunity = async (opportunityId: Id<"opportunities">) => {
    setError(null);

    if (!window.confirm("Remove this opportunity from your catalogue? This cannot be undone.")) {
      return;
    }

    setPendingDeleteOpportunityId(opportunityId);
    try {
      await deleteOpportunity({ opportunityId });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to remove opportunity right now.");
    } finally {
      setPendingDeleteOpportunityId((current) => (current === opportunityId ? null : current));
    }
  };

  const handleReviewOpportunityApplication = async (
    applicationId: Id<"opportunityApplications">,
    status: "approved" | "denied",
  ) => {
    setError(null);
    setPendingReviewApplicationId(applicationId);
    try {
      await reviewOpportunityApplication({ applicationId, status });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to review this application right now.",
      );
    } finally {
      setPendingReviewApplicationId((current) => (current === applicationId ? null : current));
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
            <CardDescription>Manage opportunities for {ngo.name}.</CardDescription>
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
                        <p className="mt-2 text-xs text-muted-foreground">
                          Days: {opportunity.days?.length ? opportunity.days.join(", ") : "Not set"} •{" "}
                          {opportunity.timeWindow.durationHours} hour
                          {opportunity.timeWindow.durationHours !== 1 ? "s" : ""}
                        </p>
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Applications: {(applicationsByOpportunityId.get(opportunity._id) ?? []).length}
                          </p>
                          {(applicationsByOpportunityId.get(opportunity._id) ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No volunteers have applied yet.</p>
                          ) : (
                            (applicationsByOpportunityId.get(opportunity._id) ?? []).map((application) => (
                              <div key={application._id} className="rounded-md border p-3">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{application.volunteer.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {application.volunteer.contactDetails.email}
                                      {application.volunteer.contactDetails.phone
                                        ? ` • ${application.volunteer.contactDetails.phone}`
                                        : ""}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {application.volunteer.location}
                                    </p>
                                    {application.volunteer.skills.length > 0 ? (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Skills: {application.volunteer.skills.join(", ")}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                      {application.status}
                                    </p>
                                    <div className="flex gap-2">
                                      {(["approved", "denied"] as const).map((status) => (
                                        <Button
                                          key={status}
                                          type="button"
                                          size="sm"
                                          variant={application.status === status ? "default" : "outline"}
                                          onClick={() =>
                                            void handleReviewOpportunityApplication(application._id, status)
                                          }
                                          disabled={pendingReviewApplicationId === application._id}
                                        >
                                          {status}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
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
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDeleteOpportunity(opportunity._id)}
                            disabled={pendingDeleteOpportunityId === opportunity._id}
                          >
                            {pendingDeleteOpportunityId === opportunity._id ? "Removing..." : "Remove"}
                          </Button>
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
            <CardDescription>Use the dropdowns to keep the data aligned with the rest of the app.</CardDescription>
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
                  <Input id="description" value={form.description} onChange={handleChange} required />
                </Field>

                <Field>
                  <FieldLabel htmlFor="locationType">Location Type</FieldLabel>
                  <SingleSelect
                    id="locationType"
                    value={form.locationType}
                    options={locationTypeOptions}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        locationType: value as OpportunityForm["locationType"],
                      }))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <SingleSelect
                    id="city"
                    value={form.city}
                    options={cityOptions}
                    onChange={(value) => setForm((prev) => ({ ...prev, city: value }))}
                    placeholder="Select a city"
                    disabled={cityOptions.length === 0}
                  />
                  <FieldDescription>
                    {cityConfig.error ?? "Only cities from the app configuration can be selected."}
                  </FieldDescription>
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

                <Field>
                  <FieldLabel htmlFor="days">Days</FieldLabel>
                  <MultiSelect
                    options={DAY_OPTIONS}
                    selected={form.days}
                    onChange={(days) =>
                      setForm((prev) => ({ ...prev, days: days as DayOptionValue[] }))
                    }
                    placeholder="Select days"
                  />
                  <FieldDescription>Pick the weekdays this opportunity should run on.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="scheduleMode">Schedule Type</FieldLabel>
                  <SingleSelect
                    id="scheduleMode"
                    value={form.scheduleMode}
                    options={scheduleModeOptions}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        scheduleMode: value as ScheduleMode,
                      }))
                    }
                    placeholder="Choose a schedule type"
                  />
                </Field>

                {form.scheduleMode === "duration" ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                      <Input id="startDate" type="date" value={form.startDate} onChange={handleChange} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="startTime">Start Time</FieldLabel>
                      <Input id="startTime" type="time" value={form.startTime} onChange={handleChange} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="durationHours">Duration (hours)</FieldLabel>
                      <Input
                        id="durationHours"
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={form.durationHours}
                        onChange={handleChange}
                        required
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Field>
                      <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                      <Input id="startDate" type="date" value={form.startDate} onChange={handleChange} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="startTime">Start Time</FieldLabel>
                      <Input id="startTime" type="time" value={form.startTime} onChange={handleChange} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="endDate">End Date</FieldLabel>
                      <Input id="endDate" type="date" value={form.endDate} onChange={handleChange} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="endTime">End Time</FieldLabel>
                      <Input id="endTime" type="time" value={form.endTime} onChange={handleChange} required />
                    </Field>
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="taskType">Task Type</FieldLabel>
                  <Input id="taskType" value={form.taskType} onChange={handleChange} required />
                </Field>

                <Field>
                  <FieldLabel htmlFor="urgency">Urgency</FieldLabel>
                  <SingleSelect
                    id="urgency"
                    value={form.urgency}
                    options={urgencyOptions}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        urgency: value as OpportunityForm["urgency"],
                      }))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="requiredSkills">Required Skills</FieldLabel>
                  <MultiSelect
                    options={SKILL_OPTIONS}
                    selected={form.requiredSkills}
                    onChange={handleRequiredSkillsChange}
                    placeholder="Select required skills"
                  />
                  <FieldDescription>Use the same skill list as volunteer profiles.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="skillPriorityMatrix">Skill Priority Matrix</FieldLabel>
                  <SkillPriorityMatrixEditor value={form.skillPriorityMatrix} onChange={handlePriorityChange} />
                  <FieldDescription>Priorities are locked to the skills selected above.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="volunteersRequired">Volunteers Required</FieldLabel>
                  <Input
                    id="volunteersRequired"
                    type="number"
                    min="1"
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
