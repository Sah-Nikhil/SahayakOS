import { mutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  opportunityDayOfWeekValidator,
  ngoHqLocationValidator,
  opportunityLocationValidator,
  opportunityStatusValidator,
  opportunityTimeWindowValidator,
  opportunityUrgencyValidator,
  applicationStatusValidator,
} from "./schema";

const normalizeStringArray = (values: string[]) =>
  values.map((value) => value.trim()).filter((value) => value.length > 0);

type OpportunitySkillPriorityEntry = {
  skill: string;
  priority: number;
};

type OpportunityWriteInput = {
  ngoId: Id<"ngos">;
  title: string;
  description: string;
  location: {
    type: "hq" | "field" | "remote";
    city: string;
    lat: number;
    lng: number;
  };
  timeWindow: {
    start: number;
    end: number;
    durationHours: number;
  };
  days?: Array<
    | "sunday"
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
  >;
  taskType: string;
  urgency: "low" | "medium" | "high";
  requiredSkills: string[];
  skillPriorityMatrix: OpportunitySkillPriorityEntry[];
  volunteersRequired: number;
};

const opportunityWriteArgs = {
  ngoId: v.id("ngos"),
  title: v.string(),
  description: v.string(),
  location: opportunityLocationValidator,
  timeWindow: opportunityTimeWindowValidator,
  days: v.optional(v.array(opportunityDayOfWeekValidator)),
  taskType: v.string(),
  urgency: opportunityUrgencyValidator,
  requiredSkills: v.array(v.string()),
  skillPriorityMatrix: v.array(
    v.object({
      skill: v.string(),
      priority: v.number(),
    }),
  ),
  volunteersRequired: v.number(),
};

const normalizeOpportunityWriteInput = (args: OpportunityWriteInput) => {
  if (args.timeWindow.end < args.timeWindow.start) {
    throw new Error("timeWindow.end must be greater than or equal to timeWindow.start.");
  }

  const requiredSkills = normalizeStringArray(args.requiredSkills);
  const requiredSkillSet = new Set(requiredSkills.map((skill) => skill.toLowerCase()));
  const skillPriorityMatrix = args.skillPriorityMatrix
    .map((entry) => ({
      skill: entry.skill.trim(),
      priority: entry.priority,
    }))
    .filter((entry) => entry.skill.length > 0);

  if (requiredSkills.length === 0) {
    throw new Error("Select at least one required skill.");
  }

  if (skillPriorityMatrix.length === 0) {
    throw new Error("Select at least one skill priority.");
  }

  for (const entry of skillPriorityMatrix) {
    if (!requiredSkillSet.has(entry.skill.toLowerCase())) {
      throw new Error("Skill priority matrix can only include required skills.");
    }
  }

  const normalizedOpportunity = {
    ngoId: args.ngoId,
    title: args.title.trim(),
    description: args.description.trim(),
    location: {
      type: args.location.type,
      city: args.location.city.trim(),
      lat: args.location.lat,
      lng: args.location.lng,
    },
    timeWindow: args.timeWindow,
    days: args.days && args.days.length > 0 ? args.days : undefined,
    taskType: args.taskType.trim(),
    urgency: args.urgency,
    requiredSkills,
    skillPriorityMatrix,
    volunteersRequired: args.volunteersRequired,
  };

  if (args.days && args.days.length > 0) {
    return {
      ...normalizedOpportunity,
      days: args.days,
    };
  }

  return normalizedOpportunity;
};

const opportunityApplicationReviewStatusValidator = v.union(
  v.literal("approved"),
  v.literal("denied"),
);

const requireOwnerIdentity = async (ctx: MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated. Please sign in first.");
  }
  return identity;
};

const requireOwnedNgo = async (ctx: MutationCtx, ngoId: Id<"ngos">) => {
  const identity = await requireOwnerIdentity(ctx);
  const ngo = await ctx.db.get(ngoId);
  if (!ngo) {
    throw new Error("NGO not found.");
  }

  if (ngo.ownerTokenIdentifier !== identity.tokenIdentifier) {
    throw new Error("You do not own this NGO.");
  }

  return ngo;
};

const requireCurrentVolunteerProfile = async (ctx: MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated. Please sign in first.");
  }

  const account = await ctx.db
    .query("volunteerAccounts")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!account) {
    throw new Error("Volunteer account not found. Please complete volunteer onboarding first.");
  }

  const volunteer =
    (account.volunteerId ? await ctx.db.get(account.volunteerId) : null) ??
    (await ctx.db
      .query("volunteers")
      .withIndex("by_volunteerAccountId", (q) => q.eq("volunteerAccountId", account._id))
      .unique());

  if (!volunteer) {
    throw new Error("Please complete your volunteer profile before applying.");
  }

  return { account, volunteer };
};

export const createNGO = mutation({
  args: {
    name: v.string(),
    registrationId: v.string(),
    description: v.optional(v.string()),
    hqLocation: ngoHqLocationValidator,
    coverageAreas: v.array(v.string()),
    focusAreas: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOwnerIdentity(ctx);

    // Ensure one NGO per Clerk account
    const existingOwned = await ctx.db
      .query("ngos")
      .withIndex("by_ownerTokenIdentifier", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (existingOwned) {
      throw new Error("You already have an NGO registered. Use the edit form to update it.");
    }

    const existingRegistration = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) => q.eq("registrationId", args.registrationId))
      .unique();

    if (existingRegistration) {
      throw new Error("An NGO with this registrationId already exists.");
    }

    return await ctx.db.insert("ngos", {
      name: args.name.trim(),
      registrationId: args.registrationId.trim(),
      description: args.description?.trim() || undefined,
      hqLocation: args.hqLocation,
      coverageAreas: normalizeStringArray(args.coverageAreas),
      focusAreas: normalizeStringArray(args.focusAreas),
      ownerTokenIdentifier: identity.tokenIdentifier,
      createdAt: Date.now(),
    });
  },
});

export const updateNGO = mutation({
  args: {
    ngoId: v.id("ngos"),
    name: v.string(),
    registrationId: v.string(),
    description: v.optional(v.string()),
    hqLocation: ngoHqLocationValidator,
    coverageAreas: v.array(v.string()),
    focusAreas: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOwnerIdentity(ctx);

    const existingNgo = await ctx.db.get(args.ngoId);
    if (!existingNgo) {
      throw new Error("NGO not found.");
    }

    if (existingNgo.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("You do not own this NGO.");
    }

    const conflictingNgo = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) => q.eq("registrationId", args.registrationId))
      .unique();

    if (conflictingNgo && conflictingNgo._id !== args.ngoId) {
      throw new Error("An NGO with this registrationId already exists.");
    }

    await ctx.db.patch(args.ngoId, {
      name: args.name.trim(),
      registrationId: args.registrationId.trim(),
      description: args.description?.trim() || undefined,
      hqLocation: args.hqLocation,
      coverageAreas: normalizeStringArray(args.coverageAreas),
      focusAreas: normalizeStringArray(args.focusAreas),
    });

    return await ctx.db.get(args.ngoId);
  },
});

export const createOpportunity = mutation({
  args: {
    ...opportunityWriteArgs,
    status: opportunityStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireOwnedNgo(ctx, args.ngoId);
    const normalizedOpportunity = normalizeOpportunityWriteInput(args);
    return await ctx.db.insert("opportunities", {
      ...normalizedOpportunity,
      createdAt: Date.now(),
      status: args.status,
    });
  },
});

export const upsertOpportunityFromN8n = mutation({
  args: {
    opportunityId: v.optional(v.id("opportunities")),
    ...opportunityWriteArgs,
    status: v.optional(opportunityStatusValidator),
  },
  handler: async (ctx, args) => {
    const normalizedOpportunity = normalizeOpportunityWriteInput(args);
    const opportunityId = args.opportunityId;
    const existingOpportunity = opportunityId ? await ctx.db.get(opportunityId) : null;

    if (opportunityId && !existingOpportunity) {
      throw new Error("Opportunity not found.");
    }

    if (existingOpportunity) {
      if (!opportunityId) {
        throw new Error("Opportunity id is required for updates.");
      }

      await ctx.db.patch(opportunityId, {
        ...normalizedOpportunity,
        ...(args.status ? { status: args.status } : {}),
      });
      return {
        action: "updated" as const,
        opportunityId,
      };
    }

    const newOpportunityId = await ctx.db.insert("opportunities", {
      ...normalizedOpportunity,
      status: args.status ?? "open",
      createdAt: Date.now(),
    });

    return {
      action: "inserted" as const,
      opportunityId: newOpportunityId,
    };
  },
});

export const updateOpportunityStatus = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    status: opportunityStatusValidator,
  },
  handler: async (ctx, args) => {
    const existingOpportunity = await ctx.db.get(args.opportunityId);
    if (!existingOpportunity) {
      throw new Error("Opportunity not found.");
    }

    await ctx.db.patch(args.opportunityId, { status: args.status });
    return await ctx.db.get(args.opportunityId);
  },
});

export const applyToOpportunity = mutation({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const { account, volunteer } = await requireCurrentVolunteerProfile(ctx);
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    if (opportunity.status !== "open") {
      throw new Error("This opportunity is no longer accepting applications.");
    }

    const existingApplication = await ctx.db
      .query("opportunityApplications")
      .withIndex("by_volunteer_and_opportunity", (q) =>
        q.eq("volunteerId", volunteer._id).eq("opportunityId", args.opportunityId),
      )
      .unique();

    if (existingApplication) {
      return {
        applicationId: existingApplication._id,
        status: existingApplication.status,
        created: false,
      };
    }

    const applicationId = await ctx.db.insert("opportunityApplications", {
      opportunityId: args.opportunityId,
      ngoId: opportunity.ngoId,
      volunteerId: volunteer._id,
      volunteerAccountId: account._id,
      status: "pending",
      appliedAt: Date.now(),
    });

    return {
      applicationId,
      status: "pending" as Doc<"opportunityApplications">["status"],
      created: true,
    };
  },
});

export const reviewOpportunityApplication = mutation({
  args: {
    applicationId: v.id("opportunityApplications"),
    status: opportunityApplicationReviewStatusValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireOwnerIdentity(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const ngo = await ctx.db.get(application.ngoId);
    if (!ngo) {
      throw new Error("NGO not found.");
    }

    if (ngo.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("You do not own this NGO.");
    }

    if (application.status !== args.status) {
      await ctx.db.patch(args.applicationId, {
        status: args.status,
        reviewedAt: Date.now(),
        reviewedByTokenIdentifier: identity.tokenIdentifier,
      });
    }

    return await ctx.db.get(args.applicationId);
  },
});

export const deleteOpportunity = mutation({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    const identity = await requireOwnerIdentity(ctx);
    const existingOpportunity = await ctx.db.get(args.opportunityId);
    if (!existingOpportunity) {
      throw new Error("Opportunity not found.");
    }

    const ngo = await ctx.db.get(existingOpportunity.ngoId);
    if (!ngo) {
      throw new Error("NGO not found.");
    }

    if (ngo.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("You do not own this NGO.");
    }

    const applications = await ctx.db
      .query("opportunityApplications")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", args.opportunityId))
      .take(500);

    for (const application of applications) {
      await ctx.db.delete(application._id);
    }

    await ctx.db.delete(args.opportunityId);
    return args.opportunityId;
  },
});

export const createVolunteerApplication = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    coverLetter: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated. Please sign in first.");
    }

    // Get volunteer account
    const volunteerAccount = await ctx.db
      .query("volunteerAccounts")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!volunteerAccount) {
      throw new Error("Volunteer account not found.");
    }

    // Check if opportunity exists
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    // Check if already applied
    const existingApplication = await ctx.db
      .query("volunteerApplications")
      .withIndex("by_volunteer_opportunity", (q) =>
        q.eq("volunteerAccountId", volunteerAccount._id).eq("opportunityId", args.opportunityId),
      )
      .unique();

    if (existingApplication) {
      throw new Error("You have already applied to this opportunity.");
    }

    return await ctx.db.insert("volunteerApplications", {
      volunteerAccountId: volunteerAccount._id,
      opportunityId: args.opportunityId,
      coverLetter: args.coverLetter.trim(),
      status: "pending",
      appliedAt: Date.now(),
    });
  },
});

export const updateApplicationStatus = mutation({
  args: {
    applicationId: v.id("volunteerApplications"),
    status: applicationStatusValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireOwnerIdentity(ctx);

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const opportunity = await ctx.db.get(application.opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }

    const ngo = await ctx.db.get(opportunity.ngoId);
    if (!ngo) {
      throw new Error("NGO not found.");
    }

    if (ngo.ownerTokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("You do not own this NGO.");
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      respondedAt: Date.now(),
    });

    return await ctx.db.get(args.applicationId);
  },
});

export const deleteVolunteerApplication = mutation({
  args: {
    applicationId: v.id("volunteerApplications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated. Please sign in first.");
    }

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const volunteerAccount = await ctx.db
      .query("volunteerAccounts")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!volunteerAccount || volunteerAccount._id !== application.volunteerAccountId) {
      throw new Error("You do not own this application.");
    }

    if (application.status !== "pending") {
      throw new Error("You can only delete pending applications.");
    }

    await ctx.db.delete(args.applicationId);
    return args.applicationId;
  },
});

export const upsertOpportunityFromN8n = mutation({
  args: {
    opportunityId: v.optional(v.id("opportunities")),
    ngoId: v.id("ngos"),
    title: v.string(),
    description: v.string(),
    location: opportunityLocationValidator,
    timeWindow: opportunityTimeWindowValidator,
    days: v.optional(v.array(opportunityDayOfWeekValidator)),
    taskType: v.string(),
    urgency: opportunityUrgencyValidator,
    requiredSkills: v.array(v.string()),
    skillPriorityMatrix: v.array(
      v.object({
        skill: v.string(),
        priority: v.number(),
      }),
    ),
    volunteersRequired: v.number(),
    status: v.optional(opportunityStatusValidator),
  },
  handler: async (ctx, args) => {
    const requiredSkills = normalizeStringArray(args.requiredSkills);
    const requiredSkillSet = new Set(requiredSkills.map((skill) => skill.toLowerCase()));
    const skillPriorityMatrix = args.skillPriorityMatrix
      .map((entry) => ({
        skill: entry.skill.trim(),
        priority: entry.priority,
      }))
      .filter((entry) => entry.skill.length > 0);

    if (requiredSkills.length === 0) {
      throw new Error("Select at least one required skill.");
    }

    if (skillPriorityMatrix.length === 0) {
      throw new Error("Select at least one skill priority.");
    }

    for (const entry of skillPriorityMatrix) {
      if (!requiredSkillSet.has(entry.skill.toLowerCase())) {
        throw new Error("Skill priority matrix can only include required skills.");
      }
    }

    const ngo = await ctx.db.get(args.ngoId);
    if (!ngo) {
      throw new Error("NGO not found.");
    }

    if (args.opportunityId) {
      // Update existing opportunity
      const existing = await ctx.db.get(args.opportunityId);
      if (!existing) {
        throw new Error("Opportunity not found.");
      }

      await ctx.db.patch(args.opportunityId, {
        title: args.title.trim(),
        description: args.description.trim(),
        location: args.location,
        timeWindow: args.timeWindow,
        days: args.days && args.days.length > 0 ? args.days : undefined,
        taskType: args.taskType.trim(),
        urgency: args.urgency,
        requiredSkills,
        skillPriorityMatrix,
        status: args.status || existing.status,
      });

      return await ctx.db.get(args.opportunityId);
    } else {
      // Create new opportunity
      return await ctx.db.insert("opportunities", {
        ngoId: args.ngoId,
        title: args.title.trim(),
        description: args.description.trim(),
        location: args.location,
        timeWindow: args.timeWindow,
        days: args.days && args.days.length > 0 ? args.days : undefined,
        taskType: args.taskType.trim(),
        urgency: args.urgency,
        requiredSkills,
        skillPriorityMatrix,
        volunteersRequired: args.volunteersRequired,
        status: args.status || "open",
        createdAt: Date.now(),
      });
    }
  },
});
