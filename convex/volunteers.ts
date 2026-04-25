import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { availabilityValidator } from "./schema";
import type { Doc } from "./_generated/dataModel";

const deviceValidator = v.union(
  v.literal("camera"),
  v.literal("pc"),
  v.literal("smartphone"),
);

const volunteerFields = {
  name: v.string(),
  age: v.number(),
  location: v.string(),
  skills: v.array(v.string()),
  contactDetails: v.object({
    email: v.string(),
    phone: v.optional(v.string()),
  }),
  availability: availabilityValidator,
  languagesSpoken: v.array(v.string()),
  hasTransport: v.boolean(),
  devices: v.array(deviceValidator),
  isVerified: v.optional(v.boolean()),
  reliabilityScore: v.optional(v.number()),
  tasksTaken: v.optional(v.number()),
  averageRating: v.optional(v.number()),
  averageResponseTimeHours: v.optional(v.number()),
};

type VolunteerDocument = Omit<Doc<"volunteers">, "_id" | "_creationTime">;

const getCurrentVolunteerAccount = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("volunteerAccounts")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
};

const getVolunteerLinkedToAccount = async (
  ctx: QueryCtx | MutationCtx,
  account: Doc<"volunteerAccounts">,
) => {
  const byId = account.volunteerId ? await ctx.db.get(account.volunteerId) : null;
  if (byId) {
    return byId;
  }

  const byAccountId = await ctx.db
    .query("volunteers")
    .withIndex("by_volunteerAccountId", (q) => q.eq("volunteerAccountId", account._id))
    .unique();
  if (byAccountId) {
    return byAccountId;
  }

  return await ctx.db
    .query("volunteers")
    .withIndex("by_contactDetails_email", (q) => q.eq("contactDetails.email", account.email))
    .unique();
};

const saveVolunteerForCurrentAccount = async (
  ctx: MutationCtx,
  profile: VolunteerDocument,
) => {
  const account = await getCurrentVolunteerAccount(ctx);
  if (!account) {
    throw new Error("Not authenticated");
  }

  const linkedVolunteer = await getVolunteerLinkedToAccount(ctx, account);
  const normalizedProfile: VolunteerDocument = {
    ...profile,
    volunteerAccountId: account._id,
    clerkUserId: account.clerkUserId,
    contactDetails: {
      email: account.email,
      phone: profile.contactDetails.phone,
    },
  };

  if (linkedVolunteer) {
    await ctx.db.patch(linkedVolunteer._id, normalizedProfile);
    const accountUpdates: {
      name: string;
      volunteerId: Doc<"volunteers">["_id"];
      phone?: string;
    } = {
      name: normalizedProfile.name,
      volunteerId: linkedVolunteer._id,
    };

    if (normalizedProfile.contactDetails.phone) {
      accountUpdates.phone = normalizedProfile.contactDetails.phone;
    }

    await ctx.db.patch(account._id, accountUpdates);
    return linkedVolunteer._id;
  }

  const volunteerId = await ctx.db.insert("volunteers", normalizedProfile);
  const accountUpdates: {
    name: string;
    volunteerId: Doc<"volunteers">["_id"];
    phone?: string;
  } = {
    name: normalizedProfile.name,
    volunteerId,
  };

  if (normalizedProfile.contactDetails.phone) {
    accountUpdates.phone = normalizedProfile.contactDetails.phone;
  }

  await ctx.db.patch(account._id, accountUpdates);
  return volunteerId;
};

export const createVolunteer = mutation({
  args: volunteerFields,
  handler: async (ctx, args) => {
    return await saveVolunteerForCurrentAccount(ctx, args);
  },
});

export const getVolunteerById = query({
  args: {
    volunteerId: v.id("volunteers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get("volunteers", args.volunteerId);
  },
});

export const listVolunteersByLocation = query({
  args: {
    location: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("volunteers")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .take(100);
  },
});

export const getVolunteerByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("volunteers")
      .withIndex("by_contactDetails_email", (q) =>
        q.eq("contactDetails.email", args.email),
      )
      .unique();
  },
});

export const updateVolunteer = mutation({
  args: {
    volunteerId: v.id("volunteers"),
    ...volunteerFields,
  },
  handler: async (ctx, args) => {
    return await saveVolunteerForCurrentAccount(ctx, args);
  },
});

export const saveCurrentVolunteerProfile = mutation({
  args: volunteerFields,
  handler: async (ctx, args) => {
    return await saveVolunteerForCurrentAccount(ctx, args);
  },
});
