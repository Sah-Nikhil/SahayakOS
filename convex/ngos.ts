import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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

const assertPocEmailAvailable = async (
  ctx: MutationCtx,
  email: string,
  ngoId?: Id<"ngos">,
) => {
  const existingNgo = await ctx.db
    .query("ngos")
    .withIndex("by_pocDetails_email", (q) => q.eq("pocDetails.email", email))
    .unique();

  if (existingNgo && existingNgo._id !== ngoId) {
    throw new Error("An NGO with this contact email already exists.");
  }
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

    const pocEmail = args.pocDetails ? normalizeEmail(args.pocDetails.email) : null;
    if (args.pocDetails && !pocEmail) {
      throw new Error("Point of contact email is required.");
    }
    if (pocEmail) {
      await assertPocEmailAvailable(ctx, pocEmail);
    }

    return await ctx.db.insert("ngos", {
      ...args,
      ...(args.pocDetails
        ? {
            pocDetails: {
              ...args.pocDetails,
              email: pocEmail ?? args.pocDetails.email,
            },
          }
        : {}),
    });
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
    return await ctx.db.get("ngos", args.ngoId);
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
    const { ngoId, pocDetails, ...rest } = args;
    const existingNgo = await ctx.db
      .query("ngos")
      .withIndex("by_registrationId", (q) =>
        q.eq("registrationId", rest.registrationId),
      )
      .unique();

    if (existingNgo && existingNgo._id !== ngoId) {
      throw new Error("An NGO with this registrationId already exists.");
    }

    const pocEmail = pocDetails ? normalizeEmail(pocDetails.email) : null;
    if (pocDetails && !pocEmail) {
      throw new Error("Point of contact email is required.");
    }
    if (pocEmail) {
      await assertPocEmailAvailable(ctx, pocEmail, ngoId);
    }

    await ctx.db.patch("ngos", ngoId, {
      ...rest,
      ...(pocDetails
        ? {
            pocDetails: {
              ...pocDetails,
              email: pocEmail ?? pocDetails.email,
            },
          }
        : {}),
    });
    return await ctx.db.get("ngos", ngoId);
  },
});
