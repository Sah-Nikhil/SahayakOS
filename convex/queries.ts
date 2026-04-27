import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { opportunityUrgencyValidator } from "./schema";
import type { Doc } from "./_generated/dataModel";

const mapFilterArgs = {
  city: v.optional(v.string()),
  urgency: v.optional(opportunityUrgencyValidator),
  skill: v.optional(v.string()),
  taskType: v.optional(v.string()),
};

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const filterOpportunities = (
  opportunities: Doc<"opportunities">[],
  filters: {
    city?: string;
    urgency?: "low" | "medium" | "high";
    skill?: string;
    taskType?: string;
  },
) => {
  const normalizedCity = filters.city?.trim().toLowerCase();
  const normalizedSkill = filters.skill?.trim().toLowerCase();
  const normalizedTaskType = filters.taskType?.trim().toLowerCase();

  return opportunities.filter((opportunity) => {
    if (normalizedCity && opportunity.location.city.trim().toLowerCase() !== normalizedCity) {
      return false;
    }

    if (filters.urgency && opportunity.urgency !== filters.urgency) {
      return false;
    }

    if (normalizedTaskType && opportunity.taskType.trim().toLowerCase() !== normalizedTaskType) {
      return false;
    }

    if (
      normalizedSkill &&
      !opportunity.requiredSkills.some(
        (requiredSkill) => normalizeSkill(requiredSkill) === normalizedSkill,
      )
    ) {
      return false;
    }

    return true;
  });
};

const getNgosWithFilteredOpportunities = async (
  ctx: QueryCtx,
  filters: {
    city?: string;
    urgency?: "low" | "medium" | "high";
    skill?: string;
    taskType?: string;
  },
) => {
  const normalizedCity = filters.city?.trim().toLowerCase();
  
  let ngos;
  if (filters.city) {
    // If we have a city filter, use the index to find NGOs in that city
    ngos = await ctx.db
      .query("ngos")
      .withIndex("by_city", (q) => q.eq("hqLocation.city", filters.city!))
      .take(100);
  } else {
    ngos = await ctx.db.query("ngos").withIndex("by_name").take(100);
  }

  const includeEmptyNgos = !filters.city && !filters.urgency && !filters.skill && !filters.taskType;

  const ngoRows = await Promise.all(
    ngos.map(async (ngo) => {
      const opportunities = await ctx.db
        .query("opportunities")
        .withIndex("by_ngo", (q) => q.eq("ngoId", ngo._id))
        .take(200);

      const filteredOpportunities = filterOpportunities(opportunities, filters);
      return {
        ...ngo,
        opportunities: filteredOpportunities,
      };
    }),
  );

  return includeEmptyNgos
    ? ngoRows
    : ngoRows.filter((ngo) => ngo.opportunities.length > 0);
};

export const getNGOsWithOpportunities = query({
  args: mapFilterArgs,
  handler: async (ctx, args) => {
    return await getNgosWithFilteredOpportunities(ctx, args);
  },
});

export const getNgoById = query({
  args: {
    ngoId: v.id("ngos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.ngoId);
  },
});

export const getNgoByOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("ngos")
      .withIndex("by_ownerTokenIdentifier", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

export const getOpportunitiesByNgoId = query({
  args: {
    ngoId: v.id("ngos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_ngo", (q) => q.eq("ngoId", args.ngoId))
      .take(200);
  },
});

export const getOpportunitiesByCity = query({
  args: {
    city: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("opportunities")
      .withIndex("by_city", (q) => q.eq("location.city", args.city))
      .take(200);
  },
});

export const getOpportunitiesBySkills = query({
  args: {
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const allStatuses: Array<"open" | "filled" | "closed"> = ["open", "filled", "closed"];
    const opportunitiesByStatus = await Promise.all(
      allStatuses.map((status) =>
        ctx.db
          .query("opportunities")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(200),
      ),
    );

    const normalizedSkills = new Set(
      args.skills.map((skill) => normalizeSkill(skill)).filter((skill) => skill.length > 0),
    );
    const allOpportunities = opportunitiesByStatus.flat();

    return allOpportunities.filter((opportunity) =>
      opportunity.requiredSkills.some((requiredSkill) =>
        normalizedSkills.has(normalizeSkill(requiredSkill)),
      ),
    );
  },
});

export const getMapData = query({
  args: mapFilterArgs,
  handler: async (ctx, args) => {
    const ngosWithOpportunities = await getNgosWithFilteredOpportunities(ctx, args);

    return ngosWithOpportunities.map((ngo) => ({
      ngoId: ngo._id,
      ngoName: ngo.name,
      lat: ngo.hqLocation.lat,
      lng: ngo.hqLocation.lng,
      opportunitiesCount: ngo.opportunities.length,
    }));
  },
});
