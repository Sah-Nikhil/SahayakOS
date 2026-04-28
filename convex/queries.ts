import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { opportunityStatusValidator, opportunityUrgencyValidator } from "./schema";
import type { Doc } from "./_generated/dataModel";

const mapFilterArgs = {
  city: v.optional(v.string()),
  urgency: v.optional(opportunityUrgencyValidator),
  skill: v.optional(v.string()),
  taskType: v.optional(v.string()),
  statuses: v.optional(v.array(opportunityStatusValidator)),
};

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const isVolunteerCurrentlyAvailable = (volunteer: Doc<"volunteers">) => {
  if (volunteer.availability.mode === "slots") {
    return volunteer.availability.days.some((day) => day.enabled && day.slots.length > 0);
  }

  return volunteer.availability.days.some((day) => day.enabled && day.hours > 0);
};

const filterOpportunities = (
  opportunities: Doc<"opportunities">[],
  filters: {
    city?: string;
    urgency?: "low" | "medium" | "high";
    skill?: string;
    taskType?: string;
    statuses?: Array<"open" | "filled" | "closed">;
  },
) => {
  const normalizedCity = filters.city?.trim().toLowerCase();
  const normalizedSkill = filters.skill?.trim().toLowerCase();
  const normalizedTaskType = filters.taskType?.trim().toLowerCase();
  const allowedStatuses = filters.statuses ? new Set(filters.statuses) : null;

  return opportunities.filter((opportunity) => {
    if (allowedStatuses && !allowedStatuses.has(opportunity.status)) {
      return false;
    }

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

const getNgoRowsFromOpportunities = async (
  ctx: QueryCtx,
  opportunities: Doc<"opportunities">[],
) => {
  const ngoIds = [...new Set(opportunities.map((opportunity) => opportunity.ngoId))];
  const ngos = await Promise.all(ngoIds.map((ngoId) => ctx.db.get(ngoId)));
  const ngoOpportunities = new Map<Doc<"ngos">["_id"], Doc<"opportunities">[]>();

  for (const opportunity of opportunities) {
    const existing = ngoOpportunities.get(opportunity.ngoId);
    if (existing) {
      existing.push(opportunity);
    } else {
      ngoOpportunities.set(opportunity.ngoId, [opportunity]);
    }
  }

  return ngos.flatMap((ngo) => {
    if (!ngo) {
      return [];
    }

    return [
      {
        ...ngo,
        opportunities: ngoOpportunities.get(ngo._id) ?? [],
      },
    ];
  });
};

const getNgosWithFilteredOpportunities = async (
  ctx: QueryCtx,
  filters: {
    city?: string;
    urgency?: "low" | "medium" | "high";
    skill?: string;
    taskType?: string;
    statuses?: Array<"open" | "filled" | "closed">;
  },
) => {
  let ngos;
  if (filters.city) {
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_city", (q) => q.eq("location.city", filters.city!.trim()))
      .take(200);
    const filteredOpportunities = filterOpportunities(opportunities, filters);

    return await getNgoRowsFromOpportunities(ctx, filteredOpportunities);
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

export const getOpportunityById = query({
  args: {
    opportunityId: v.id("opportunities"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.opportunityId);
  },
});

export const getAvailableVolunteersForMatching = query({
  args: {},
  handler: async (ctx) => {
    const volunteers = await ctx.db.query("volunteers").take(300);
    return volunteers.filter((volunteer) => isVolunteerCurrentlyAvailable(volunteer));
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
