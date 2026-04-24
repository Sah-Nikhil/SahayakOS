import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    const existingNgo = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) =>
        q.eq("registrationId", args.registrationId),
      )
      .unique();

    if (existingNgo) {
      throw new Error("An NGO with this registrationId already exists.");
    }

    return await ctx.db.insert("ngos", args);
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

export const getNgoByPocEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const ngos = await ctx.db.query("ngos").take(100);
    const ngo = ngos.find((n) => n.pocDetails && n.pocDetails.email === args.email) ?? null;

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

export const verifyNgo = mutation({
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
    isVerified: v.optional(v.boolean()),
    reliabilityScore: v.optional(v.number()),
    volunteerTreatmentScore: v.optional(v.number()),
    averageRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { ngoId, ...updates } = args;
    const existingNgo = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) =>
        q.eq("registrationId", updates.registrationId),
      )
      .unique();

    if (existingNgo && existingNgo._id !== ngoId) {
      throw new Error("An NGO with this registrationId already exists.");
    }

    await ctx.db.patch("ngos", ngoId, updates);
    return await ctx.db.get("ngos", ngoId);
  },
});
