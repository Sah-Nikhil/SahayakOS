import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

type NgoIdentity = {
  tokenIdentifier: string;
  clerkUserId: string;
  email: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

<<<<<<< Updated upstream
=======
type NgoIdentity = {
  tokenIdentifier: string;
  clerkUserId: string;
  email: string;
};

>>>>>>> Stashed changes
const redactPocDetails = (
  ngo: {
    pocDetails?: {
      name: string;
      email: string;
      phone?: string;
    };
  } & Record<string, unknown>,
) => {
  const safeNgo = { ...ngo };
  delete safeNgo.pocDetails;
  return safeNgo;
};

const requireNgoIdentity = async (ctx: QueryCtx | MutationCtx): Promise<NgoIdentity> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  if (!identity.email) {
    throw new Error("Clerk account is missing an email address.");
  }

  return {
    tokenIdentifier: identity.tokenIdentifier,
    clerkUserId: identity.subject,
    email: normalizeEmail(identity.email),
  };
};

const getNgoForIdentity = async (ctx: QueryCtx | MutationCtx, identity: NgoIdentity) => {
  const byTokenIdentifier = await ctx.db
    .query("ngos")
    .withIndex("by_ownerTokenIdentifier", (q) =>
      q.eq("ownerTokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (byTokenIdentifier) {
    return byTokenIdentifier;
  }

  return await ctx.db
    .query("ngos")
    .withIndex("by_pocDetails_email", (q) => q.eq("pocDetails.email", identity.email))
    .unique();
};

const ensureNgoOwnership = async (
  ctx: QueryCtx | MutationCtx,
  ngo: { ownerTokenIdentifier?: string; pocDetails?: { email: string } | undefined },
) => {
  const identity = await requireNgoIdentity(ctx);
  const ownerEmail = ngo.pocDetails?.email ? normalizeEmail(ngo.pocDetails.email) : null;

  if (ngo.ownerTokenIdentifier === identity.tokenIdentifier || ownerEmail === identity.email) {
    return identity;
  }

  throw new Error("Unauthorized");
};

const upsertNgoForIdentity = async (
  ctx: MutationCtx,
  args: {
    ngoName: string;
    registrationId: string;
    hqLocation: string;
    coverageArea: string[];
    focusAreas: string[];
    pocDetails?: {
      name: string;
      email: string;
      phone?: string;
    };
  },
) => {
  const identity = await requireNgoIdentity(ctx);
  const currentNgo = await getNgoForIdentity(ctx, identity);
  const pocDetails = args.pocDetails;
  if (!pocDetails) {
    throw new Error("Point of contact details are required.");
  }

  if (normalizeEmail(pocDetails.email) !== identity.email) {
    throw new Error("The NGO contact email must match your signed-in Clerk email.");
  }

  const registrationConflict = await ctx.db
    .query("ngos")
    .withIndex("by_registrationId", (q) => q.eq("registrationId", args.registrationId))
    .unique();

  if (registrationConflict && registrationConflict._id !== currentNgo?._id) {
    throw new Error("An NGO with this registrationId already exists.");
  }

  const payload = {
    ownerTokenIdentifier: identity.tokenIdentifier,
    clerkUserId: identity.clerkUserId,
    ngoName: args.ngoName,
    registrationId: args.registrationId,
    hqLocation: args.hqLocation,
    coverageArea: args.coverageArea,
    focusAreas: args.focusAreas,
    pocDetails: {
      ...pocDetails,
      email: identity.email,
    },
  };

  if (currentNgo) {
    await ctx.db.patch(currentNgo._id, payload);
    return currentNgo._id;
  }

  return await ctx.db.insert("ngos", payload);
};

export const createNgo = mutation({
  args: {
    ngoName: v.string(),
    registrationId: v.string(),
    hqLocation: v.string(),
    coverageArea: v.array(v.string()),
    focusAreas: v.array(v.string()),
    pocDetails: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
      }),
    ),
    isVerified: v.optional(v.boolean()),
    reliabilityScore: v.optional(v.number()),
    volunteerTreatmentScore: v.optional(v.number()),
    averageRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await upsertNgoForIdentity(ctx, args);
  },
});

export const saveCurrentNgoProfile = mutation({
  args: {
    ngoName: v.string(),
    registrationId: v.string(),
    hqLocation: v.string(),
    coverageArea: v.array(v.string()),
    focusAreas: v.array(v.string()),
    pocDetails: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    return await upsertNgoForIdentity(ctx, args);
  },
});

export const getCurrentNgoProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireNgoIdentity(ctx);
    return await getNgoForIdentity(ctx, identity);
  },
});

export const getNgoById = query({
  args: {
    ngoId: v.id("ngos"),
  },
  handler: async (ctx, args) => {
    const ngo = await ctx.db.get("ngos", args.ngoId);
    if (!ngo) {
      return null;
    }

    return redactPocDetails(ngo);
  },
});

export const getNgoByIdForProfile = query({
  args: {
    ngoId: v.id("ngos"),
  },
  handler: async (ctx, args) => {
    const ngo = await ctx.db.get("ngos", args.ngoId);
    if (!ngo) {
      return null;
    }

    await ensureNgoOwnership(ctx, ngo);
    return ngo;
  },
});

export const getNgoByPocEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    if (!normalizedEmail) {
      return null;
    }

    const ngo = await ctx.db
      .query("ngos")
      .withIndex("by_pocDetails_email", (q) => q.eq("pocDetails.email", normalizedEmail))
      .unique();

    if (!ngo) return null;
    return redactPocDetails(ngo);
  },
});

export const getNgoByRegistrationId = query({
  args: {
    registrationId: v.string(),
  },
  handler: async (ctx, args) => {
    const ngo = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) => q.eq("registrationId", args.registrationId))
      .unique();

    if (!ngo) return null;
    return redactPocDetails(ngo);
  },
});

export const verifyNgo = internalMutation({
  args: {
    ngoId: v.id("ngos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("ngos", args.ngoId, { isVerified: true });
    const ngo = await ctx.db.get("ngos", args.ngoId);
    return ngo ? redactPocDetails(ngo) : null;
  },
});

export const updateNgo = mutation({
  args: {
    ngoId: v.id("ngos"),
    ngoName: v.string(),
    registrationId: v.string(),
    hqLocation: v.string(),
    coverageArea: v.array(v.string()),
    focusAreas: v.array(v.string()),
    pocDetails: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireNgoIdentity(ctx);
    const { ngoId, pocDetails, ...rest } = args;
    const existingNgo = await ctx.db.get("ngos", ngoId);
    if (!existingNgo) {
      throw new Error("NGO profile not found.");
    }

    await ensureNgoOwnership(ctx, existingNgo);

    const registrationConflict = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) =>
        q.eq("registrationId", rest.registrationId),
      )
      .unique();

    if (registrationConflict && registrationConflict._id !== ngoId) {
      throw new Error("An NGO with this registrationId already exists.");
    }

    const nextPocDetails = pocDetails
      ? {
          ...pocDetails,
          email: identity.email,
        }
      : existingNgo.pocDetails;

    if (nextPocDetails?.email && normalizeEmail(nextPocDetails.email) !== identity.email) {
      throw new Error("The NGO contact email must match your signed-in Clerk email.");
    }

    await ctx.db.patch("ngos", ngoId, {
      ownerTokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.clerkUserId,
      ...rest,
      ...(nextPocDetails
        ? {
            pocDetails: {
              ...nextPocDetails,
              email: identity.email,
            },
          }
        : {}),
    });
    return await ctx.db.get("ngos", ngoId);
  },
});
