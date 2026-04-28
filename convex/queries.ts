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

export type PublicNgoWithOpportunities = Pick<
  Doc<"ngos">,
  "_id" | "name" | "description" | "hqLocation" | "focusAreas"
> & {
  opportunities: Doc<"opportunities">[];
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
): Promise<PublicNgoWithOpportunities[]> => {
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
        _id: ngo._id,
        name: ngo.name,
        description: ngo.description,
        hqLocation: ngo.hqLocation,
        focusAreas: ngo.focusAreas,
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
): Promise<PublicNgoWithOpportunities[]> => {
  let ngos: Doc<"ngos">[];
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
        _id: ngo._id,
        name: ngo.name,
        description: ngo.description,
        hqLocation: ngo.hqLocation,
        focusAreas: ngo.focusAreas,
        opportunities: filteredOpportunities,
      };
    }),
  );

  return includeEmptyNgos
    ? ngoRows
    : ngoRows.filter((ngo) => ngo.opportunities.length > 0);
};

const getCurrentVolunteerContext = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const account = await ctx.db
    .query("volunteerAccounts")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!account) {
    return null;
  }

  const volunteer =
    (account.volunteerId ? await ctx.db.get(account.volunteerId) : null) ??
    (await ctx.db
      .query("volunteers")
      .withIndex("by_volunteerAccountId", (q) => q.eq("volunteerAccountId", account._id))
      .unique());

  if (!volunteer) {
    return null;
  }

  return { account, volunteer };
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

export const getMyOpportunityApplications = query({
  args: {},
  handler: async (ctx) => {
    const volunteerContext = await getCurrentVolunteerContext(ctx);
    if (!volunteerContext) {
      return [];
    }

    const applications = await ctx.db
      .query("opportunityApplications")
      .withIndex("by_volunteer", (q) => q.eq("volunteerId", volunteerContext.volunteer._id))
      .take(500);

    return applications
      .sort((a, b) => b.appliedAt - a.appliedAt)
      .map((application) => ({
        _id: application._id,
        opportunityId: application.opportunityId,
        status: application.status,
        appliedAt: application.appliedAt,
        reviewedAt: application.reviewedAt,
      }));
  },
});

export const getOpportunityApplicationsForOwnedNgo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const ngo = await ctx.db
      .query("ngos")
      .withIndex("by_ownerTokenIdentifier", (q) =>
        q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!ngo) {
      return [];
    }

    const applications = await ctx.db
      .query("opportunityApplications")
      .withIndex("by_ngo", (q) => q.eq("ngoId", ngo._id))
      .take(500);

    const hydratedApplications = await Promise.all(
      applications.map(async (application) => {
        const volunteer = await ctx.db.get(application.volunteerId);
        const opportunity = await ctx.db.get(application.opportunityId);

        if (!volunteer || !opportunity) {
          return null;
        }

        return {
          _id: application._id,
          opportunityId: application.opportunityId,
          status: application.status,
          appliedAt: application.appliedAt,
          reviewedAt: application.reviewedAt,
          opportunity: {
            _id: opportunity._id,
            title: opportunity.title,
            status: opportunity.status,
            urgency: opportunity.urgency,
            taskType: opportunity.taskType,
            location: opportunity.location,
          },
          volunteer: {
            _id: volunteer._id,
            name: volunteer.name,
            location: volunteer.location,
            skills: volunteer.skills,
            contactDetails: volunteer.contactDetails,
          },
        };
      }),
    );

    const statusPriority: Record<Doc<"opportunityApplications">["status"], number> = {
      pending: 0,
      approved: 1,
      denied: 2,
    };

    return hydratedApplications
      .flatMap((application) => (application ? [application] : []))
      .sort((a, b) => {
        const byStatus = statusPriority[a.status] - statusPriority[b.status];
        if (byStatus !== 0) {
          return byStatus;
        }
        return b.appliedAt - a.appliedAt;
      });
  },
});
