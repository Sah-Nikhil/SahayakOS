import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const urgencyValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const statusValidator = v.union(
  v.literal("open"),
  v.literal("filled"),
  v.literal("closed"),
);

const urgencyRank: Record<"low" | "medium" | "high" | "critical", number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const createJobListing = mutation({
  args: {
    ngoId: v.id("ngos"),
    title: v.string(),
    location: v.string(),
    startDateTime: v.number(),
    durationHours: v.number(),
    taskType: v.string(),
    urgency: urgencyValidator,
    requiredSkills: v.array(v.string()),
    skillPriorityMatrix: v.array(
      v.object({
        skill: v.string(),
        priority: v.number(),
      }),
    ),
    volunteersRequired: v.number(),
    volunteersAllocated: v.optional(v.number()),
    status: statusValidator,
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ngo = await ctx.db.get("ngos", args.ngoId);
    if (!ngo) {
      throw new Error("NGO not found.");
    }

    return await ctx.db.insert("jobListings", {
      ...args,
      volunteersAllocated: args.volunteersAllocated ?? 0,
    });
  },
});

export const getListingsByNgo = query({
  args: {
    ngoId: v.id("ngos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobListings")
      .withIndex("by_ngoId", (q) => q.eq("ngoId", args.ngoId))
      .take(100);
  },
});

export const getOpenListings = query({
  args: {},
  handler: async (ctx) => {
    const openListings = await ctx.db
      .query("jobListings")
      .withIndex("by_status_and_urgency", (q) => q.eq("status", "open"))
      .take(100);

    return openListings.sort(
      (a, b) => urgencyRank[b.urgency] - urgencyRank[a.urgency],
    );
  },
});

export const updateListingStatus = mutation({
  args: {
    listingId: v.id("jobListings"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("jobListings", args.listingId, { status: args.status });
    return await ctx.db.get("jobListings", args.listingId);
  },
});
