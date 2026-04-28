import { mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  opportunityDayOfWeekValidator,
  ngoHqLocationValidator,
  opportunityLocationValidator,
  opportunityStatusValidator,
  opportunityTimeWindowValidator,
  opportunityUrgencyValidator,
} from "./schema";

const normalizeStringArray = (values: string[]) =>
  values.map((value) => value.trim()).filter((value) => value.length > 0);

const requireOwnerIdentity = async (ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated. Please sign in first.");
  }
  return identity;
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

    if (existingNgo.ownerTokenIdentifier && existingNgo.ownerTokenIdentifier !== identity.tokenIdentifier) {
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
    status: opportunityStatusValidator,
  },
  handler: async (ctx, args) => {
    const ngo = await ctx.db.get(args.ngoId);
    if (!ngo) {
      throw new Error("NGO not found.");
    }

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

    return await ctx.db.insert("opportunities", {
      ...args,
      title: args.title.trim(),
      description: args.description.trim(),
      taskType: args.taskType.trim(),
      days: args.days && args.days.length > 0 ? args.days : undefined,
      requiredSkills,
      skillPriorityMatrix,
      createdAt: Date.now(),
    });
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

    await ctx.db.delete(args.opportunityId);
    return args.opportunityId;
  },
});
